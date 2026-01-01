import Elysia from 'elysia'
import { v7 } from 'uuid'

export const traceIdPlugin = new Elysia().derive({ as: 'scoped' }, () => {
	return {
		traceId: v7(),
	}
})
