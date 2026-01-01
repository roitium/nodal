import { cors } from '@elysiajs/cors'
import openapi from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { authController } from './controllers/auth.controller'
import { memosController } from './controllers/memos.controller'
import { resourcesController } from './controllers/resources.controller'

export const app = new Elysia({ prefix: '/api/v1' })
	.use(cors())
	.use(openapi())
	.use(memosController)
	.use(authController)
	.use(resourcesController)
	.listen(3000)
