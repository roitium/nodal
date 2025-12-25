import type {
	IStorageProvider,
	UploadResult,
} from '@/services/storage/interface'
import { createClient } from '@supabase/supabase-js'

if (
	!process.env.SUPABASE_URL ||
	!process.env.SUPABASE_SERVICE_ROLE_KEY ||
	!process.env.STORAGE_BUCKET
) {
	throw new Error('SUPABASE_URL is not set')
}

export class SupabaseStorageProvider implements IStorageProvider {
	private client
	private bucket: string
	private url: string
	readonly providerName = 'supabase'

	constructor() {
		this.url = process.env.SUPABASE_URL!
		const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
		this.bucket = process.env.STORAGE_BUCKET!

		this.client = createClient(this.url, key)
	}

	async getUploadUrl(path: string): Promise<UploadResult> {
		const { data, error } = await this.client.storage
			.from(this.bucket)
			.createSignedUploadUrl(path)

		if (error || !data) {
			throw new Error(`Supabase Storage Error: ${error?.message}`)
		}

		return {
			uploadUrl: data.signedUrl,
			path: data.path,
			headers: {
				token: data.token,
			},
		}
	}

	getPublicUrl(path: string): string {
		const { data } = this.client.storage.from(this.bucket).getPublicUrl(path)

		return data.publicUrl
	}

	async deleteFile(path: string): Promise<void> {
		const { error } = await this.client.storage.from(this.bucket).remove([path])

		if (error) throw error
	}
}
