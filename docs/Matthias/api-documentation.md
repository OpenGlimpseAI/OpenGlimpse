# API Documentation — Matthias (Login & Participant Creation)

Base URL: `http://<host>:3001` (dev default port 3001; frontend proxies `/` and `/sync` to this server via Vite).

- Auth: most endpoints accept `Authorization: Bearer <token>`. Tokens are base64 of `<userId>:<role>` (issued by `POST /api/auth/login`).
- All JSON. Request body limit: 10 MB.
- Response envelope errors: `404 Not Found` → `{ "error": "..." }`, `500` → `{ "error": "...", "detail": "..." }` (unhandled error handler) or just `{ "error": "..." }`.

**Error code reference used across the API:**

| Code | Meaning |
|------|---------|
| 400 | Bad request (missing/invalid fields, validation failure) |
| 401 | Authentication required / invalid token / invalid credentials |
| 403 | Staff/role access required or forbidden operation |
| 404 | Resource not found |
| 429 | Rate limit exceeded (login: 10/min/IP, `/sync`: 60/min/IP) |
| 500 | Internal server error |

---

## Auth — `/api/auth` (`authRoutes.js`)

### POST `/api/auth` — Create user account (staff only)

- **Auth:** `Bearer <token>` (staff)
- **Body:**
  ```json
  { "name": "Jane Tan", "email": "jane@example.com", "password": "secret123", "role": "participant" }
  ```
- **Success (201):**
  ```json
  { "id": "uuid", "name": "Jane Tan", "email": "jane@example.com", "role": "participant" }
  ```
- **Errors:** 400 (missing name/email/password; email already in use), 401, 403, 500
- Sync-equivalent via `POST /sync` with op `POST /api/auth`, which also accepts `faceImage` (base64) to store primary face embeddings.

### POST `/api/auth/login` — Login (public, rate limited 10/min/IP)
- **Body:**
  ```json
  { "email": "jane@example.com", "password": "secret123" }
  ```
- **Success (200):**
  ```json
  { "id": "uuid", "name": "Jane Tan", "email": "jane@example.com", "role": "participant", "photoUrl": null, "token": "base64-id:role" }
  ```
- **Errors:** 400 (missing fields), 401 (invalid credentials), 429 (rate limit)

### GET `/api/auth/all` — List all users (staff only)
- **Success (200):**
  ```json
  [ { "id": "uuid", "name": "Jane Tan", "email": "jane@example.com", "role": "participant", "photoUrl": null } ]
  ```
- **Errors:** 401, 403, 500

### PATCH `/api/auth` — Update own account (or others if staff)
- **Body (all optional):**
  ```json
  { "targetId": "uuid", "name": "Jane", "email": "j2@example.com", "password": "newpass", "role": "staff" }
  ```
- **Success (200):** `{ "id", "name", "email", "role" }`
- **Errors:** 401, 403 (non-staff cannot update another account or change role), 404 (account not found), 500

### DELETE `/api/auth` — Delete an account (staff only, or self)
- **Body:** `{ "targetId": "uuid" }` (optional; defaults to self)
- **Success:** 204, no body. Cascades: deletes face embeddings for the user.
- **Errors:** 401, 403, 404, 500

---

## 2. Users

### GET `/users` — List all users (id, English name, Chinese name)
- **Success (200):**
  ```json
  [ { "id": "uuid", "enName": "Jane Tan", "zhName": null } ]
  ```
- **Errors:** 500

---

