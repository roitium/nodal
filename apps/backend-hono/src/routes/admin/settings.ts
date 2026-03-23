import { arktypeValidator } from "@hono/arktype-validator";
import { eq, inArray } from "drizzle-orm";
import { type } from "arktype";
import { Hono } from "hono";
import { settings } from "@/db/schema";
import { adminMiddleware } from "@/middleware/admin";
import { encrypt, isEncryptionKeySet, mask } from "@/utils/encryption";
import { AdminCode, GeneralCode } from "@/utils/code";
import { fail, success } from "@/utils/response";
import type { Env } from "@/types/env";

const updateSettingsBody = type({
  settings: type([
    {
      key: "string",
      value: "string",
    },
    "[]",
  ]),
});

// Immutable settings that cannot be updated
const IMMUTABLE_SETTINGS = new Set(["DATABASE_URL", "JWT_SECRET"]);

// Valid storage providers
const VALID_STORAGE_PROVIDERS = ["supabase", "s3", "r2"];

/**
 * Validate a domain format (can be empty)
 */
function isValidDomain(domain: string): boolean {
  if (domain === "") return true;
  // Allow domain with optional port
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(:\d+)?$/;
  return domainRegex.test(domain);
}

/**
 * Validate a URL format (can be empty for optional URLs)
 */
function isValidUrl(url: string): boolean {
  if (url === "") return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a setting value based on its key
 */
function validateSettingValue(key: string, value: string): { valid: boolean; message?: string } {
  switch (key) {
    case "ROOT_DOMAIN":
      if (!isValidDomain(value)) {
        return { valid: false, message: `Invalid domain format for ${key}` };
      }
      break;

    case "STORAGE_PROVIDER":
      if (!VALID_STORAGE_PROVIDERS.includes(value)) {
        return { valid: false, message: `${key} must be one of: ${VALID_STORAGE_PROVIDERS.join(", ")}` };
      }
      break;

    case "SUPABASE_URL":
    case "S3_ENDPOINT":
    case "S3_PUBLIC_URL":
      if (!isValidUrl(value)) {
        return { valid: false, message: `Invalid URL format for ${key}` };
      }
      break;

    case "STORAGE_BUCKET":
    case "S3_REGION":
      if (value === "") {
        return { valid: false, message: `${key} cannot be empty` };
      }
      break;

    // Secret fields - just need to be non-empty
    case "SUPABASE_SERVICE_ROLE_KEY":
    case "S3_ACCESS_KEY_ID":
    case "S3_SECRET_ACCESS_KEY":
      if (value === "") {
        return { valid: false, message: `${key} cannot be empty` };
      }
      break;
  }

  return { valid: true };
}

export const adminSettingsRoutes = new Hono<{ Bindings: Env }>()
  .use(adminMiddleware)
  .get("/", async (c) => {
    const db = c.get("db");
    const traceId = c.get("traceId");

    const allSettings = await db.query.settings.findMany({
      orderBy: (settings, { asc }) => [asc(settings.key)],
    });

    const maskedSettings = allSettings.map((s) => ({
      key: s.key,
      value: s.isSecret ? mask(s.value) : s.value,
      description: s.description,
      is_secret: s.isSecret,
      updated_at: s.updatedAt,
      updated_by: s.updatedBy,
    }));

    return c.json(success({ data: maskedSettings, traceId }), 200);
  })
  .patch("/", arktypeValidator("json", updateSettingsBody), async (c) => {
    const db = c.get("db");
    const traceId = c.get("traceId");
    const user = c.get("user");
    const body = c.req.valid("json");

    if (!user) {
      return c.json(
        fail({
          message: "请先登录",
          code: GeneralCode.NeedLogin,
          traceId,
        }),
        401,
      );
    }

    // Check if encryption key is set (needed for secret settings)
    const encryptionKey = c.env.SETTINGS_ENCRYPTION_KEY;
    const encryptionKeySet = Boolean(encryptionKey);

    // Get all existing settings to validate keys and check secrets
    const keysToUpdate = body.settings.map((s) => s.key);

    // Check for immutable settings
    for (const key of keysToUpdate) {
      if (IMMUTABLE_SETTINGS.has(key)) {
        return c.json(
          fail({
            message: `Cannot update immutable setting: ${key}`,
            code: AdminCode.SettingNotFound,
            traceId,
          }),
          404,
        );
      }
    }

    const existingSettings = await db.query.settings.findMany({
      where: inArray(settings.key, keysToUpdate),
    });

    const existingKeys = new Set(existingSettings.map((s) => s.key));

    // Validate all keys exist
    for (const key of keysToUpdate) {
      if (!existingKeys.has(key)) {
        return c.json(
          fail({
            message: `Setting not found: ${key}`,
            code: AdminCode.SettingNotFound,
            traceId,
          }),
          404,
        );
      }
    }

    // Create a map for quick lookup
    const settingsMap = new Map(existingSettings.map((s) => [s.key, s]));

    // Validate all values
    for (const { key, value } of body.settings) {
      const validation = validateSettingValue(key, value);
      if (!validation.valid) {
        return c.json(
          fail({
            message: validation.message!,
            code: GeneralCode.InternalError,
            traceId,
          }),
          400,
        );
      }
    }

    // Check if any secret settings are being updated without encryption key
    const hasSecretUpdate = body.settings.some(
      ({ key }) => settingsMap.get(key)?.isSecret,
    );
    if (hasSecretUpdate && !encryptionKeySet) {
      return c.json(
        fail({
          message: "SETTINGS_ENCRYPTION_KEY not configured",
          code: AdminCode.EncryptionKeyMissing,
          traceId,
        }),
        500,
      );
    }

    // Update each setting
    for (const { key, value } of body.settings) {
      const setting = settingsMap.get(key)!;
      let finalValue = value;
      let isEncrypted = setting.isEncrypted;

      // Encrypt if secret
      if (setting.isSecret && encryptionKey) {
        finalValue = await encrypt(value, encryptionKey);
        isEncrypted = true;
      }

      await db
        .update(settings)
        .set({
          value: finalValue,
          isEncrypted,
          updatedBy: user.id,
        })
        .where(eq(settings.key, key));
    }

    // Fetch updated settings
    const updatedSettings = await db.query.settings.findMany({
      where: inArray(settings.key, keysToUpdate),
      orderBy: (settings, { asc }) => [asc(settings.key)],
    });

    const maskedSettings = updatedSettings.map((s) => ({
      key: s.key,
      value: s.isSecret ? mask(s.value) : s.value,
      description: s.description,
      is_secret: s.isSecret,
      updated_at: s.updatedAt,
      updated_by: s.updatedBy,
    }));

    return c.json(success({ data: maskedSettings, traceId }), 200);
  });
