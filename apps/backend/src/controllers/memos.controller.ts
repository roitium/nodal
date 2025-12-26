import { memos, resources, users } from '@/db/schema'
import { authPlugin } from '@/plugins/auth'
import { dbPlugin } from '@/plugins/db'
import { subdomainPlugin } from '@/plugins/subdomain'
import { and, desc, eq, inArray, isNull, lt, or } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { uuidv7 } from 'uuidv7'

export const memosController = new Elysia({ prefix: '/memos', tags: ['memos'] })
	.use(authPlugin)
	.use(subdomainPlugin)
	.use(dbPlugin)

	/**
	 * 获取 memos 列表
	 * 1. 支持通过 子域名/username=xxx 查询某个用户的公开笔记。如果用户已登录，则为该用户所有笔记
	 * 2. 不提供用户名时，查询所有用户的公开笔记 + 当前用户的私密笔记
	 */
	.get(
		'/timeline',
		async ({ user, query, status, tenant, db }) => {
			const limit = query.limit ? parseInt(query.limit) : 20
			const { cursorCreatedAt, cursorId } = query
			// 优先使用子域名作为用户名进行查询
			const targetUsername = tenant ?? query.username
			const currentUserId = user?.id ?? ''

			const filters = [isNull(memos.parentId)]

			if (targetUsername) {
				const targetUser = await db.query.users.findFirst({
					where: eq(users.username, targetUsername),
				})
				if (!targetUser) return status(404, '用户不存在')
				// 查询该用户的所有 memos
				filters.push(eq(memos.userId, targetUser.id))
				// 如果该用户不是当前登录用户，则只显示公开的 memos
				if (targetUser.id !== currentUserId) {
					filters.push(eq(memos.visibility, 'public'))
				}
			} else {
				// 不指定用户时，显示所有用户的公开 memos + 当前用户的私密 memos
				if (currentUserId) {
					filters.push(
						or(
							eq(memos.visibility, 'public'),
							eq(memos.userId, currentUserId),
						)!,
					)
				} else {
					filters.push(eq(memos.visibility, 'public'))
				}
			}

			if (cursorCreatedAt && cursorId) {
				const cursorDate = new Date(cursorCreatedAt)
				filters.push(
					or(
						lt(memos.createdAt, cursorDate),
						and(eq(memos.createdAt, cursorDate), lt(memos.id, cursorId)),
					)!,
				)
			}

			const data = await db.query.memos.findMany({
				where: and(...filters),
				orderBy: [desc(memos.createdAt), desc(memos.id)],
				limit: limit + 1, // 多查一条判断有没有下一页
				with: {
					author: {
						columns: {
							id: true,
							username: true,
							displayName: true,
							avatarUrl: true,
							bio: true,
							createdAt: true,
						},
					},
					quotedMemo: true,
					resources: {
						columns: {
							id: true,
							externalLink: true,
							type: true,
							size: true,
						},
					},
					replies: {
						with: {
							author: {
								columns: {
									id: true,
									username: true,
									displayName: true,
									avatarUrl: true,
								},
							},
						},
					},
				},
			})

			const hasNextPage = data.length > limit
			const items = hasNextPage ? data.slice(0, limit) : data

			return {
				data: items,
				nextCursor: hasNextPage
					? {
							createdAt: items[items.length - 1]?.createdAt?.getTime() ?? 0,
							id: items[items.length - 1]?.id ?? '',
						}
					: null,
			}
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
				cursorCreatedAt: t.Optional(t.Number()),
				cursorId: t.Optional(t.String({ format: 'uuid' })),
				username: t.Optional(t.String()),
			}),
			detail: {
				description: `获取 memos 列表\n1. 支持通过 子域名/username=xxx 查询某个用户的公开笔记。如果用户已登录，则为该用户所有笔记\n2. 不提供用户名时，查询所有用户的公开笔记 + 当前用户的私密笔记`,
			},
		},
	)

	/**
	 *  发布 / 评论 / 转发
	 */
	.post(
		'/publish',
		async ({ body, status, db, user }) => {
			if (!user) return status(401, '请先登录')

			const newId = uuidv7()
			let path = `/${newId}/`

			if (body.parentId) {
				if (body.isPinned) {
					return status(400, '回复的笔记不能被置顶')
				}
				const parent = await db.query.memos.findFirst({
					where: eq(memos.id, body.parentId),
					columns: { path: true, visibility: true },
				})

				if (!parent) return status(404, '回复的笔记不存在')

				path = `${parent.path}${newId}/`
			}

			await db.transaction(async (tx) => {
				await tx.insert(memos).values({
					id: newId,
					content: body.content,
					userId: user.id,
					parentId: body.parentId,
					quoteId: body.quoteId,
					visibility: body.visibility ?? 'public',
					path: path,
					isPinned: body.isPinned ?? false,
					createdAt: new Date(body.createdAt ?? Date.now()),
				})

				if (body.resources && body.resources.length > 0) {
					await tx
						.update(resources)
						.set({ memoId: newId })
						.where(
							and(
								inArray(resources.id, body.resources),
								eq(resources.userId, user.id),
							),
						)
				}
			})

			const result = await db.query.memos.findFirst({
				where: eq(memos.id, newId),
			})
			return result
		},
		{
			body: t.Object({
				content: t.String(),
				visibility: t.Optional(
					t.Union([t.Literal('public'), t.Literal('private')]),
				),
				parentId: t.Optional(t.String({ format: 'uuid' })),
				quoteId: t.Optional(t.String({ format: 'uuid' })),
				resources: t.Optional(t.Array(t.String({ format: 'uuid' }))),
				isPinned: t.Optional(t.Boolean()),
				createdAt: t.Optional(t.Number()),
			}),
			detail: {
				description: '发布 / 评论 / 转发',
			},
		},
	)

	/**
	 * 3. 获取单条详情
	 */
	.get(
		'/:id',
		async ({ user, params: { id }, status, db }) => {
			const memo = await db.query.memos.findFirst({
				where: eq(memos.id, id),
				with: {
					author: {
						columns: {
							id: true,
							username: true,
							displayName: true,
							avatarUrl: true,
							bio: true,
							createdAt: true,
						},
					},
					quotedMemo: true,
					resources: {
						columns: {
							id: true,
							externalLink: true,
							type: true,
							size: true,
						},
					},
					replies: true,
				},
			})

			if (!memo) return status(404, '笔记不存在')

			if (memo.visibility === 'private' && memo.userId !== user?.id) {
				return status(403, '无权查看')
			}

			return memo
		},
		{
			detail: {
				description: '获取单条详情',
			},
		},
	)
	.delete(
		'/:id',
		async ({ user, db, status, params: { id } }) => {
			if (!user) return status(401, '请先登录')

			const memo = await db.query.memos.findFirst({
				where: eq(memos.id, id),
			})

			if (!memo) return status(404, '该记录不存在')

			if (memo.userId !== user.id) return status(403, '无权删除')

			await db.transaction(async (tx) => {
				await tx.delete(memos).where(eq(memos.id, id))
				await tx.delete(resources).where(eq(resources.memoId, id))
			})

			return true
		},
		{
			detail: {
				description: '删除该笔记',
			},
		},
	)
	.patch(
		'/:id',
		async ({ db, user, body, params: { id }, status }) => {
			if (!user) return status(401, '请先登录')

			const memo = await db.query.memos.findFirst({
				where: eq(memos.id, id),
				with: {
					resources: true,
				},
			})
			if (!memo) return status(404, '该记录不存在')

			if (memo.userId !== user.id) return status(403, '无权操作')

			const {
				isPinned,
				visibility,
				content,
				resources: resourcesIds,
				qouteId,
				createdAt,
			} = body

			await db.transaction(async (tx) => {
				await tx
					.update(memos)
					.set({
						isPinned: isPinned ?? memo.isPinned,
						visibility: visibility ?? memo.visibility,
						content: content ?? memo.content,
						quoteId: qouteId ?? memo.quoteId,
						createdAt: createdAt ? new Date(createdAt) : memo.createdAt,
					})
					.where(eq(memos.id, id))

				// 用户没修改资源时，直接返回
				if (resourcesIds === undefined) {
					return
				}
				if (memo.resources) {
					await tx
						.update(resources)
						.set({ memoId: null })
						.where(
							and(eq(resources.memoId, memo.id), eq(resources.userId, user.id)),
						)
				}
				if (resourcesIds) {
					await tx
						.update(resources)
						.set({ memoId: id })
						.where(
							and(
								inArray(resources.id, resourcesIds),
								eq(resources.userId, user.id),
							),
						)
				}
			})

			return status(200, '操作成功')
		},
		{
			body: t.Object({
				isPinned: t.Optional(t.Boolean()),
				visibility: t.Optional(
					t.Union([t.Literal('public'), t.Literal('private')]),
				),
				content: t.Optional(t.String()),
				resources: t.Optional(t.Array(t.String({ format: 'uuid' }))),
				qouteId: t.Optional(t.String({ format: 'uuid' })),
				createdAt: t.Optional(t.Number()),
			}),
		},
	)
