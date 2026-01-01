import { resources } from '@/db/schema'
import { authPlugin } from '@/plugins/auth'
import { dbPlugin } from '@/plugins/db'
import { traceIdPlugin } from '@/plugins/trace'
import { storageService } from '@/services/storage'
import { GeneralCode, ResourceCode } from '@/utils/code'
import { fail, success } from '@/utils/response'
import { and, desc, eq } from 'drizzle-orm'
import Elysia, { t } from 'elysia'
import { v7 as uuidv7, v7 } from 'uuid'

export const resourcesController = new Elysia({
	prefix: '/resources',
	tags: ['resources'],
})
	.use(dbPlugin)
	.use(authPlugin)
	.use(traceIdPlugin)
	.onError(({ error, set, traceId }) => {
		traceId ??= v7()
		console.error(`traceId: ${traceId}`, error)
		set.status = 500
		return fail({
			message: '服务器内部错误',
			traceId,
			code: GeneralCode.InternalError,
		})
	})
	.get(
		'/:id',
		async ({ params: { id }, user, db, status, traceId }) => {
			if (!user)
				return status(
					401,
					fail({
						message: '请先登录',
						code: GeneralCode.NeedLogin,
						traceId: traceId,
					}),
				)

			const result = await db.query.resources.findFirst({
				where: and(eq(resources.id, id), eq(resources.userId, user.id)),
			})

			if (!result)
				return status(
					404,
					fail({
						message: '资源不存在或该资源并不在你的账户下',
						code: ResourceCode.NotFound,
						traceId: traceId,
					}),
				)

			return status(200, success({ data: result, traceId: traceId }))
		},
		{
			detail: {
				description: '获取资源详情',
			},
		},
	)
	.get(
		'/upload-url',
		async ({ user, status, query, traceId, jwt }) => {
			if (!user)
				return status(
					401,
					fail({
						message: '请先登录',
						traceId: traceId,
						code: GeneralCode.NeedLogin,
					}),
				)

			const { fileType, ext } = query
			if (ext.includes('.'))
				return status(
					400,
					fail({
						message: '文件后缀不能带点',
						traceId: traceId,
						code: ResourceCode.illegalParam,
					}),
				)
			if (ext.includes('/'))
				return status(
					400,
					fail({
						message: '文件后缀不能带斜杠',
						traceId: traceId,
						code: ResourceCode.illegalParam,
					}),
				)
			const path = `resources/${user.id}/${uuidv7()}.${ext}`

			const payload = {
				user: user.id,
				path,
				fileType,
				ext,
			}
			const token = await jwt.sign(payload)

			const result = await storageService.getUploadUrl(path, fileType)

			return status(
				200,
				success({ data: { ...result, signature: token }, traceId: traceId }),
			)
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
		async ({ user, db, status, body, traceId, jwt }) => {
			if (!user)
				return status(
					401,
					fail({
						message: '请先登录',
						traceId: traceId,
						code: GeneralCode.NeedLogin,
					}),
				)

			const { path, fileType, fileSize, filename } = body

			if (!path.startsWith(`resources/${user.id}`)) {
				return status(
					403,
					fail({
						message: '请求路径不合法',
						traceId: traceId,
						code: ResourceCode.illegalParam,
					}),
				)
			}
			const { signature } = body
			const payload = await jwt.verify(signature)
			if (payload === false) {
				return status(
					403,
					fail({
						message: '签名验证失败',
						traceId: traceId,
						code: ResourceCode.illegalParam,
					}),
				)
			}
			if (payload.path !== path || payload.user !== user.id) {
				return status(
					403,
					fail({
						message: '签名内包含数据与请求不一致',
						traceId: traceId,
						code: ResourceCode.illegalParam,
					}),
				)
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

			if (!result)
				return status(
					500,
					fail({
						message: '文件上传失败',
						code: GeneralCode.InternalError,
						traceId,
					}),
				) // 这不应该发生啊！！！

			return status(200, success({ data: result, traceId: traceId }))
		},
		{
			body: t.Object({
				path: t.String(),
				fileType: t.String(),
				fileSize: t.Number(),
				filename: t.String(),
				signature: t.String(),
			}),
			detail: {
				description: '创建资源记录',
			},
		},
	)
	.get(
		'/user-all',
		async ({ user, db, status, traceId }) => {
			if (!user)
				return status(
					401,
					fail({
						message: '请先登录',
						traceId: traceId,
						code: GeneralCode.NeedLogin,
					}),
				)

			const result = await db.query.resources.findMany({
				where: eq(resources.userId, user.id),
				orderBy: [desc(resources.createdAt)],
			})

			return status(200, success({ data: result, traceId: traceId }))
		},
		{
			detail: {
				description: '获取该用户所有资源',
			},
		},
	)
