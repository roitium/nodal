import type { JWTPayloadSpec } from '@elysiajs/jwt'
import { jwt } from '@elysiajs/jwt'
import { Elysia } from 'elysia'

const jwtSecret = Bun.env.JWT_SECRET

export interface SessionPayload extends JWTPayloadSpec {
	sub: string
	username: string
}

if (!jwtSecret) {
	throw new Error('JWT_SECRET is not set')
}

export const authPlugin = new Elysia({ name: 'auth-plugin' })
	.use(
		jwt({
			name: 'jwt',
			secret: jwtSecret,
		}),
	)
	.resolve(async ({ jwt, headers }) => {
		const authHeader = headers.authorization
		const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

		if (!token) return { user: null }

		const payload = (await jwt.verify(token)) as SessionPayload | false
		if (!payload) return { user: null }

		return {
			user: { id: payload.sub, username: payload.username },
		}
	})
	.as('scoped')
