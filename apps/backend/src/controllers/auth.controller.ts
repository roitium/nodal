import { users } from '@/db/schema'
import { dbPlugin } from '@/plugins/db'
import { jwt } from '@elysiajs/jwt'
import { eq, or } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { uuidv7 } from 'uuidv7'

export const authController = new Elysia({ prefix: '/auth' })
	.use(dbPlugin)
	.use(
		jwt({
			name: 'jwt',
			secret: process.env.JWT_SECRET!,
		}),
	)

	.post(
		'/register',
		async ({ body, status, jwt, db }) => {
			const existingUser = await db.query.users.findFirst({
				where: or(
					eq(users.email, body.email),
					eq(users.username, body.username),
				),
				columns: { id: true },
			})

			if (existingUser) {
				return status(409, '邮箱或用户名已被注册')
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
				return status(500, '用户创建失败')
			}
			const token = await jwt.sign({
				sub: newUser.id,
				username: newUser.username,
			})

			return {
				token,
				user: {
					id: newUser.id,
					username: newUser.username,
					email: newUser.email,
					avatarUrl: newUser.avatarUrl,
				},
			}
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
		async ({ body, status, jwt, db }) => {
			const { login, password } = body

			// 1. 查找用户
			const user = await db.query.users.findFirst({
				where: or(eq(users.email, login), eq(users.username, login)),
			})

			if (!user) return status(401, '账号或密码错误')

			// 2. 验证密码
			const isMatch = await Bun.password.verify(password, user.passwordHash)
			if (!isMatch) return status(401, '账号或密码错误')
			// 3. 签发 Token
			const token = await jwt.sign({
				sub: user.id,
				username: user.username,
			})

			return {
				token,
				user: {
					id: user.id,
					username: user.username,
					displayName: user.displayName,
					avatarUrl: user.avatarUrl,
				},
			}
		},
		{
			body: t.Object({
				login: t.String(), // 既可是 email 也可是 username
				password: t.String(),
			}),
			detail: {
				description: '登录用户。支持用 Username 或 Email 登录',
			},
		},
	)
