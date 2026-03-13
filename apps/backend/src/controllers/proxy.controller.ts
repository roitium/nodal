import { traceIdPlugin } from '@/plugins/trace'
import { GeneralCode } from '@/utils/code'
import { fail, success } from '@/utils/response'
import { Elysia, t } from 'elysia'
import { v7 } from 'uuid'

interface BilibiliApiPayload {
	code: number
	data?: {
		title?: string
		desc?: string
		pic?: string
		owner?: {
			name?: string
		}
	}
}

type BilibiliViewData = ReturnType<typeof buildFallback>

const BILIBILI_METADATA_CACHE_TTL_MS = 5 * 60 * 1000

const bilibiliMetadataCache = new Map<
	string,
	{ data: BilibiliViewData; expiresAt: number }
>()

function getCachedBilibiliData(bvid: string): BilibiliViewData | null {
	const cached = bilibiliMetadataCache.get(bvid)
	if (!cached) return null
	if (cached.expiresAt <= Date.now()) {
		bilibiliMetadataCache.delete(bvid)
		return null
	}
	return cached.data
}

function setCachedBilibiliData(bvid: string, data: BilibiliViewData) {
	bilibiliMetadataCache.set(bvid, {
		data,
		expiresAt: Date.now() + BILIBILI_METADATA_CACHE_TTL_MS,
	})
}

function isAllowedImageHost(hostname: string) {
	return /(^|\.)hdslb\.com$/i.test(hostname)
}

function buildFallback(bvid: string) {
	return {
		bvid,
		title: bvid,
		author: 'Bilibili',
		description: '视频信息暂时不可用，点击可直接跳转到视频页',
		coverUrl: '',
		videoUrl: `https://www.bilibili.com/video/${bvid}`,
		degraded: true,
	}
}

export const proxyController = new Elysia({
	prefix: '/proxy',
	tags: ['proxy'],
})
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
		'/bilibili/view',
		async ({ query, status, traceId, request }) => {
			const matched = query.bvid.match(/^BV([0-9A-Za-z]+)$/i)
			if (!matched) {
				return status(
					400,
					fail({
						message: 'bvid 参数不合法',
						traceId,
						code: GeneralCode.InternalError,
					}),
				)
			}

			const bvid = `BV${matched[1]}`
			const fallback = buildFallback(bvid)

			const cached = getCachedBilibiliData(bvid)
			if (cached) {
				return status(200, success({ data: cached, traceId }))
			}

			const controller = new AbortController()
			const timeout = setTimeout(() => controller.abort(), 6000)

			try {
				const upstream = await fetch(
					`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
					{
						headers: {
							accept: 'application/json',
							referer: 'https://www.bilibili.com/',
							'user-agent': request.headers.get('user-agent') ?? 'Nodal/1.0',
						},
						signal: controller.signal,
					},
				)

				if (!upstream.ok) {
					setCachedBilibiliData(bvid, fallback)
					return status(200, success({ data: fallback, traceId }))
				}

				const payload = (await upstream.json()) as BilibiliApiPayload
				if (payload.code !== 0 || !payload.data) {
					setCachedBilibiliData(bvid, fallback)
					return status(200, success({ data: fallback, traceId }))
				}

				const coverUrl = payload.data.pic?.startsWith('//')
					? `https:${payload.data.pic}`
					: (payload.data.pic ?? '')

				const data = {
					bvid,
					title: payload.data.title ?? bvid,
					author: payload.data.owner?.name ?? 'Bilibili',
					description: payload.data.desc ?? '',
					coverUrl,
					videoUrl: `https://www.bilibili.com/video/${bvid}`,
					degraded: false,
				}

				setCachedBilibiliData(bvid, data)

				return status(
					200,
					success({
						data,
						traceId,
					}),
				)
			} catch {
				setCachedBilibiliData(bvid, fallback)
				return status(200, success({ data: fallback, traceId }))
			} finally {
				clearTimeout(timeout)
			}
		},
		{
			query: t.Object({
				bvid: t.String(),
			}),
			detail: {
				description: '代理获取 Bilibili 视频信息（解决前端跨域）',
			},
		},
	)
	.get(
		'/image',
		async ({ query, status, request }) => {
			let target: URL
			try {
				target = new URL(query.url)
			} catch {
				return status(400, 'invalid image url')
			}

			if (target.protocol !== 'https:') {
				return status(400, 'only https image url is allowed')
			}

			if (!isAllowedImageHost(target.hostname)) {
				return status(403, 'image host is not allowed')
			}

			const controller = new AbortController()
			const timeout = setTimeout(() => controller.abort(), 6000)

			try {
				const upstream = await fetch(target.toString(), {
					headers: {
						referer: 'https://www.bilibili.com/',
						'user-agent': request.headers.get('user-agent') ?? 'Nodal/1.0',
					},
					signal: controller.signal,
				})

				if (!upstream.ok || !upstream.body) {
					return status(502, 'failed to fetch image')
				}

				return new Response(upstream.body, {
					status: 200,
					headers: {
						'Content-Type':
							upstream.headers.get('content-type') ?? 'image/jpeg',
						'Cache-Control':
							'public, max-age=3600, stale-while-revalidate=86400',
					},
				})
			} catch {
				return status(504, 'image upstream timeout')
			} finally {
				clearTimeout(timeout)
			}
		},
		{
			query: t.Object({
				url: t.String(),
			}),
			detail: {
				description: '代理拉取图片（用于规避 Bilibili 防盗链）',
			},
		},
	)
