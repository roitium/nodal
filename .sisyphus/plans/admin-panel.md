# Admin Panel Implementation Plan

## TL;DR

> **Quick Summary**: Create a backend admin panel for Nodal with configuration management and user management. Settings stored in PostgreSQL with AES-GCM encryption for secrets. Admin routes at `/api/v1/admin/*`, frontend at `/admin/*`.
> 
> **Deliverables**:
> - `settings` table in PostgreSQL with encryption support
> - Admin middleware with DB-based admin check
> - Admin API endpoints: settings CRUD, user management
> - Admin frontend: layout, settings page, users page
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Schema → Middleware → API → Frontend

---

## Context

### Original Request
Create a backend admin panel for the Nodal project with:
1. Configuration management for all environment variables
2. User management functionality
3. Question: Where to store configs since Cloudflare Workers have no config files?

### Interview Summary

**Key Discussions**:
- **Configuration Storage**: PostgreSQL `settings` table with AES-GCM encryption for secrets
- **Immutable Secrets**: `DATABASE_URL`, `JWT_SECRET`, `SETTINGS_ENCRYPTION_KEY` stay in environment variables
- **User Management**: Full management (view, edit, set admin, ban/enable, delete)
- **Admin Route**: `/admin/*` independent route with sidebar layout
- **Audit Logging**: NOT included (keep simple)
- **Test Strategy**: No tests, Agent-Executed QA only

**Research Findings**:
- Project uses: Hono (backend), React Router 7 (frontend), PostgreSQL + Drizzle (database), Radix UI (components)
- `users` table has `isAdmin` field (not used yet)
- JWT auth exists in `src/middleware/auth.ts`
- No test infrastructure exists

### Metis Review

**Identified Gaps** (addressed):
- Admin self-protection: Prevent self-ban, self-delete, last-admin deletion
- Session invalidation: Banned users' JWTs remain valid until expiry (acceptable)
- Concurrent updates: Last-write-wins (acceptable)
- Settings validation: Per-setting validation rules defined
- Admin check method: DB lookup (avoids JWT complexity)

**Auto-Resolved** (minor gaps fixed):
- Added `updated_by` column to track who changed settings
- Added `description` column for settings metadata
- Defined specific validation rules per setting type

**Defaults Applied**:
- Admin status checked from DB (not JWT payload)
- Banned users' JWTs remain valid until expiry
- Settings updates use last-write-wins

---

## Work Objectives

### Core Objective
Implement a secure admin panel for managing application settings and users, with encrypted storage for sensitive configuration values.

### Concrete Deliverables
- PostgreSQL `settings` table with encryption support
- Admin middleware (`src/middleware/admin.ts`)
- Admin API routes (`src/routes/admin/*.ts`)
- Admin frontend pages (`apps/web/app/routes/admin.*.tsx`)
- Settings encryption utility (`src/utils/encryption.ts`)

### Definition of Done
- [ ] All admin API endpoints return correct responses (verified via curl)
- [ ] Settings page displays and edits all configurable settings
- [ ] Users page lists, searches, and manages users
- [ ] Non-admins receive 403 when accessing admin routes
- [ ] Unauthenticated users receive 401 when accessing admin routes
- [ ] Self-ban and last-admin deletion are blocked

### Must Have
- Admin-only API routes with proper authentication/authorization
- Settings CRUD with encryption for secrets
- User management (list, view, edit, ban/enable, delete)
- Responsive admin layout with sidebar
- Protection: self-ban, self-delete, last-admin deletion guards

### Must NOT Have (Guardrails)
- NO test files (user explicitly requested no tests)
- NO modification of existing auth middleware
- NO `isAdmin` field in JWT payload (causes token invalidation issues)
- NO audit logging (keep simple, excluded from scope)
- NO role hierarchy beyond `isAdmin` boolean
- NO bulk user operations
- NO user impersonation feature
- NO settings import/export

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: N/A
- **Agent-Executed QA**: ALL verification via curl (backend) and Playwright (frontend)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Database**: Use Bash (psql/drizzle) — Verify schema, query data

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - DB + Utils):
├── Task 1: Settings table schema [quick]
├── Task 2: Encryption utility [quick]
├── Task 3: Admin error codes [quick]
└── Task 4: Admin middleware [quick]

Wave 2 (Backend APIs - MAX PARALLEL):
├── Task 5: Settings API - GET [unspecified-high]
├── Task 6: Settings API - PATCH [unspecified-high]
├── Task 7: Users API - GET (list) [unspecified-high]
├── Task 8: Users API - GET (single) [unspecified-high]
├── Task 9: Users API - PATCH (update) [unspecified-high]
└── Task 10: Users API - DELETE [unspecified-high]

Wave 3 (Frontend - UI Layer):
├── Task 11: Admin layout + sidebar [visual-engineering]
├── Task 12: Settings page [visual-engineering]
└── Task 13: Users page [visual-engineering]

