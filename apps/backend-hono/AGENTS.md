# BACKEND API KNOWLEDGE BASE

**App:** Backend API  
**Stack:** Hono + Cloudflare Workers + Drizzle ORM  
**Runtime:** Edge (serverless)

---

## OVERVIEW

Type-safe REST API running on Cloudflare Workers with PostgreSQL via Drizzle ORM. Features JWT auth, pluggable storage (Supabase/S3/R2), and request tracing.

---

## STRUCTURE

```
src/
├── index.ts           # Entry point, route mounting
├── routes/
│   ├── index.ts       # Route exports
│   ├── auth.ts        # Login, register, me
│   ├── memos.ts       # CRUD, timeline, search
│   ├── resources.ts   # File uploads
│   ├── proxy.ts       # Bilibili, image proxy
│   └── admin/users.ts # Admin user management
├── middleware/
│   ├── auth.ts        # JWT validation
│   ├── admin.ts       # Admin role check
│   ├── db.ts          # Drizzle instance
│   ├── env.ts         # Env parsing
│   └── trace.ts       # Trace ID generation
├── db/
│   ├── schema.ts      # Drizzle schema
│   └── db.ts          # Database connection
├── services/storage/  # Storage abstraction
│   ├── interface.ts   # IStorageProvider
│   ├── factory.ts     # createStorageService()
│   └── providers/     # Supabase, S3, R2
├── types/
│   ├── hono.ts        # HonoBindings, HonoVariables
│   ├── env.ts         # Env, SessionUser
│   └── storage-config.ts
└── utils/
    ├── code.ts        # Error codes
    ├── response.ts    # Response helpers
    └── env.ts         # Env validation
```

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `src/routes/*.ts` | Hono route modules |
| Auth middleware | `src/middleware/auth.ts` | JWT validation |
| Database schema | `src/db/schema.ts` | Users, memos, resources |
| Storage provider | `src/services/storage/` | Supabase/S3/R2 |
| Error codes | `src/utils/code.ts` | General, Auth, Memo codes |
| Response format | `src/utils/response.ts` | fail()/success() helpers |
| Type bindings | `src/types/hono.ts` | Hono context types |

---

## ROUTES

All routes prefixed `/api/v1/`:

| Route | File | Description |
|-------|------|-------------|
| `/auth/*` | `routes/auth.ts` | Register, login, me |
| `/memos/*` | `routes/memos.ts` | Timeline, CRUD, search |
| `/resources/*` | `routes/resources.ts` | Upload URLs, file ops |
| `/proxy/*` | `routes/proxy.ts` | Bilibili, image proxy |
| `/admin/users/*` | `routes/admin/users.ts` | Admin user mgmt |

---

## CONVENTIONS

### Response Format
```typescript
// Success
{ data, error: null, code: 0, traceId, timestamp }

// Failure  
{ data: null, error: "message", code, traceId, timestamp }
```

### Validation (arktype)
```typescript
const registerBody = type({
  username: "string >= 3",
  email: "string.email",
  password: "string >= 6",
});

app.post("/register", arktypeValidator("json", registerBody), async (c) => {
  const data = c.req.valid("json");
  // ...
});
```

### Middleware Context
```typescript
// Available via c.get()
traceId: string           // UUIDv7
env: Env                  // Parsed env
db: DrizzleDatabase       // Drizzle instance
user: SessionUser | null  // From JWT
jwt: JWTUtil              // sign/verify
isAdmin: boolean          // Admin flag
```

### Error Codes
- `GeneralCode`: 0 (Success), 10001 (NeedLogin), 50000 (Internal)
- `AuthCode`: 40001 (AlreadyExist), 40002 (WrongPassword)
- `MemoCode`: 20001 (NotFound), 20003 (NoPermission)

---

## ANTI-PATTERNS

| Rule | Location | Issue |
|------|----------|-------|
| **DO NOT** include bucket in S3 endpoint | `.dev.vars.example:10-13` | Runtime validation throws |
| **DO NOT USE** example binding | `worker-configuration.d.ts:9601` | Explanatory only |
| Missing S3_PUBLIC_URL | `s3.ts:99` | Required for S3 storage |

---

## COMMANDS

```bash
bun dev              # Wrangler dev server
bun deploy           # Deploy to Cloudflare
bun db:push          # Drizzle schema push
bun db:studio        # Drizzle Studio UI
bun typecheck        # TypeScript check
bun cf-typegen       # Generate Cloudflare types
```

---

## NOTES

- **Runtime**: Cloudflare Workers (edge/serverless)
- **DB**: PostgreSQL via Drizzle ORM
- **Auth**: JWT with `Authorization: Bearer <token>`
- **Storage**: Pluggable (Supabase, S3, R2) via factory pattern
- **Validation**: arktype with `@hono/arktype-validator`
- **Pagination**: Cursor-based with `createdAt` + `id`
- **Tracing**: UUIDv7 trace IDs on all requests
- **CORS**: Configured for all origins in dev
