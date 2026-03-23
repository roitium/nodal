# Task 6: Settings API - PATCH Endpoint

## Implementation Summary

Added PATCH endpoint to `/api/v1/admin/settings` for updating application settings with:
- Per-setting validation based on key type
- AES-GCM encryption for secret values
- updated_at and updated_by tracking
- Masked secret values in responses

## Files Modified

1. `apps/backend-hono/src/routes/admin/settings.ts` - Added PATCH endpoint
2. `apps/backend-hono/src/types/env.ts` - Added SETTINGS_ENCRYPTION_KEY to Env type
3. `apps/backend-hono/.dev.vars` - Added SETTINGS_ENCRYPTION_KEY for testing

## Validation Rules Implemented

| Key | Validation |
|-----|------------|
| ROOT_DOMAIN | Valid domain format (optional, can be empty) |
| STORAGE_PROVIDER | One of: "supabase", "s3", "r2" |
| SUPABASE_URL | Valid URL format (if not empty) |
| STORAGE_BUCKET | Non-empty string |
| S3_ENDPOINT | Valid URL format (if not empty) |
| S3_PUBLIC_URL | Valid URL format (if not empty) |
| S3_REGION | Non-empty string |
| Secret fields | Non-empty string (encrypted) |

## QA Test Results

### Test 1: Update non-secret setting
- **Endpoint**: PATCH /api/v1/admin/settings
- **Request**: `{ "settings": [{ "key": "ROOT_DOMAIN", "value": "new-domain.com" }] }`
- **Result**: HTTP 200, setting updated with updated_at and updated_by
- **Status**: PASS

### Test 2: Update secret setting
- **Endpoint**: PATCH /api/v1/admin/settings
- **Request**: `{ "settings": [{ "key": "SUPABASE_SERVICE_ROLE_KEY", "value": "new-secret-key-12345" }] }`
- **Result**: HTTP 200, value encrypted in DB (aesgcm$...), masked in response (aesg****PA==)
- **Status**: PASS

### Test 3: Invalid validation
- **Endpoint**: PATCH /api/v1/admin/settings
- **Request**: `{ "settings": [{ "key": "STORAGE_PROVIDER", "value": "invalid" }] }`
- **Result**: HTTP 400, error: "STORAGE_PROVIDER must be one of: supabase, s3, r2"
- **Status**: PASS

### Test 4: Non-existent key
- **Endpoint**: PATCH /api/v1/admin/settings
- **Request**: `{ "settings": [{ "key": "NONEXISTENT_KEY", "value": "value" }] }`
- **Result**: HTTP 404, error code: 60003 (SettingNotFound)
- **Status**: PASS

### Test 5: Immutable setting (DATABASE_URL)
- **Endpoint**: PATCH /api/v1/admin/settings
- **Request**: `{ "settings": [{ "key": "DATABASE_URL", "value": "new-url" }] }`
- **Result**: HTTP 404, error: "Cannot update immutable setting: DATABASE_URL"
- **Status**: PASS

### Test 6: Empty STORAGE_BUCKET
- **Endpoint**: PATCH /api/v1/admin/settings
- **Request**: `{ "settings": [{ "key": "STORAGE_BUCKET", "value": "" }] }`
- **Result**: HTTP 400, error: "STORAGE_BUCKET cannot be empty"
- **Status**: PASS

### Test 7: Invalid URL for SUPABASE_URL
- **Endpoint**: PATCH /api/v1/admin/settings
- **Request**: `{ "settings": [{ "key": "SUPABASE_URL", "value": "not-a-valid-url" }] }`
- **Result**: HTTP 400, error: "Invalid URL format for SUPABASE_URL"
- **Status**: PASS

### Test 8: Valid URL update
- **Endpoint**: PATCH /api/v1/admin/settings
- **Request**: `{ "settings": [{ "key": "SUPABASE_URL", "value": "https://example.supabase.co" }] }`
- **Result**: HTTP 200, value updated successfully
- **Status**: PASS

### Test 9: Valid STORAGE_PROVIDER update
- **Endpoint**: PATCH /api/v1/admin/settings
- **Request**: `{ "settings": [{ "key": "STORAGE_PROVIDER", "value": "s3" }] }`
- **Result**: HTTP 200, value updated to "s3"
- **Status**: PASS

## Key Implementation Notes

1. **Arktype Validation**: Used `@hono/arktype-validator` for request body validation, following existing patterns in auth.ts
2. **Encryption Flow**: Secret values are encrypted with AES-GCM using SETTINGS_ENCRYPTION_KEY before storage
3. **Immutable Settings**: DATABASE_URL and JWT_SECRET cannot be updated via API (404 response)
4. **Error Codes**: Used AdminCode.SettingNotFound (60003) and GeneralCode.InternalError (50000)
5. **Response Format**: All responses follow the standard `{ data, error, traceId, code, timestamp }` format

## Evidence Files

- `.sisyphus/evidence/task-6-patch-nonsecret.txt`
- `.sisyphus/evidence/task-6-patch-secret.txt`
- `.sisyphus/evidence/task-6-validation.txt`
- `.sisyphus/evidence/task-6-notfound.txt`

## Dependencies

- Requires SETTINGS_ENCRYPTION_KEY environment variable for secret encryption
- Uses existing `encrypt()` and `mask()` functions from `src/utils/encryption.ts`
- Uses existing `AdminCode` from `src/utils/code.ts`
