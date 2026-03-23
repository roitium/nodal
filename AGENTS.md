# PROJECT KNOWLEDGE BASE

**Project:** Nodal  
**Type:** Full-stack microblogging note-taking application  
**Monorepo:** Bun workspaces  

---

## OVERVIEW

Cross-platform note-taking app with web (React), backend (Hono/Cloudflare), and Android (Kotlin/Compose) clients. Features markdown support, file uploads, nested replies, and offline-first sync on mobile.

---

## STRUCTURE

```
.
├── apps/
│   ├── web/              # React Router 7 + Tailwind 4 + PWA
│   ├── backend-hono/     # Hono + Cloudflare Workers + Drizzle
│   ├── android/          # Kotlin + Jetpack Compose + Room
│   └── recover/          # Migration scripts
├── docs/
│   └── spec.md           # API specifications
├── package.json          # Bun workspaces root
└── mise.toml             # Tool version management
```

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Web routes/pages | `apps/web/app/routes/` | React Router 7 file-based |
| Web components | `apps/web/app/components/` | Custom + shadcn/ui |
| Web hooks | `apps/web/app/hooks/` | queries/, mutations/ |
| API routes | `apps/backend-hono/src/routes/` | Hono route modules |
| API middleware | `apps/backend-hono/src/middleware/` | auth, db, trace |
| Database schema | `apps/backend-hono/src/db/schema.ts` | Drizzle ORM |
| Android screens | `apps/android/app/.../ui/screens/` | Compose screens |
| Android data | `apps/android/app/.../data/` | Repository pattern |

---

## CODE MAP

### Entry Points

| App | Entry | Command |
|-----|-------|---------|
| Web | `apps/web/app/root.tsx` | `cd apps/web && bun dev` |
| Backend | `apps/backend-hono/src/index.ts` | `cd apps/backend-hono && bun dev` |
| Android | `MainActivity.kt` | Android Studio |

### Key Files

- **Web RPC client:** `apps/web/app/lib/rpc.ts` — Hono type-safe client
- **Web query client:** `apps/web/app/lib/query-client.ts` — TanStack Query + IndexedDB
- **Backend routes:** `apps/backend-hono/src/routes/index.ts` — Route exports
- **Backend types:** `apps/backend-hono/src/types/hono.ts` — Hono bindings
- **Android repos:** `apps/android/.../data/repository/` — Data layer

---

## CONVENTIONS

### TypeScript
- **Strict mode** enabled in all apps
- Path aliases: `@/*` for backend, `~/` for web
- Target: ES2022, module: ES2022

### API Standards
- Base path: `/api/v1/`
- ISO 8601 datetime with timezone: `2023-01-01T00:00:00.000Z`
- Response shape: `{ data, error, code, traceId, timestamp }`
- JWT auth: `Authorization: Bearer <token>`

### Styling
- Web: Tailwind CSS 4 with `@theme` block
- Android: Material3 with custom Color.kt

### Git
- Avoid staging/committing unless explicitly requested
- Reproduce bugs before fixing

---

## ANTI-PATTERNS (FORBIDDEN)

| Rule | Location | Enforcement |
|------|----------|-------------|
| **DO NOT** include bucket name in S3 endpoint | `.dev.vars.example` | Runtime validation throws |
| **NEVER** use example Cloudflare binding | `worker-configuration.d.ts` | Marked DO NOT USE |
| **NEVER** use hooks outside providers | `sidebar.tsx`, `form.tsx` | Throws runtime error |
| **AVOID** 401/403 retry on queries | `query-client.ts` | Configured in retry logic |

---

## COMMANDS

```bash
# Root - install all dependencies
bun install

# Web development
cd apps/web && bun dev

# Backend development
cd apps/backend-hono && bun dev        # Wrangler dev server

# Database migrations
cd apps/backend-hono && bun db:push    # Drizzle push

# Type checking
cd apps/web && bun typecheck
cd apps/backend-hono && bun typecheck

# Android
# Open apps/android in Android Studio
```

---

## NOTES

- **Bun v1.3.5** as package manager
- **Cloudflare Workers** for edge deployment
- **PWA enabled** on web with Workbox
- **Offline-first sync** on Android with Room
- **Encrypted auth tokens** on Android (Keystore/Tink)
- **shadcn/ui** "new-york" style components
- **React Compiler** enabled for auto-memoization
- **View Transitions API** for page transitions

---

## APP-SPECIFIC DOCS

- [Web App →](./apps/web/AGENTS.md)
- [Backend API →](./apps/backend-hono/AGENTS.md)
- [Android App →](./apps/android/AGENTS.md)
