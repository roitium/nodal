# Admin Panel Learnings

## Error Code Pattern (code.ts)
- Numeric codes in ranges: MemoCode (20xxx), UserCode (30xxx), AuthCode (40xxx), ResourceCode (50xxx), AdminCode (60xxx), GeneralCode (0, 10xxx, 50000)
- Export as `const` object with `as const` pattern (existing code doesn't use `as const`, but it's a valid pattern)
- Comments with HTTP status codes are helpful for API consumers

## Typecheck Notes
- Pre-existing type errors in memos.ts and resources.ts (Env type mismatch) - unrelated to code.ts additions
- New enum additions follow existing pattern without issues

## Encryption Utility (Wave 1)
- Created `apps/backend-hono/src/utils/encryption.ts`
- Uses AES-GCM with PBKDF2 key derivation (same pattern as password.ts)
- Format: `aesgcm$100000$<base64(salt + iv + ciphertext)>`
- mask() shows first 4 + last 4 chars if > 12, else all asterisks
- isEncryptionKeySet() checks SETTINGS_ENCRYPTION_KEY in Env

## Settings API (Wave 2)
- Created `apps/backend-hono/src/routes/admin/settings.ts`
- GET /api/v1/admin/settings returns all settings with masked secrets
- Uses adminMiddleware for authorization (401/403 responses)
- Response uses snake_case for frontend consistency (is_secret, updated_at, updated_by)
- Settings ordered by key ascending
- Route registered in src/index.ts with .route("/api/v1/admin/settings", adminSettingsRoutes)

## Task 8: Users API - GET (Single) - Implementation Patterns

### Date: 2026-03-23

### Successful Approaches

1. **User Query Pattern with passwordHash Exclusion**
   ```typescript
   const user = await db.query.users.findFirst({
     where: eq(users.id, id),
     columns: {
       passwordHash: false,
     },
   });
   ```
   - Use `columns: { passwordHash: false }` to explicitly exclude sensitive fields
   - Query by UUID using `eq(users.id, id)`

2. **404 Error Handling with AdminCode**
   ```typescript
   if (!user) {
     return c.json(
       fail({
         message: "用户不存在",
         code: AdminCode.UserNotFound,  // 60002
         traceId,
       }),
       404
     );
   }
   ```
   - Always return proper HTTP 404 status code
   - Use AdminCode.UserNotFound (60002) for consistency
   - Include traceId for debugging

3. **Route Chaining in Hono**
   ```typescript
   export const adminUsersRoutes = new Hono<{ Bindings: Env }>()
     .use(adminMiddleware)
     .get("/", async (c) => { ... })
     .get("/:id", async (c) => { ... });
   ```
   - Chain multiple `.get()` calls for different routes
   - adminMiddleware applies to all routes in the chain

### Key Findings

- The `banned` column was added to users table as part of this wave of changes
- UUID validation is handled by PostgreSQL - invalid UUID format returns 500, valid format but non-existent returns 404
- Drizzle ORM's `findFirst` returns `undefined` when no match found (not null)


## Task 7: Users API - GET (List) - Learnings

### Implementation Patterns
- **Pagination**: Use `Math.max(1, page)` for min bound and `Math.min(100, limit)` for max bound to enforce limits
- **Case-insensitive search**: Use `ilike` from drizzle-orm for PostgreSQL (handles case-insensitivity natively)
- **Dynamic WHERE clause**: Build conditions array and use `and(...conditions)` when conditions exist
- **passwordHash exclusion**: Use `columns: { passwordHash: false }` in findMany query options
- **Pagination response**: Nest pagination metadata inside `data` object to match `success()` function signature

### SQL Pattern for Count with Dynamic WHERE
```typescript
const totalResult = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(users)
  .where(whereClause);
const total = totalResult[0]?.count ?? 0;
```

### Route Registration Pattern
```typescript
// In index.ts
import { adminUsersRoutes } from "@/routes/admin/users";

const route = app
  .route("/api/v1/admin/settings", adminSettingsRoutes)
  .route("/api/v1/admin/users", adminUsersRoutes);
```

### Query Parameter Handling
- Use `c.req.query()` to get all query params as an object
- Parse integers with `Number.parseInt(value ?? default, 10)`
- Trim search strings with `?.trim()` to handle empty searches
- Handle boolean strings by checking for `"true"` or `"1"`


