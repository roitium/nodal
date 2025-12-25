import { cors } from '@elysiajs/cors'
import openapi from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { authController } from './controllers/auth.controller'
import { memosController } from './controllers/memos.controller'
import { resourcesController } from './controllers/resources.controller'

const app = new Elysia({ prefix: '/api/v1' })
	.use(cors())
	.use(openapi())
	.use(memosController)
	.use(authController)
	.use(resourcesController)
	.listen(5000)

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
)