Wave FINAL (4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 2 → Task 5-6 → Task 12 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 2)
```

### Dependency Matrix

- **1-4**: — (foundation, can start immediately)
- **5**: 1, 2 → 12
- **6**: 1, 2, 5 → 12
- **7**: 1, 4 → 13
- **8**: 1, 4 → 13
- **9**: 1, 4 → 13
- **10**: 1, 4 → 13
- **11**: — → 12, 13
- **12**: 5, 6, 11 → F3
- **13**: 7-10, 11 → F3
- **F1-F4**: ALL → user okay

---

## TODOs

- [ ] 1. Create Settings Table Schema**What to do**:
  - Add `settings` table to `src/db/schema.ts`
  - Table structure: `key` (TEXT PRIMARY KEY), `value` (TEXT), `is_encrypted` (BOOLEAN), `is_secret` (BOOLEAN), `description` (TEXT), `updated_at` (TIMESTAMP), `updated_by` (UUID REFERENCES users)
  - Run `bun run db:push` to sync schema to database
  - Insert default settings rows for all configurable values**Must NOT do**:
  - Do NOT add `DATABASE_URL` or `JWT_SECRET` to settings (immutable)
  - Do NOT create migration files (project uses `drizzle-kit push`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple schema addition, follows existing pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/db/schema.ts:1-136` - Existing table patterns, Drizzle ORM usage
  - `apps/backend-hono/drizzle.config.ts` - Drizzle configuration
  - `.dev.vars:1-7` - Example environment variable names to include
  - `src/types/env.ts:20-33` - Full list of environment variables

  **Acceptance Criteria**:
  - [ ] `settings` table exists in PostgreSQL
  - [ ] All configurable settings have default rows inserted
  - [ ] Foreign key `updated_by` references `users.id`

  **QA Scenarios**:
  ```
  Scenario: Table schema verification
    Tool: Bash (psql/drizzle)
    Preconditions: Database connection available
    Steps:
      1. Run `bun run db:push`
      2. Query: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'settings'  ORDER. ordinal_position
    Expected Result: Returns columns: key (text), value (text), is_encrypted (boolean), is_secret (boolean), description (text), updated_at (timestamp), updated_by (uuid)    Failure Indicators: Missing columns or wrong types
    Evidence: .sisyphus/evidence/task-1-schema.txt

  Scenario: Default settings inserted
    Tool: Bash (psql)
    Preconditions: Database exists with settings table
    Steps:
      1. Query: SELECT key FROM settings
    Expected Result: Returns rows for ROOT_DOMAIN, STORAGE_PROVIDER, SUPABASE_URL, STORAGE_BUCKET, SUPABASE_SERVICE_ROLE_KEY, S3_ENDPOINT, S3_PUBLIC_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
    Failure Indicators: Missing keys
    Evidence: .sisyphus/evidence/task-1-defaults.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add settings table for admin configuration`
  - Files: `src/db/schema.ts`
  - Pre-commit: `bun run typecheck`---

