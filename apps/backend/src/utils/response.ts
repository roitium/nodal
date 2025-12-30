import { GeneralCode } from './code'

export function fail({
	message,
	code,
	traceId,
}: {
	message: string
	code: number
	traceId: string
}) {
	return {
		data: null,
		error: message,
		traceId: traceId,
		code,
		timestamp: Date.now(),
	}
}

export function success<T>({ data, traceId }: { data: T; traceId: string }) {
	return {
		data,
		error: null,
		traceId: traceId,
		code: GeneralCode.Success,
		timestamp: Date.now(),
	}
}
