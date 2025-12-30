import { join } from "path";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const AUTH_COOKIE = process.env.AUTH_COOKIE;
const MEMOS_EXPORT_FILE = "memos_export.json";
const MAPPING_FILE = "resource_mapping.json";
const IMPORT_LOG_FILE = "memos_imported_log.json";

if (!AUTH_COOKIE) {
  console.error("Please provide AUTH_COOKIE environment variable.");
  process.exit(1);
}

// Type definitions
interface ResourceExport {
  path: string;
  filename: string;
  size: number;
  mimetype: string;
}

interface MemoExport {
  created_ts: number; // seconds
  content: string;
  row_status: string;
  visibility: string; // "PUBLIC", "PRIVATE", "PROTECTED"
  pinned: boolean;
  resources: ResourceExport[];
}

interface ResourceMapping {
  [path: string]: {
    resourceId: string;
    resourcePath: string;
    externalLink?: string;
    filename: string;
  };
}

interface ImportLog {
  [created_ts: number]: string; // timestamp -> new memo ID
}

async function main() {
  console.log("Starting memos import...");

  // 1. Load data
  const memosFile = Bun.file(MEMOS_EXPORT_FILE);
  if (!(await memosFile.exists())) {
    console.error(`File not found: ${MEMOS_EXPORT_FILE}`);
    process.exit(1);
  }
  const memos: MemoExport[] = await memosFile.json();

  let resourceMapping: ResourceMapping = {};
  const mappingFile = Bun.file(MAPPING_FILE);
  if (await mappingFile.exists()) {
    resourceMapping = await mappingFile.json();
  } else {
    console.warn(
      "No resource mapping file found. Memos with resources might fail to link."
    );
  }

  let importLog: ImportLog = {};
  const logFile = Bun.file(IMPORT_LOG_FILE);
  if (await logFile.exists()) {
    try {
      importLog = await logFile.json();
      console.log(
        `Loaded import log with ${Object.keys(importLog).length} entries.`
      );
    } catch (e) {
      console.error("Failed to parse import log, starting fresh.");
    }
  }

  // 2. Sort memos by creation time (oldest first) so they are created in order?
  // Actually, since we force createdAt, order might not strictly matter for display,
  // but it's good practice to import chronologically if possible, or reverse.
  // The export was `ORDER BY created_ts DESC` (newest first).
  // Let's reverse it to import oldest first, just in case.
  memos.reverse();

  let processed = 0;
  const total = memos.length;

  for (const memo of memos) {
    processed++;
    const progressPrefix = `[${processed}/${total}]`;

    // Use created_ts as a unique key for deduplication in log
    if (importLog[memo.created_ts]) {
      console.log(
        `${progressPrefix}: Already imported (ID: ${
          importLog[memo.created_ts]
        }). Skipping.`
      );
      continue;
    }

    // Skip archived memos if you want, or map them?
    // The export includes row_status. The API doesn't seem to have a direct "create as archived"
    // but we can maybe archive it later or ignore.
    // The user instruction didn't specify handling archived, so I'll assume standard import.
    // If row_status is ARCHIVED, maybe we should skip or import then delete?
    // For now, I'll import everything as NORMAL.

    // Map Visibility
    let visibility: "public" | "private" = "private";
    if (memo.visibility === "PUBLIC") {
      visibility = "public";
    }
    // "PROTECTED" -> "private" (or whatever maps best, user said public/private)

    // Map Resources
    const resourceIds: string[] = [];
    for (const res of memo.resources) {
      const mapping = resourceMapping[res.path];
      if (mapping) {
        resourceIds.push(mapping.resourceId);
      } else {
        console.warn(
          `${progressPrefix}: Resource not found in mapping: ${res.path}`
        );
      }
    }

    try {
      const payload = {
        content: memo.content,
        visibility: visibility,
        isPinned: memo.pinned,
        resources: resourceIds.length > 0 ? resourceIds : undefined,
        createdAt: memo.created_ts * 1000, // seconds -> ms
      };

      console.log(
        `${progressPrefix}: Importing memo from ${new Date(
          payload.createdAt
        ).toISOString()}...`
      );

      const res = await fetch(`${API_BASE_URL}/api/v1/memos/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AUTH_COOKIE}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Import failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json();

      // Log success
      importLog[memo.created_ts] = data.id;

      // Save log periodically
      await Bun.write(IMPORT_LOG_FILE, JSON.stringify(importLog, null, 2));
    } catch (error) {
      console.error(`${progressPrefix}: Error -`, error);
      // Decide whether to stop or continue.
      // For a batch import, stopping is usually safer to debug.
      console.log("Stopping script.");
      process.exit(1);
    }
  }

  console.log("Memos import completed.");
}

main();