- [ ] 2. Create Encryption Utility

  **What to do**:
  - Create `src/utils/encryption.ts`
  - Implement `encrypt(value: string, key: string): Promise<string>` using AES-GCM
  - Implement `decrypt(encrypted: string, key: string): Promise<string>`
  - Implement `mask(value: string): string` - returns `****...****` for secrets
  - Handle missing `SETTINGS_ENCRYPTION_KEY` gracefully (throw clear error)- Add helper `isEncryptionKeySet(env: Env): boolean`

  **Must NOT do**:
  - Do NOT expose encryption key in logs
  - Do NOT use weak encryption algorithms

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Utility functions, standard crypto API
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/utils/password.ts` - Existing crypto utility pattern
  - MDN Web Crypto API documentation - AES-GCM implementation

  **Acceptance Criteria**:
  - [ ] `encrypt()` produces valid AES-GCM ciphertext
  - [ ] `decrypt()` correctly reverses encryption
  - [ ] `mask()` returns `****...****` for any input
  - [ ] Missing encryption key throws clear error

  **QA Scenarios**:
  ```
  Scenario: Encryption roundtrip
    Tool: Bash (bun repl)
    Preconditions: None
    Steps:1. Import encryption functions
      2. const key = "test-encryption-key-32-bytes!"
      3. const encrypted = await encrypt("secret-value", key)
      4. const decrypted = await decrypt(encrypted, key)
    Expected Result: decrypted === "secret-value"
    Failure Indicators: decrypt throws or returns wrong value
    Evidence: .sisyphus/evidence/task-2-encryption.txt

  Scenario: Mask function
    Tool: Bash (bun repl)
    Preconditions: None
    Steps:
      1. Import mask function
      2. mask("sk_live_xxxxxxxxxxxxxxxxxxxx")
    Expected Result: Returns "****...****" or similar masked format
    Failure Indicators: Returns original value
    Evidence: .sisyphus/evidence/task-2-mask.txt

  Scenario: Missing encryption key error
    Tool: Bash (bun repl)
    Preconditions: SETTINGS_ENCRYPTION_KEY not set
    Steps:
      1. Import isEncryptionKeySet
      2. Call with empty env object
    Expected Result: Returns false
    Failure Indicators: Throws or returns true
    Evidence: .sisyphus/evidence/task-2-error.txt
  ```

  **Commit**: YES
  - Message: `feat(utils): add AES-GCM encryption utility`
  - Files: `src/utils/encryption.ts`

---

- [ ] 3. Add Admin Error Codes

  **What to do**:
  - Add `AdminCode` enum to `src/utils/code.ts`
  - Codes: `Forbidden` (403), `UserNotFound` (404), `SettingNotFound` (404), `LastAdmin` (403), `SelfAction` (403), `EncryptionKeyMissing` (500)
  - Follow existing `AuthCode` and `GeneralCode` pattern

  **Must NOT do**:
  - Do NOT modify existing error codes
  - Do NOT use generic error messages

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple enum addition
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 5-10
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/utils/code.ts` - Existing error code pattern

  **Acceptance Criteria**:
  - [ ] `AdminCode` enum exists with all required codes
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Error codes exist
    Tool: Bash (tsc)
    Preconditions: None
    Steps:
      1. Run `bun run typecheck`
    Expected Result: No TypeScript errors
    Failure Indicators: Compilation errors
    Evidence: .sisyphus/evidence/task-3-typecheck.txt
  ```

  **Commit**: YES
  - Message: `feat(code): add AdminCode error codes`
  - Files: `src/utils/code.ts`

---

- [ ] 4. Create Admin Middleware

  **What to do**:
  - Create `src/middleware/admin.ts`
  - Implement `adminMiddleware` that:
    1. Checks if user is authenticated (from `c.get("user")`)
    2. Queries DB for `isAdmin` field
    3. Returns 401 if not authenticated
    4. Returns 403 if authenticated but not admin
    5. Sets `c.set("isAdmin", true)` for downstream handlers
  - Follow existing `authMiddleware` pattern

  **Must NOT do**:
  - Do NOT modify existing `authMiddleware`
  - Do NOT add `isAdmin` to JWT payload

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard Hono middleware pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 5-10
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/middleware/auth.ts:1-57` - Existing middleware pattern
  - `src/db/schema.ts:13-30` - Users table with isAdmin field

  **Acceptance Criteria**:
  - [ ] 401 returned for unauthenticated requests
  - [ ] 403 returned for non-admin authenticated requests
  - [ ] Request continues for admin authenticated requests
  - [ ] `isAdmin` available via `c.get("isAdmin")`

  **QA Scenarios**:
  ```
  Scenario: Unauthenticated request blocked
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:1. curl -X GET http://localhost:8787/api/v1/admin/settings
    Expected Result: HTTP 401, {"code": "NEED_LOGIN"}
    Failure Indicators: 200 or 403
    Evidence: .sisyphus/evidence/task-4-unauth.txt

  Scenario: Non-admin request blocked
    Tool: Bash (curl)
    Preconditions: Server running, non-admin user token available
    Steps:
      1. curl -X GET -H "Authorization: Bearer {non_admin_token}" http://localhost:8787/api/v1/admin/settings
    Expected Result: HTTP 403, {"code": "FORBIDDEN"}
    Failure Indicators: 200 or 401
    Evidence: .sisyphus/evidence/task-4-nonadmin.txt

  Scenario: Admin request passes
    Tool: Bash (curl)
    Preconditions: Server running, admin user token available
    Steps:
      1. curl -X GET -H "Authorization: Bearer {admin_token}" http://localhost:8787/api/v1/admin/settings
    Expected Result: HTTP 200
    Failure Indicators: 401 or 403
    Evidence: .sisyphus/evidence/task-4-admin.txt
  ```

  **Commit**: YES
  - Message: `feat(middleware): add admin authorization middleware`
  - Files: `src/middleware/admin.ts`

---

