export interface Response<T> {
	data: T | null
	error: string | null
    traceId: string
    code: number
    timestamp: number
}