import { join, dirname } from "path";
import { existsSync } from "fs";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const AUTH_COOKIE = process.env.AUTH_COOKIE;
const MEMOS_EXPORT_FILE = "memos_export.json";
const MAPPING_FILE = "resource_mapping.json";
// Base directory for memos data
const MEMOS_DATA_DIR = "./memos";

if (!AUTH_COOKIE) {
  console.error("Please provide AUTH_COOKIE environment variable.");
  process.exit(1);
}

// Type definitions
interface Resource {
  path: string; // e.g., "assets/1727963062_66eff3964faf6.jpg"
  filename: string; // e.g., "66eff3964faf6.jpg"
  size: number;
  mimetype: string;
}

interface Memo {
  resources: Resource[];
}

interface Mapping {
  [path: string]: {
    resourceId: string;
    resourcePath: string; // The path in the storage bucket
    externalLink?: string;
    filename: string;
  };
}

async function main() {
  console.log("Starting resource upload...");

  // 1. Load memos export
  const memosFile = Bun.file(MEMOS_EXPORT_FILE);
  if (!(await memosFile.exists())) {
    console.error(`File not found: ${MEMOS_EXPORT_FILE}`);
    process.exit(1);
  }
  const memos: Memo[] = await memosFile.json();

  // 2. Flatten resources and dedup by the "path" field (which is unique)
  const uniqueResources = new Map<string, Resource>();
  let totalResourcesCount = 0;

  for (const memo of memos) {
    for (const res of memo.resources) {
      totalResourcesCount++;
      if (!uniqueResources.has(res.path)) {
        uniqueResources.set(res.path, res);
      }
    }
  }

  console.log(`Found ${totalResourcesCount} total resources references.`);
  console.log(`Unique files to process: ${uniqueResources.size}`);

  // 3. Load existing mapping
  let mapping: Mapping = {};
  const mappingFile = Bun.file(MAPPING_FILE);
  if (await mappingFile.exists()) {
    try {
      mapping = await mappingFile.json();
      console.log(
        `Loaded existing mapping with ${Object.keys(mapping).length} entries.`
      );
    } catch (e) {
      console.error("Failed to parse existing mapping file, starting fresh.");
    }
  }

  // 4. Process resources
  let processed = 0;
  const resourcesArray = Array.from(uniqueResources.values());
  const total = resourcesArray.length;

  for (const resource of resourcesArray) {
    processed++;
    // Using resource.path as it's the unique identifier
    const progressPrefix = `[${processed}/${total}] ${resource.path}`;

    if (mapping[resource.path]) {
      console.log(`${progressPrefix}: Already uploaded. Skipping.`);
      continue;
    }

    // Use the path provided in the JSON, joined with the memos data directory
    const localFilePath = join(MEMOS_DATA_DIR, resource.path);
    const file = Bun.file(localFilePath);

    if (!(await file.exists())) {
      console.error(
        `${progressPrefix}: Local file not found at ${localFilePath}. Skipping.`
      );
      continue;
    }

    try {
      // Step A: Get Upload URL
      const ext = resource.path.split(".").pop() || "";
      const uploadUrlParams = new URLSearchParams({
        fileType: resource.mimetype,
        ext: ext,
      });

      console.log(`${progressPrefix}: Requesting upload URL...`);
      const uploadUrlRes = await fetch(
        `${API_BASE_URL}/api/v1/resources/upload-url?${uploadUrlParams}`,
        {
          headers: {
            Authorization: `Bearer ${AUTH_COOKIE}`,
          },
        }
      );

      if (!uploadUrlRes.ok) {
        throw new Error(
          `Failed to get upload URL: ${
            uploadUrlRes.status
          } ${await uploadUrlRes.text()}`
        );
      }

      const {
        uploadUrl,
        path: storagePath,
        headers,
      } = await uploadUrlRes.json();

      // Step B: Upload File
      console.log(
        `${progressPrefix}: Uploading file (${(resource.size / 1024).toFixed(
          2
        )} KB)...`
      );
      const fileBuffer = await file.arrayBuffer();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: headers || {
          "Content-Type": resource.mimetype,
        },
        body: fileBuffer,
      });

      if (!uploadRes.ok) {
        throw new Error(
          `Upload failed: ${uploadRes.status} ${await uploadRes.text()}`
        );
      }

      // Step C: Record Upload
      console.log(`${progressPrefix}: Recording upload...`);
      const recordRes = await fetch(
        `${API_BASE_URL}/api/v1/resources/record-upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_COOKIE}`,
          },
          body: JSON.stringify({
            path: storagePath,
            fileType: resource.mimetype,
            fileSize: resource.size,
            filename: resource.filename, // Using the original filename for the DB record
          }),
        }
      );

      if (!recordRes.ok) {
        throw new Error(
          `Failed to record upload: ${
            recordRes.status
          } ${await recordRes.text()}`
        );
      }

      const recordData = await recordRes.json();

      // Step D: Update Mapping
      // Mapping from the original JSON path to the new API data
      mapping[resource.path] = {
        resourceId: recordData.id,
        resourcePath: storagePath,
        externalLink: recordData.externalLink,
        filename: resource.filename,
      };

      // Save mapping immediately to be interruptible
      await Bun.write(MAPPING_FILE, JSON.stringify(mapping, null, 2));
      console.log(`${progressPrefix}: Done.`);
    } catch (error) {
      console.error(`${progressPrefix}: Error -`, error);
      console.log(
        "Stopping to prevent further errors. Fix the issue and restart script."
      );
      process.exit(1);
    }
  }

  console.log("All resources processed successfully.");
}

main();
