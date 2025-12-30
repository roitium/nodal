import { cors } from '@elysiajs/cors'
import openapi from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { authController } from './controllers/auth.controller'
import { memosController } from './controllers/memos.controller'
import { resourcesController } from './controllers/resources.controller'
import { GeneralCode } from './utils/code'
import { fail } from './utils/response'

export const app = new Elysia({ prefix: '/api/v1' })
	.use(cors())
	.use(openapi())
	.use(memosController)
	.use(authController)
	.use(resourcesController)
	.onError(({ error, traceId, status }) => {
		console.error(`traceId: ${traceId}`, error)
		return status(
			500,
			fail({
				message: '服务器内部错误',
				traceId,
				code: GeneralCode.InternalError,
			}),
		)
	})
	.listen(3000)
