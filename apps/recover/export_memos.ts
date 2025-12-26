import { Database } from "bun:sqlite";
import { write } from "bun";

const DB_PATH = "apps/recover/memos/memos_prod.db";
const OUTPUT_FILE = "memos_export.json";

try {
  const db = new Database(DB_PATH);

  // Query all memos
  const memosQuery = db.query(`
    SELECT id, created_ts, content, row_status, visibility, pinned
    FROM memo
    ORDER BY created_ts DESC
  `);
  const memos = memosQuery.all() as any[];

  // Query all resources
  const resourcesQuery = db.query(`
    SELECT memo_id, filename, type as mimetype, size, reference as path
    FROM resource
    WHERE memo_id IS NOT NULL
  `);
  const resources = resourcesQuery.all() as any[];

  // Group resources by memo_id for efficient lookup
  const resourcesByMemoId = resources.reduce((acc, resource) => {
    if (!acc[resource.memo_id]) {
      acc[resource.memo_id] = [];
    }
    acc[resource.memo_id].push({
      path: resource.path,
      filename: resource.filename,
      size: resource.size,
      mimetype: resource.mimetype,
    });
    return acc;
  }, {} as Record<number, any[]>);

  // Construct the final JSON structure
  const result = memos.map((memo) => ({
    created_ts: memo.created_ts,
    content: memo.content,
    row_status: memo.row_status, // Including status just in case
    visibility: memo.visibility,
    pinned: Boolean(memo.pinned), // Convert 0/1 to boolean
    resources: resourcesByMemoId[memo.id] || [],
  }));

  // Write to file
  await write(OUTPUT_FILE, JSON.stringify(result, null, 2));

  console.log(`Successfully exported ${result.length} memos to ${OUTPUT_FILE}`);
} catch (error) {
  console.error("Error exporting memos:", error);
}