- [ ] 5. Settings API - GET Endpoint

  **What to do**:
  - Create `src/routes/admin/settings.ts`
  - Implement `GET /api/v1/admin/settings`
  - Query all settings from database
  - For `is_secret: true` values, return masked values like `****...****`
  - Include `key`, `description`, `is_secret`, `updated_at`, `updated_by`
  - Return array of settings

  **Must NOT do**:
  - Do NOT return raw encrypted values for secrets
  - Do NOT include DATABASE_URL or JWT_SECRET

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API implementation, requires DB integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-10)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 1, 2, 4

  **References**:
  - `src/routes/auth.ts` - Existing route pattern
  - `src/db/schema.ts` - Settings table schema
  - `src/utils/encryption.ts` - Masking function

  **Acceptance Criteria**:
  - [ ] Returns 200 with settings array for admin
  - [ ] Secret values are masked
  - [ ] Returns 401 for unauthenticated
  - [ ] Returns 403 for non-admin

  **QA Scenarios**:
  ```
  Scenario: Admin retrieves settings
    Tool: Bash (curl)
    Preconditions: Admin token available, settings exist in DB
    Steps:
      1. curl -X GET -H "Authorization: Bearer {admin_token}" http://localhost:8787/api/v1/admin/settings
    Expected Result: HTTP 200, JSON array with settings, secret values masked
    Failure Indicators: Empty array, unmasked secrets, 401/403
    Evidence: .sisyphus/evidence/task-5-get-settings.txt

  Scenario: Non-admin cannot access
    Tool: Bash (curl)
    Preconditions: Non-admin token available
    Steps:
      1. curl -X GET -H "Authorization: Bearer {non_admin_token}" http://localhost:8787/api/v1/admin/settings
    Expected Result: HTTP 403, {"code": "FORBIDDEN"}
    Failure Indicators: 200
    Evidence: .sisyphus/evidence/task-5-forbidden.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add GET /admin/settings endpoint`
  - Files: `src/routes/admin/settings.ts`

---

- [ ] 6. Settings API - PATCH Endpoint

  **What to do**:
  - Add `PATCH /api/v1/admin/settings` to `src/routes/admin/settings.ts`
  - Accept JSON body: `{ settings: [{ key: string, value: string }] }`
  - For each setting:
    1. Validate key exists
    2. Validate value based on key type (domain format, provider enum, etc.)
    3. If `is_secret: true`, encrypt value before storage
    4. Update database
  - Return updated settings (masked for secrets)

  **Validation Rules**:
  - `ROOT_DOMAIN`: Valid domain format (optional)
  - `STORAGE_PROVIDER`: One of "supabase", "s3", "r2"
  - `SUPABASE_URL`: Valid URL format
  - `STORAGE_BUCKET`: Non-empty string
  - `S3_ENDPOINT`: Valid URL format
  - `S3_PUBLIC_URL`: Valid URL format
  - `S3_REGION`: Non-empty string
  - Secret fields: Non-empty string (encrypted)

  **Must NOT do**:
  - Do NOT allow updating DATABASE_URL or JWT_SECRET
  - Do NOT store unencrypted secrets

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex validation logic, encryption integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7-10)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 1, 2, 4

  **References**:
  - `src/routes/auth.ts` - Existing route validation pattern with arktype
  - `src/utils/encryption.ts` - Encryption function

  **Acceptance Criteria**:
  - [ ] Valid settings are updated and returned
  - [ ] Secret values are encrypted before storage
  - [ ] Invalid values return 400 with validation error
  - [ ] Non-existent keys return 404

  **QA Scenarios**:
  ```
  Scenario: Update non-secret setting
    Tool: Bash (curl)
    Preconditions: Admin token available
    Steps:
      1. curl -X PATCH -H "Authorization: Bearer {admin_token}" -H "Content-Type: application/json" -d '{"settings":[{"key":"ROOT_DOMAIN","value":"example.com"}]}' http://localhost:8787/api/v1/admin/settings
    Expected Result: HTTP 200, updated setting with new value
    Failure Indicators: 400, unchanged value
    Evidence: .sisyphus/evidence/task-6-patch-nonsecret.txt

  Scenario: Update secret setting
    Tool: Bash (curl)
    Preconditions: Admin token available, SETTINGS_ENCRYPTION_KEY set
    Steps:
      1. curl -X PATCH -H "Authorization: Bearer {admin_token}" -H "Content-Type: application/json" -d '{"settings":[{"key":"SUPABASE_SERVICE_ROLE_KEY","value":"new-secret-key"}]}' http://localhost:8787/api/v1/admin/settings
    Expected Result: HTTP 200, value masked in response, encrypted in DB
    Failure Indicators: Value returned unmasked
    Evidence: .sisyphus/evidence/task-6-patch-secret.txt

  Scenario: Invalid value validation
    Tool: Bash (curl)
    Preconditions: Admin token available
    Steps:
      1. curl -X PATCH -H "Authorization: Bearer {admin_token}" -H "Content-Type: application/json" -d '{"settings":[{"key":"STORAGE_PROVIDER","value":"invalid"}]}' http://localhost:8787/api/v1/admin/settings
    Expected Result: HTTP 400, {"code": "...", "message": "validation error"}
    Failure Indicators: 200
    Evidence: .sisyphus/evidence/task-6-validation.txt
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `feat(api): add PATCH /admin/settings endpoint`
  - Files: `src/routes/admin/settings.ts`

---

- [ ] 7. Users API - GET (List)

  **What to do**:
  - Create `src/routes/admin/users.ts`
  - Implement `GET /api/v1/admin/users`
  - Support pagination: `page` (default 1), `limit` (default 20, max 100)
  - Support search: `search` (searches username and email)
  - Support filter: `isAdmin` (boolean)
  - Return users array with pagination metadata
  - Exclude `passwordHash` from response

  **Must NOT do**:
  - Do NOT expose password hashes
  - Do NOT allow unbounded queries (enforce max limit)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex query with pagination and filtering
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-6, 8-10)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 1, 4

  **References**:
  - `src/routes/auth.ts:263-298` - Existing user query pattern
  - `src/db/schema.ts:13-30` - Users table structure

  **Acceptance Criteria**:
  - [ ] Returns paginated users array
  - [ ] Search filters by username and email
  - [ ] isAdmin filter works
  - [ ] passwordHash excluded from response
  - [ ] Max limit enforced

  **QA Scenarios**:
  ```
  Scenario: List users with pagination
    Tool: Bash (curl)
    Preconditions: Admin token available, multiple users exist
    Steps:
      1. curl -X GET -H "Authorization: Bearer {admin_token}" "http://localhost:8787/api/v1/admin/users?page=1&limit=10"
    Expected Result: HTTP 200, JSON with users array and pagination metadata (total, page, limit)
    Failure Indicators: Missing pagination metadata
    Evidence: .sisyphus/evidence/task-7-list-users.txt

  Scenario: Search users
    Tool: Bash (curl)
    Preconditions: Admin token available, users exist
    Steps:
      1. curl -X GET -H "Authorization: Bearer {admin_token}" "http://localhost:8787/api/v1/admin/users?search=test"
    Expected Result: HTTP 200, users matching "test" in username or email
    Failure Indicators: Empty array when matching users exist
    Evidence: .sisyphus/evidence/task-7-search.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add GET /admin/users endpoint`
  - Files: `src/routes/admin/users.ts`

---

- [ ] 8. Users API - GET (Single)

  **What to do**:
  - Add `GET /api/v1/admin/users/:id` to `src/routes/admin/users.ts`
  - Return user details by ID
  - Exclude `passwordHash` from response
  - Return 404 if user not found

  **Must NOT do**:
  - Do NOT expose password hash

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Simple GET route
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-7, 9-10)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 1, 4

  **References**:
  - `src/routes/auth.ts:227-262` - Existing single user query pattern

  **Acceptance Criteria**:
  - [ ] Returns 200 with user details for valid ID
  - [ ] Returns 404 for non-existent user
  - [ ] passwordHash excluded

  **QA Scenarios**:
  ```
  Scenario: Get user by ID
    Tool: Bash (curl)
    Preconditions: Admin token available, user exists
    Steps:
      1. curl -X GET -H "Authorization: Bearer {admin_token}" "http://localhost:8787/api/v1/admin/users/{user_id}"
    Expected Result: HTTP 200, JSON with user details (no passwordHash)
    Failure Indicators: 404, or passwordHash present
    Evidence: .sisyphus/evidence/task-8-get-user.txt

  Scenario: User not found
    Tool: Bash (curl)
    Preconditions: Admin token available
    Steps:
      1. curl -X GET -H "Authorization: Bearer {admin_token}" "http://localhost:8787/api/v1/admin/users/non-existent-id"
    Expected Result: HTTP 404, {"code": "USER_NOT_FOUND"}
    Failure Indicators: 200
    Evidence: .sisyphus/evidence/task-8-notfound.txt
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `feat(api): add GET /admin/users/:id endpoint`
  - Files: `src/routes/admin/users.ts`

