// src/plugins/subdomain.ts
import { Elysia } from 'elysia'

const rootDomain = Bun.env.ROOT_DOMAIN

if (!rootDomain) {
	throw new Error('ROOT_DOMAIN is not set')
}

export const subdomainPlugin = new Elysia({ name: 'subdomain-plugin' })
	.resolve(({ headers }) => {
		const host = headers.host

		if (!host || host === rootDomain || host.startsWith('www.')) {
			return { tenant: null }
		}

		let subdomain = ''

		const rootDomainAfterClean = rootDomain
			.replace('http://', '')
			.replace('https://', '')

		if (host.endsWith(`.${rootDomainAfterClean}`)) {
			subdomain = host.replace(`.${rootDomainAfterClean}`, '')
		}

		if (!subdomain) return { tenant: null }

		return {
			tenant: subdomain,
		}
	})
	.as('scoped')
