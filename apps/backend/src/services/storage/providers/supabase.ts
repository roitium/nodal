import type {
	IStorageProvider,
	UploadResult,
} from '@/services/storage/interface'
import { createClient } from '@supabase/supabase-js'

if (
	!Bun.env.SUPABASE_URL ||
	!Bun.env.SUPABASE_SERVICE_ROLE_KEY ||
	!Bun.env.STORAGE_BUCKET
) {
	throw new Error(
		'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY or STORAGE_BUCKET not found',
	)
}

export class SupabaseStorageProvider implements IStorageProvider {
	private client
	private bucket: string
	private url: string
	readonly providerName = 'supabase'

	constructor() {
		this.url = Bun.env.SUPABASE_URL!
		const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY!
		this.bucket = Bun.env.STORAGE_BUCKET!

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
