export interface UploadResult {
	uploadUrl: string // 预签名上传 URL
	path: string // 存储路径
	headers?: Record<string, string>
}

export interface IStorageProvider {
	/**
	 * 获取预签名上传 URL
	 * @param path 文件存储路径
	 * @param fileType MIME Type
	 */
	getUploadUrl(path: string, fileType: string): Promise<UploadResult>

	/**
	 * 获取文件的公开访问链接
	 * @param path 文件存储路径
	 */
	getPublicUrl(path: string): string

	/**
	 * 删除文件 (可选)
	 */
	deleteFile(path: string): Promise<void>

	get providerName(): string
}