---

- [ ] 9. Users API - PATCH (Update)

  **What to do**:
  - Add `PATCH /api/v1/admin/users/:id` to `src/routes/admin/users.ts`
  - Allow updating: `isAdmin`, `displayName`, `bio`, `avatarUrl`, `coverImageUrl`, `banned` (new field)
  - Add `banned` boolean field to `users` table (new column)
  - Protection logic:
    - Cannot ban self
    - Cannot set isAdmin on self
    - When setting `isAdmin: false`, check if this is the last admin (return 403 if so)
  - Return updated user

  **Must NOT do**:
  - Do NOT allow updating `passwordHash`
  - Do NOT allow updating `email` or `username` (security concerns)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex business logic with protection rules
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-8, 10)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 1, 4

  **References**:
  - `src/routes/auth.ts:165-226` - Existing user update pattern
  - `src/db/schema.ts:13-30` - Users table (need to add `banned` column)

  **Acceptance Criteria**:
  - [ ] Can update allowed fields
  - [ ] Cannot ban self (403)
  - [ ] Cannot remove last admin (403)
  - [ ] Returns updated user

  **QA Scenarios**:
  ```
  Scenario: Update user isAdmin
    Tool: Bash (curl)
    Preconditions: Admin token available, target user exists, not last admin
    Steps:
      1. curl -X PATCH -H "Authorization: Bearer {admin_token}" -H "Content-Type: application/json" -d '{"isAdmin":true}' "http://localhost:8787/api/v1/admin/users/{user_id}"
    Expected Result: HTTP 200, user with isAdmin: true
    Failure Indicators: 403, or unchanged
    Evidence: .sisyphus/evidence/task-9-setadmin.txt

  Scenario: Self-ban blocked
    Tool: Bash (curl)
    Preconditions: Admin token available
    Steps:
      1. curl -X PATCH -H "Authorization: Bearer {admin_token}" -H "Content-Type: application/json" -d '{"banned":true}' "http://localhost:8787/api/v1/admin/users/{self_id}"
    Expected Result: HTTP 403, {"code": "SELF_ACTION"}
    Failure Indicators: 200
    Evidence: .sisyphus/evidence/task-9-selfban.txt

  Scenario: Last admin removal blocked
    Tool: Bash (curl)
    Preconditions: Admin token available, only one admin exists
    Steps:
      1. curl -X PATCH -H "Authorization: Bearer {admin_token}" -H "Content-Type: application/json" -d '{"isAdmin":false}' "http://localhost:8787/api/v1/admin/users/{last_admin_id}"
    Expected Result: HTTP 403, {"code": "LAST_ADMIN"}
    Failure Indicators: 200
    Evidence: .sisyphus/evidence/task-9-lastadmin.txt
  ```

  **Commit**: YES (groups with Task 7-8)
  - Message: `feat(api): add PATCH /admin/users/:id endpoint`
  - Files: `src/routes/admin/users.ts`, `src/db/schema.ts`

