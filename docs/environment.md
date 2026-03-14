# Environment Variables

This repository now follows a single rule set for environment variables:

- Server-only variables never use a public prefix.
- Browser-exposed variables always use the `VITE_` prefix.
- Each app keeps only the variables it actually consumes.
- Runtime code reads environment variables through one local helper per app instead of scattered direct access.
- Track only example files in git. Real `.env` and `.dev.vars` files stay local.

## Shared Server Variables

These names are shared by `apps/backend` and `apps/backend-hono`.

| Variable                    | Required    | Purpose                                           |
| --------------------------- | ----------- | ------------------------------------------------- |
| `DATABASE_URL`              | yes         | PostgreSQL connection string                      |
| `JWT_SECRET`                | yes         | JWT signing key                                   |
| `ROOT_DOMAIN`               | recommended | Root domain for tenant/subdomain parsing          |
| `SUPABASE_URL`              | yes         | Supabase project URL                              |
| `SUPABASE_SERVICE_ROLE_KEY` | yes         | Supabase server-side key                          |
| `STORAGE_BUCKET`            | yes         | Storage bucket name                               |
| `STORAGE_PROVIDER`          | no          | Storage provider selector, defaults to `supabase` |

## App-Specific Variables

### apps/backend

- File: `.env`
- Example: `apps/backend/.env.example`
- Loading: `apps/backend/src/env.ts`

### apps/backend-hono

- Local file: `.dev.vars`
- Example: `apps/backend-hono/.dev.vars.example`
- Production secrets: use Wrangler secrets instead of putting secrets in `wrangler.toml`
- Loading: `apps/backend-hono/src/utils/env.ts`

### apps/web

- File: `.env`
- Example: `apps/web/.env.example`
- Only `VITE_` variables belong here unless the app starts using server-side env explicitly.
- Current public variable:
  - `VITE_API_BASE_URL`
- Temporary compatibility fallback:
  - `VITE_API_URL`

### apps/recover

- File: `.env`
- Example: `apps/recover/.env.example`
- Variables:
  - `API_ORIGIN`
  - `API_BEARER_TOKEN`
- Temporary compatibility fallbacks:
  - `API_BASE_URL` -> `API_ORIGIN`
  - `AUTH_COOKIE` -> `API_BEARER_TOKEN`

## Domain Setup

`apps/backend-hono/wrangler.toml` is now configured to deploy to:

- `nodal.roitium.com`

Current route config:

```toml
workers_dev = false
routes = [{ pattern = "nodal.roitium.com", custom_domain = true }]
```

Cloudflare requirements:

- The zone `roitium.com` must already exist in Cloudflare.
- Deploy with Wrangler after the route is configured.
- Keep `ROOT_DOMAIN=nodal.roitium.com` in the worker runtime if tenant parsing should treat that hostname as the root.

## Engineering Rules

- Do not read `Bun.env`, `process.env`, or `import.meta.env` directly inside feature code when an app helper already exists.
- Do not put server secrets into `apps/web/.env`.
- When adding a variable, update the app helper and the corresponding example file in the same change.
- Prefer additive compatibility during renames, then remove deprecated names after all callers migrate.

## Existing Risk

This repository previously had real secret-bearing env files checked in. Ignoring those files now prevents new leaks, but it does not remove already tracked secrets from git history. Rotate affected credentials if they were ever pushed to a remote.
