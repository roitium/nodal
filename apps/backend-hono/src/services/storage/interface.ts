export interface UploadResult {
  uploadUrl: string;
  path: string;
  headers?: Record<string, string>;
}

export interface IStorageProvider {
  getUploadUrl(path: string, fileType: string): Promise<UploadResult>;
  getPublicUrl(path: string): string;
  deleteFile(path: string): Promise<void>;
  get providerName(): string;
}
