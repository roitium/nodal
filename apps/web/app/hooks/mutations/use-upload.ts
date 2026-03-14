import { useState } from "react";
import { client } from "~/lib/rpc";
import { toast } from "sonner";
import axios from "axios";

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "";
      // 1. Get signed URL
      const uploadUrlResponse = await client.api.v1.resources[
        "upload-url"
      ].$get({
        query: { fileType: file.type, ext },
      });
      const urlData = await uploadUrlResponse.json();
      if (!uploadUrlResponse.ok || urlData.error) {
        throw new Error(urlData.error ?? "Failed to get upload URL");
      }
      if (!urlData.data) {
        throw new Error("Failed to get upload URL");
      }
      const { uploadUrl, path, signature } = urlData.data;

      // 2. Upload directly to storage (e.g. Supabase)
      await axios.put(uploadUrl, file, {
        headers: {
          "Content-Type": file.type,
        },
      });

      // 3. Record upload in backend
      const recordResponse = await client.api.v1.resources[
        "record-upload"
      ].$post({
        json: {
          path,
          fileType: file.type,
          fileSize: file.size,
          filename: file.name,
          signature: signature,
        },
      });
      const resourceData = await recordResponse.json();
      if (!recordResponse.ok || resourceData.error) {
        throw new Error(resourceData.error ?? "Failed to record upload");
      }
      if (!resourceData.data) {
        throw new Error("Failed to record upload");
      }

      return resourceData.data;
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload file");
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}
