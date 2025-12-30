import { users } from '@/db/schema'
import { authPlugin } from '@/plugins/auth'
import { dbPlugin } from '@/plugins/db'
import { traceIdPlugin } from '@/plugins/trace'
import { AuthCode, GeneralCode } from '@/utils/code'
import { fail, success } from '@/utils/response'
import { jwt } from '@elysiajs/jwt'
import { eq, or } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { uuidv7 } from 'uuidv7'

export const authController = new Elysia({ prefix: '/auth', tags: ['auth'] })
	.use(dbPlugin)
	.use(authPlugin)
	.use(
		jwt({
			name: 'jwt',
			secret: Bun.env.JWT_SECRET!,
		}),
	)
	.use(traceIdPlugin)

	.post(
		'/register',
		async ({ body, status, jwt, db, traceId }) => {
			const existingUser = await db.query.users.findFirst({
				where: or(
					eq(users.email, body.email),
					eq(users.username, body.username),
				),
				columns: { id: true },
			})

			if (existingUser) {
				return status(
					409,
					fail({
						message: '邮箱或用户名已被注册',
						code: AuthCode.AlreadyExist,
						traceId,
					}),
				)
			}

			const hashedPassword = await Bun.password.hash(body.password)

			const hasher = new Bun.CryptoHasher('sha256')
			hasher.update(body.email.trim().toLowerCase())
			const hash = hasher.digest('hex')

			const [newUser] = await db
				.insert(users)
				.values({
					username: body.username,
					passwordHash: hashedPassword,
					displayName: body.username,
					avatarUrl: `https://www.gravatar.com/avatar/${hash}?s=200&d=identicon`,
					email: body.email,
					id: uuidv7(),
				})
				.returning()

			if (!newUser) {
				// 这不应该发生
				return status(
					500,
					fail({
						message: '创建用户失败',
						traceId,
						code: GeneralCode.InternalError,
					}),
				)
			}
			const token = await jwt.sign({
				sub: newUser.id,
				username: newUser.username,
			})

			return status(
				200,
				success({
					data: {
						token,
						user: {
							id: newUser.id,
							username: newUser.username,
							email: newUser.email,
							avatarUrl: newUser.avatarUrl,
						},
					},
					traceId,
				}),
			)
		},
		{
			body: t.Object({
				username: t.String({ minLength: 3, maxLength: 30 }),
				email: t.String({ format: 'email' }),
				password: t.String({ minLength: 6 }),
			}),
			detail: {
				description: '注册用户',
			},
		},
	)

	/**
	 * 支持用 Username 或 Email 登录
	 */
	.post(
		'/login',
		async ({ body, status, jwt, db, traceId }) => {
			const { login, password } = body

			const user = await db.query.users.findFirst({
				where: or(eq(users.email, login), eq(users.username, login)),
			})

			if (!user)
				return status(
					401,
					fail({
						message: '账号或密码错误',
						code: AuthCode.AccountPasswordMismatch,
						traceId,
					}),
				)

			const isMatch = await Bun.password.verify(password, user.passwordHash)
			if (!isMatch)
				return status(
					401,
					fail({
						message: '账号或密码错误',
						code: AuthCode.AccountPasswordMismatch,
						traceId,
					}),
				)
			const token = await jwt.sign({
				sub: user.id,
				username: user.username,
			})

			return status(
				200,
				success({
					data: {
						token,
						user: {
							id: user.id,
							username: user.username,
							displayName: user.displayName,
							avatarUrl: user.avatarUrl,
						},
					},
					traceId,
				}),
			)
		},
		{
			body: t.Object({
				login: t.String({ description: 'Username 或 Email 登录' }), // 既可是 email 也可是 username
				password: t.String(),
			}),
			detail: {
				description: '登录用户',
			},
		},
	)
	.patch(
		'/me',
		async ({ user, status, body, db, traceId }) => {
			if (!user)
				return status(
					401,
					fail({
						message: '请先登录',
						code: GeneralCode.NeedLogin,
						traceId,
					}),
				)

			const { displayName, avatarUrl, bio } = body

			const userRecord = await db.query.users.findFirst({
				where: eq(users.id, user.id),
			})

			if (!userRecord)
				return status(
					404,
					fail({
						message: '用户不存在',
						code: AuthCode.NotFound,
						traceId,
					}),
				)

			await db
				.update(users)
				.set({
					displayName: displayName ?? userRecord.displayName,
					avatarUrl: avatarUrl ?? userRecord.avatarUrl,
					bio: bio ?? userRecord.bio,
				})
				.where(eq(users.id, user.id))

			return status(
				200,
				success({
					data: user,
					traceId,
				}),
			)
		},
		{
			body: t.Object({
				displayName: t.Optional(t.String()),
				avatarUrl: t.Optional(t.String()),
				bio: t.Optional(t.String()),
			}),
			detail: {
				description: '更新用户信息',
			},
		},
	)
