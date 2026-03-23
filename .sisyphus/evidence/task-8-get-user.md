# Task 8: Users API - GET (Single) - Evidence

## Test Results

### Get existing user
```bash
curl -X GET -H "Authorization: Bearer {admin_token}" \
  "http://localhost:8787/api/v1/admin/users/019b5544-2b04-7b05-939c-1925f458cf63"
```

**Response (HTTP 200):**
```json
{
  "data": {
    "id": "019b5544-2b04-7b05-939c-1925f458cf63",
    "email": "zdc666nb@gmail.com",
    "username": "roitium",
    "displayName": "roitium",
    "avatarUrl": "https://www.gravatar.com/avatar/7d2825bf66364f74fa959883de7652549e1e9641d1cb38448ad1d8176910b637?s=200&d=identicon",
    "coverImageUrl": "https://pbs.twimg.com/profile_banners/1319578357395156993/1769870966/1500x500",
    "bio": "ciallo！",
    "isAdmin": false,
    "banned": false,
    "createdAt": "2025-12-25 11:28:09.48744+00",
    "updatedAt": "2026-03-23 03:24:23.925477+00"
  },
  "error": null,
  "traceId": "019d1915-68bd-72ae-966a-910c308f13dd",
  "code": 0,
  "timestamp": 1774242327554
}
```

**Verification:**
- [x] Returns 200 with user details
- [x] passwordHash is NOT included in response
- [x] All user fields are returned (id, email, username, displayName, avatarUrl, coverImageUrl, bio, isAdmin, banned, createdAt, updatedAt)

---

### Get non-existent user
```bash
curl -X GET -H "Authorization: Bearer {admin_token}" \
  "http://localhost:8787/api/v1/admin/users/019d1915-0000-7000-8000-000000000000"
```

**Response (HTTP 404):**
```json
{
  "data": null,
  "error": "用户不存在",
  "traceId": "019d1915-c2a7-7329-bbf8-dfe89bdf3d5b",
  "code": 60002,
  "timestamp": 1774242350528
}
```

**Verification:**
- [x] Returns HTTP 404 status code
- [x] Returns code 60002 (AdminCode.UserNotFound)
- [x] Returns error message "用户不存在" (User does not exist)

---

## Summary

All acceptance criteria met:
- [x] GET /:id endpoint returns user details
- [x] Returns 404 for non-existent user
- [x] passwordHash excluded from response