---

- [ ] 10. Users API - DELETE

  **What to do**:
  - Add `DELETE /api/v1/admin/users/:id` to `src/routes/admin/users.ts`
  - Protection logic:
    - Cannot delete self (403)
    - Cannot delete last admin (403)
  - Delete user and cascade delete their memos and resources
  - Return 204 on success

  **Must NOT do**:
  - Do NOT allow deleting self
  - Do NOT allow deleting last admin

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Destructive operation with protection logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5-9)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 1, 4

  **References**:
  - `src/db/schema.ts:32-86` - Memos and resources have cascade delete

  **Acceptance Criteria**:
  - [ ] Returns 204 on successful deletion
  - [ ] Cannot delete self (403)
  - [ ] Cannot delete last admin (403)
  - [ ] User's memos and resources are cascade deleted

  **QA Scenarios**:
  ```
  Scenario: Delete user
    Tool: Bash (curl)
    Preconditions: Admin token available, target user exists, not last admin, not self
    Steps:
      1. curl -X DELETE -H "Authorization: Bearer {admin_token}" "http://localhost:8787/api/v1/admin/users/{user_id}"
    Expected Result: HTTP 204
    Failure Indicators: 403 or 404
    Evidence: .sisyphus/evidence/task-10-delete.txt

  Scenario: Self-delete blocked
    Tool: Bash (curl)
    Preconditions: Admin token available
    Steps:
      1. curl -X DELETE -H "Authorization: Bearer {admin_token}" "http://localhost:8787/api/v1/admin/users/{self_id}"
    Expected Result: HTTP 403, {"code": "SELF_ACTION"}
    Failure Indicators: 204
    Evidence: .sisyphus/evidence/task-10-selfdelete.txt

  Scenario: Last admin deletion blocked
    Tool: Bash (curl)
    Preconditions: Admin token available, only one admin exists
    Steps:
      1. curl -X DELETE -H "Authorization: Bearer {admin_token}" "http://localhost:8787/api/v1/admin/users/{last_admin_id}"
    Expected Result: HTTP 403, {"code": "LAST_ADMIN"}
    Failure Indicators: 204
    Evidence: .sisyphus/evidence/task-10-lastadmin.txt
  ```

  **Commit**: YES (groups with Task 7-9)
  - Message: `feat(api): add DELETE /admin/users/:id endpoint`
  - Files: `src/routes/admin/users.ts`

---

