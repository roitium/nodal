const PBKDF2_PREFIX = "aesgcm";
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_SALT_LENGTH = 16;
const GCM_IV_LENGTH = 12;

function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes)
    .map((b) => String.fromCodePoint(b))
    .join("");
  return btoa(binString);
}

function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return new Uint8Array(binString.length).map((_, i) => binString.codePointAt(i)!);
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a value using AES-GCM with PBKDF2 key derivation.
 * Returns base64-encoded string containing salt + IV + ciphertext.
 */
export async function encrypt(value: string, key: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH));
  const aesKey = await deriveAesKey(key, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(value),
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToBase64(combined)}`;
}

/**
 * Decrypt a base64-encoded string that was encrypted with encrypt().
 */
export async function decrypt(encrypted: string, key: string): Promise<string> {
  const parts = encrypted.split("$");
  if (parts.length !== 3 || parts[0] !== PBKDF2_PREFIX) {
    throw new Error("Invalid encrypted format");
  }

  const iterations = Number.parseInt(parts[1] ?? "", 10);
  const combined = base64ToBytes(parts[2] ?? "");

  const salt = combined.slice(0, PBKDF2_SALT_LENGTH);
  const iv = combined.slice(PBKDF2_SALT_LENGTH, PBKDF2_SALT_LENGTH + GCM_IV_LENGTH);
  const ciphertext = combined.slice(PBKDF2_SALT_LENGTH + GCM_IV_LENGTH);

  const aesKey = await deriveAesKey(key, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Mask a string value, showing first 4 and last 4 characters if length > 12.
 * Otherwise, return all asterisks.
 */
export function mask(value: string): string {
  if (value.length <= 12) {
    return "****";
  }
  return value.slice(0, 4) + "****" + value.slice(-4);
}

/**
 * Check if the SETTINGS_ENCRYPTION_KEY environment variable is set.
 */
export function isEncryptionKeySet(env: { SETTINGS_ENCRYPTION_KEY?: string }): boolean {
  return Boolean(env.SETTINGS_ENCRYPTION_KEY);
}
