import { useState } from "react";
import { resourcesAPI } from "~/lib/api";
import { toast } from "sonner";
import axios from "axios";

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "";
      // 1. Get signed URL
      const { data: urlData } = await resourcesAPI.getUploadUrl(file.type, ext);
      const { uploadUrl, path, signature } = urlData.data;

      // 2. Upload directly to storage (e.g. Supabase)
      await axios.put(uploadUrl, file, {
        headers: {
          "Content-Type": file.type,
        },
      });

      // 3. Record upload in backend
      const { data: resourceData } = await resourcesAPI.recordUpload({
        path,
        fileType: file.type,
        fileSize: file.size,
        filename: file.name,
        signature: signature,
      });

      return resourceData.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload file");
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}
