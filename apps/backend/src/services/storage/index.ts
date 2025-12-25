import type { IStorageProvider } from './interface'
import { SupabaseStorageProvider } from './providers/supabase'

function createStorageService(): IStorageProvider {
	const provider = process.env.STORAGE_PROVIDER ?? 'supabase'

	switch (provider) {
		case 'supabase':
		default:
			return new SupabaseStorageProvider()
	}
}

export const storageService = createStorageService()