- [ ] 11. Admin Layout and Sidebar

  **What to do**:
  - Create `apps/web/app/routes/admin.layout.tsx` with sidebar layout
  - Create `apps/web/app/components/admin-sidebar.tsx` with navigation links
  - Navigation items: Dashboard (optional), Settings, Users
  - Add auth guard: Check `localStorage.getItem("token")` and redirect to `/login` if not authenticated
  - Add admin guard: Fetch `/api/v1/auth/me`, check `isAdmin`, redirect to `/` if not admin
  - Use existing `SidebarProvider` pattern from `app-sidebar.tsx`
  - Add `/admin` route in `app/routes.ts`

  **Must NOT do**:
  - Do NOT modify existing layout or sidebar
  - Do NOT add admin check to JWT (check via API)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with layout logic, requires visual verification
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:
  - `apps/web/app/routes/layout.tsx` - Existing layout pattern
  - `apps/web/app/components/app-sidebar.tsx` - Existing sidebar pattern- `apps/web/app/routes.ts` - Route configuration
  - `apps/web/app/hooks/queries/use-user.ts` - User query hook

  **Acceptance Criteria**:
  - [ ] Admin layout renders with sidebar
  - [ ] Non-authenticated users redirect to `/login`
  - [ ] Non-admin users redirect to `/`
    - [ ] Sidebar shows "Settings" and "Users" links

  **QA Scenarios**:
  ```
  Scenario: Admin layout renders
    Tool: Playwright
    Preconditions: Admin user logged in
    Steps:
      1. Navigate to `/admin`
      2. Wait for sidebar to appear
      3. Verify "Settings" and "Users" links visible
    Expected Result: Sidebar visible with navigation links
    Failure Indicators: Blank page, missing links
    Evidence: .sisyphus/evidence/task-11-layout.png

  Scenario: Non-admin redirect
    Tool: Playwright
    Preconditions: Non-admin user logged in
    Steps:
      1. Navigate to `/admin`
      2. Wait for redirect
    Expected Result: Redirected to `/`
    Failure Indicators: Stays on `/admin` page
    Evidence: .sisyphus/evidence/task-11-redirect.png
  ```

  **Commit**: YES
  - Message: `feat(web): add admin layout with sidebar`
  - Files: `apps/web/app/routes/admin.layout.tsx`, `apps/web/app/components/admin-sidebar.tsx`, `apps/web/app/routes.ts`

---

- [ ] 12. Settings Management Page

  **What to do**:
  - Create `apps/web/app/routes/admin.settings.tsx`
  - Display all settings in a table/grid
  - Group settings by category (System, Storage Supabase, Storage S3/R2)
  - Show masked values for secrets (****...****)
  - Edit button opens dialog/form
  - Form with validation based on setting type
  - Call `PATCH /api/v1/admin/settings` on save
  - Show success/error toast using `sonner`
  - Use existing Radix UI components (Card, Dialog, Button, Input, Label)
  - Use `react-hook-form` + `zod` for form validation

  **Must NOT do**:
  - Do NOT show raw secret values
  - Do NOT allow editing DATABASE_URL or JWT_SECRET

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex UI with forms, validation, API integration
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13)
  - **Blocks**: None
  - **Blocked By**: Tasks 5, 6, 11

  **References**:
  - `apps/web/app/routes/settings.tsx` - Existing settings page pattern
  - `apps/web/app/components/ui/` - UI components (card, button, dialog, etc.)
  - `apps/web/app/hooks/queries/use-user.ts` - TanStack Query pattern

  **Acceptance Criteria**:
  - [ ] Settings page displays all settings grouped by category
  - [ ] Secret values show as masked
  - [ ] Edit form validates input
  - [ ] Save calls API and shows success/error toast
  - [ ] Updated values reflect in UI

  **QA Scenarios**:
  ```
  Scenario: View settings
    Tool: Playwright
    Preconditions: Admin logged in
    Steps:
      1. Navigate to `/admin/settings`
      2. Wait for settings table to load
      3. Verify settings displayed with categories
    Expected Result: Settings grouped by category, secrets masked
    Failure Indicators: Empty page, unmasked secrets
    Evidence: .sisyphus/evidence/task-12-view.png

  Scenario: Edit setting
    Tool: Playwright
    Preconditions: Admin logged in
    Steps:
      1. Navigate to `/admin/settings`
      2. Click edit button for ROOT_DOMAIN
      3. Enter "new-domain.com" in input
      4. Click save button
      5. Wait for success toast
    Expected Result: Toast shows "Settings updated", value updated in table
    Failure Indicators: Error toast, value not updated
    Evidence: .sisyphus/evidence/task-12-edit.png

  Scenario: Validation error
    Tool: Playwright
    Preconditions: Admin logged in
    Steps:
      1. Navigate to `/admin/settings`
      2. Click edit button for STORAGE_PROVIDER
      3. Enter "invalid-provider" in input
      4. Click save button
    Expected Result: Form shows validation error, no API call
    Failure Indicators: API call made, error toast
    Evidence: .sisyphus/evidence/task-12-validation.png
  ```

  **Commit**: YES
  - Message: `feat(web): add admin settings management page`
  - Files: `apps/web/app/routes/admin.settings.tsx`

---