## Task 12: Users API - PATCH (Update) - Implementation

### Date: 2026-03-23

### Schema Changes
- Added `banned` boolean field to users table in schema.ts:
  ```typescript
  banned: boolean("banned").default(false),
  ```

### PATCH Endpoint Implementation

**Validation Schema (arktype):**
```typescript
const patchUserBody = type({
  "isAdmin?": "boolean",
  "banned?": "boolean",
  "displayName?": "string",
  "bio?": "string",
  "avatarUrl?": "string",
  "coverImageUrl?": "string",
});
```

**Protection Logic:**

1. **Self-action Protection**
   - Cannot ban self (`body.banned === true`)
   - Cannot change own isAdmin status (`body.isAdmin !== undefined`)
   - Returns 403 with `AdminCode.SelfAction` (60005)
   - Uses optional chaining: `currentUser?.id` for null safety

2. **Last-admin Protection**
   - Only triggers when setting `isAdmin: false`
   - First checks if target user is currently admin
   - Counts total admins: `select count(*) from users where is_admin = true`
   - Returns 403 with `AdminCode.LastAdmin` (60004) if `adminCount <= 1`

**Update Pattern:**
```typescript
await db
  .update(users)
  .set({ ...body, updatedAt: sql`now()` })
  .where(eq(users.id, id));
```
- Uses spread to apply all validated body fields
- `updatedAt` manually set via SQL `now()`

**Response:**
- Returns 200 with updated user (passwordHash excluded)
- Uses existing `success()` wrapper pattern

### Key Findings

- Optional chaining (`currentUser?.id`) handles null user without explicit check
- Raw SQL count query used instead of `db.$count()` (not available in this Drizzle version)
- Body spread operator safely applies only validated fields
- `arktypeValidator` automatically validates and returns 400 for invalid input


## Task 10: Users API - DELETE

### Implementation Summary
Added DELETE /api/v1/admin/users/:id endpoint with the following protections:

1. **Self-delete protection**: Returns 403 with AdminCode.SelfAction (60005) if user tries to delete themselves
2. **Last-admin protection**: Returns 403 with AdminCode.LastAdmin (60004) if trying to delete the last admin
3. **Cascade delete**: User's memos and resources are automatically deleted via database cascade

### Code Pattern Used
```typescript
.delete("/:id", async (c) => {
  const db = c.get("db");
  const currentUser = c.get("user");
  const id = c.req.param("id");
  const traceId = c.get("traceId");

  if (id === currentUser?.id) {
    return c.json(fail({ message: "不能删除自己", code: AdminCode.SelfAction, traceId }), 403);
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { isAdmin: true },
  });

  if (targetUser?.isAdmin) {
    const adminCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.isAdmin, true));
    const adminCount = adminCountResult[0]?.count ?? 0;
    if (adminCount <= 1) {
      return c.json(fail({ message: "不能删除最后一个管理员", code: AdminCode.LastAdmin, traceId }), 403);
    }
  }

  await db.delete(users).where(eq(users.id, id));
  return c.body(null, 204);
});
```

### QA Test Results
- Self-delete blocked: ✅ 403 with code 60005 (SELF_ACTION)
- Delete non-admin user: ✅ 204 No Content
- User actually deleted: ✅ Verified by listing users
- Last-admin protection: ✅ Implemented (would trigger if deleting another admin when only one left)

### Key Implementation Details
- Uses optional chaining (`currentUser?.id`) to handle potential null user
- Admin count query uses raw SQL via `sql<number>`\`count(*)::int\`` for accurate counting
- Returns 204 with empty body on success (standard DELETE response)
- Error codes match AdminCode enum: 60004 (LAST_ADMIN), 60005 (SELF_ACTION)


## Task 11: Admin Layout and Sidebar - Implementation

### Date: 2026-03-23

### Files Created
1. `apps/web/app/components/admin-sidebar.tsx` - Admin sidebar navigation component
2. `apps/web/app/routes/admin.layout.tsx` - Admin layout with auth/admin guards
3. `apps/web/app/routes/admin.index.tsx` - Admin dashboard placeholder
4. `apps/web/app/routes/admin.settings.tsx` - Admin settings placeholder
5. `apps/web/app/routes/admin.users.tsx` - Admin users placeholder

