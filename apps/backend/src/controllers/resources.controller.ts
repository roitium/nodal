import { resources } from '@/db/schema'
import { authPlugin } from '@/plugins/auth'
import { dbPlugin } from '@/plugins/db'
import { storageService } from '@/services/storage'
import { and, desc, eq } from 'drizzle-orm'
import Elysia, { t } from 'elysia'
import { uuidv7 } from 'uuidv7'

export const resourcesController = new Elysia({
	prefix: '/resources',
	tags: ['resources'],
})
	.use(dbPlugin)
	.use(authPlugin)
	.get(
		'/:id',
		async ({ params: { id }, user, db, status }) => {
			if (!user) return status(401, '请先登录')

			const result = await db.query.resources.findFirst({
				where: and(eq(resources.id, id), eq(resources.userId, user.id)),
			})

			if (!result) return status(404, '资源不存在或该资源并不在你的账户下')

			return result
		},
		{
			detail: {
				description: '获取资源详情',
			},
		},
	)
	.get(
		'/upload-url',
		async ({ user, status, query }) => {
			if (!user) return status(401, '请先登录')

			const { fileType, ext } = query
			if (ext.includes('.')) return status(400, '文件后缀不能带点')
			if (ext.includes('/')) return status(400, '文件后缀不能带斜杠')
			const path = `resources/${user.id}/${uuidv7()}.${ext}`

			const result = await storageService.getUploadUrl(path, fileType)

			return result
		},
		{
			query: t.Object({
				fileType: t.String(),
				ext: t.String(),
			}),
			detail: {
				description: '获取签名后的上传 URL',
			},
		},
	)
	.post(
		'/record-upload',
		async ({ user, db, status, body }) => {
			if (!user) return status(401, '请先登录')

			const { path, fileType, fileSize, filename } = body

			if (!path.startsWith(`resources/${user.id}`)) {
				return status(403, '请求路径不合法')
			}

			const publicUrl = storageService.getPublicUrl(path)

			const [result] = await db
				.insert(resources)
				.values({
					type: fileType,
					size: fileSize,
					provider: storageService.providerName,
					path,
					externalLink: publicUrl,
					filename,
					id: uuidv7(),
					userId: user.id,
				})
				.returning()

			if (!result) return status(500, '新建资源失败') // 这不应该发生啊！！！

			return result
		},
		{
			body: t.Object({
				path: t.String(),
				fileType: t.String(),
				fileSize: t.Number(),
				filename: t.String(),
			}),
			detail: {
				description: '创建资源记录',
			},
		},
	)
	.get(
		'/user-all',
		async ({ user, db, status }) => {
			if (!user) return status(401, '请先登录')

			const result = await db.query.resources.findMany({
				where: eq(resources.userId, user.id),
				orderBy: [desc(resources.createdAt)],
			})

			return result
		},
		{
			detail: {
				description: '获取该用户所有资源',
			},
		},
	)