- [ ] 13. Users Management Page

  **What to do**:
  - Create `apps/web/app/routes/admin.users.tsx`
  - Display users table with columns: username, email, isAdmin, createdAt, status (banned), actions
  - Add search input (debounced)
  - Add "Admin" filter toggle
  - Add pagination controls
  - Actions: View details, Edit user (dialog), Ban/Enable toggle, Delete (with confirmation)
  - Edit dialog allows changing: isAdmin, displayName, bio, avatarUrl, coverImageUrl
  - Ban toggle shows confirmation dialog
  - Delete shows danger confirmation dialog with "DELETE" typing requirement
  - Use TanStack Query for data fetching
  - Use `sonner` for toasts

  **Must NOT do**:
  - Do NOT allow editing email or username
  - Do NOT show password hash
  - Do NOT allow self-ban, self-delete, last-admin actions

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex UI with table, search, pagination, dialogs
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12)
  - **Blocks**: None
  - **Blocked By**: Tasks 7-10, 11

  **References**:
  - `apps/web/app/routes/profile.tsx` - User profile page pattern
  - `apps/web/app/routes/user.$username.tsx` - User display pattern
  - `apps/web/app/components/ui/` - UI components
  - `apps/web/app/hooks/queries/use-user.ts` - TanStack Query pattern

  **Acceptance Criteria**:
  - [ ] Users table displays with pagination
    - [ ] Search filters users
    - [ ] Admin filter works
    - [ ] Edit dialog updates user
    - [ ] Ban/Enable toggle works
    - [ ] Delete with confirmation works
    - [ ] Self-action buttons disabled

  **QA Scenarios**:
  ```
  Scenario: View users list
    Tool: Playwright
    Preconditions: Admin logged in, multiple users exist
    Steps:
      1. Navigate to `/admin/users`
      2. Wait for users table to load
      3. Verify columns: username, email, isAdmin, status, actions
    Expected Result: Users displayed in table
    Failure Indicators: Empty table, missing columns
    Evidence: .sisyphus/evidence/task-13-users.png

  Scenario: Search users
    Tool: Playwright
    Preconditions: Admin logged in
    Steps:
      1. Navigate to `/admin/users`
      2. Type "test" in search input
      3. Wait for table to update
    Expected Result: Table shows only users matching "test"
    Failure Indicators: All users still shown
    Evidence: .sisyphus/evidence/task-13-search.png

  Scenario: Set user as admin
    Tool: Playwright
    Preconditions: Admin logged in, target user exists, not last admin
    Steps:
      1. Navigate to `/admin/users`
      2. Click edit button for a user
      3. Toggle "Admin" checkbox
      4. Click save button
      5. Wait for success toast
    Expected Result: User's isAdmin field updated, toast shows success
    Failure Indicators: Error toast, field not updated
    Evidence: .sisyphus/evidence/task-13-setadmin.png

  Scenario: Ban user
    Tool: Playwright
    Preconditions: Admin logged in, target user exists, not self
    Steps:
      1. Navigate to `/admin/users`
      2. Click ban toggle for a user
      3. Confirm in dialog
      4. Wait for success toast
    Expected Result: User status changes to "banned"
    Failure Indicators: Error toast, status unchanged
    Evidence: .sisyphus/evidence/task-13-ban.png

  Scenario: Self-ban disabled
    Tool: Playwright
    Preconditions: Admin logged in
    Steps:
      1. Navigate to `/admin/users`
      2. Find own user row
      3. Verify ban button is disabled
    Expected Result: Ban button disabled for own user
    Failure Indicators: Ban button enabled
    Evidence: .sisyphus/evidence/task-13-selfban.png
  ```

  **Commit**: YES
  - Message: `feat(web): add admin users management page`
  - Files: `apps/web/app/routes/admin.users.tsx`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `bun run typecheck`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (settings + users). Test edge cases: non-admin access, self-actions, last-admin protection. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `feat(db): add settings table for admin configuration` — schema.ts
- **2**: `feat(utils): add AES-GCM encryption utility` — encryption.ts
- **3**: `feat(code): add AdminCode error codes` — code.ts
- **4**: `feat(middleware): add admin authorization middleware` — admin.ts
- **5-6**: `feat(api): add admin settings API endpoints` — admin/settings.ts
- **7-10**: `feat(api): add admin users API endpoints` — admin/users.ts, schema.ts (add banned field)
- **11**: `feat(web): add admin layout with sidebar` — admin.layout.tsx, admin-sidebar.tsx, routes.ts
- **12**: `feat(web): add admin settings management page` — admin.settings.tsx
- **13**: `feat(web): add admin users management page` — admin.users.tsx

---

## Success Criteria

### Verification Commands
```bash
# Backend API verification
curl -X GET -H "Authorization: Bearer {admin_token}" http://localhost:8787/api/v1/admin/settings
curl -X PATCH -H "Authorization: Bearer {admin_token}" -H "Content-Type: application/json" -d '{"settings":[{"key":"ROOT_DOMAIN","value":"new.com"}]}' http://localhost:8787/api/v1/admin/settings
curl -X GET -H "Authorization: Bearer {admin_token}" "http://localhost:8787/api/v1/admin/users?page=1&limit=10"

# Frontend verification
npx playwright test --project=chromium apps/web/tests/admin.spec.ts
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Admin middleware returns 401/403 correctly
- [ ] Settings API encrypts secrets
- [ ] Users API enforces self-protection rules
- [ ] Frontend pages render and function correctly