### Files Modified
- `apps/web/app/routes.ts` - Added admin routes

### Design System Patterns Used

1. **Sidebar Component Pattern**
   - Uses `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarHeader`, `SidebarFooter`
   - Follows existing `app-sidebar.tsx` structure exactly
   - Uses Tailwind CSS classes: `bg-transparent`, `surface-card`, `interactive-lift`, `border-sidebar-border`
   - Mobile-responsive via `useSidebar()` hook's `isMobile` and `setOpenMobile`

2. **Navigation Items**
   - Dashboard (`/admin`) - LayoutDashboard icon
   - Settings (`/admin/settings`) - Settings icon
   - Users (`/admin/users`) - Users icon
   - Uses `isActive` pattern from existing sidebar for active state

3. **Auth Guard Pattern**
   ```typescript
   const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
   
   const { data: user, isLoading, error } = useQuery({
     queryKey: ["user", "me"],
     queryFn: async () => { ... },
     enabled: hasToken,
     staleTime: 1000 * 60 * 5,
     retry: false,
   });
   ```

4. **Admin Guard Pattern**
   - Check `user.isAdmin` after successful user fetch
   - Redirect to `/` if not admin
   - Redirect to `/login` if not authenticated

5. **Loading State**
   - Spinner with `animate-spin` class
   - Centered flex layout with `h-screen items-center justify-center`

### Route Configuration
```typescript
layout("routes/admin.layout.tsx", [
  route("admin", "routes/admin.index.tsx"),
  route("admin/settings", "routes/admin.settings.tsx"),
  route("admin/users", "routes/admin.users.tsx"),
]),
```

### Key Findings
- React Router 7 uses `layout()` for nested layouts with `Outlet`
- `useUser()` hook from `~/hooks/queries/use-user` provides user data via TanStack Query
- Sidebar uses Sheet component for mobile (from Radix UI)
- Pre-existing TypeScript errors in codebase (memo-card.tsx, resources.tsx) - unrelated to admin implementation

## Task 12: Settings Management Page - Implementation

### Date: 2026-03-23

### Key Implementation Decisions

1. **Form Validation Approach**
   - Used manual validation with `validateValue()` function instead of react-hook-form + zod
   - This avoids TypeScript type inference issues with dynamic schemas
   - Validation rules match backend API validation exactly

2. **Settings Grouping**
   - Three groups: System, Storage (Supabase), Storage (S3/R2)
   - Each group displayed in a Card component
   - Settings within each group shown with key, value (masked for secrets), description, and last updated

3. **Secret Handling**
   - Secret values are masked by the backend (****...****)
   - Edit dialog uses password input type for secrets
   - Users enter new value to update (can't see current value)

4. **Immutable Settings**
   - DATABASE_URL and JWT_SECRET are marked as immutable
   - Edit button is disabled for these settings
   - Backend also rejects updates to these settings

5. **UI Components Used**
   - Card, CardHeader, CardTitle, CardDescription, CardContent for grouping
   - Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter for edit form
   - Button, Input, Label for form elements
   - Toast (sonner) for success/error notifications

6. **TanStack Query Pattern**
   - useQuery for fetching settings with queryKey ["admin-settings"]
   - useMutation for updating settings
   - invalidateQueries on success to refresh data

7. **Error Handling**
   - Loading state shows spinner
   - Error state shows error message with retry button
   - Validation errors shown inline in form
   - API errors shown as toast notifications

### Files Modified
- `apps/web/app/routes/admin.settings.tsx` - Full implementation of settings management page
- `apps/web/app/routes.ts` - Already had admin routes configured

### Pre-existing TypeScript Errors
- The project has pre-existing TypeScript errors in:
  - `apps/backend-hono/src/routes/memos.ts` - Env type mismatch
  - `apps/backend-hono/src/routes/resources.ts` - Env type mismatch
  - `apps/web/app/components/memo-card.tsx` - Missing externalLink property
  - `apps/web/app/components/memo-composer.tsx` - Missing externalLink property
  - `apps/web/app/routes/resources.tsx` - Missing memoId property
- These are unrelated to the admin settings implementation
