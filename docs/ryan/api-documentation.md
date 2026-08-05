# API Documentation — OpenGlimpse Express Backend

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
- **Success (204):** no body. Cascades: deletes face embeddings for the user.
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

## 3. Programmes — `/programmes`

### GET `/programmes` — List programmes with live counts
- **Success (200):**
  ```json
  [ { "id": "uuid", "name": "SCCCI China Trip", "startDate": "2026-08-01", "endDate": "2026-08-07", "status": "active", "totalDelegates": 30, "checkedIn": 14 } ]
  ```
- **Errors:** 500

### POST `/programmes` — Create programme
- **Body:** `{ "name": "SCCCI China Trip", "startDate": "2026-08-01", "endDate": "2026-08-07" }`
- **Success (201):** `{ "id", "name", "startDate", "endDate", "status": "draft" }`
- **Errors:** 400 (name/startDate/endDate required), 500

### PUT `/programmes/:id` — Update programme and/or manage delegate list
- **Body:** `{ "name", "startDate", "endDate", "addDelegateIds": ["uuid"], "removeDelegateIds": ["uuid"] }`
- **Success (200):** programme object + `totalDelegates`, `checkedIn`
- **Errors:** 404, 500

### DELETE `/programmes/:id` — Delete programme
- **Success (204).** **Errors:** 404, 500

---

## 4. Routes — `/programmes/:id/routes`

### GET `/programmes/:id/routes?archived=true|false` — List routes
- **Success (200):**
  ```json
  [ { "id": "uuid", "programmeId": "uuid", "name": "Coach 1", "archived": false, "delegateCount": 15, "checkedIn": 8, "ready": false } ]
  ```
- **Errors:** 500

### GET `/programmes/:id/routes/:routeId` — Get one route
- **Success (200):** route object incl. `delegateCount`, `checkedIn`, `ready`
- **Errors:** 404, 500

### POST `/programmes/:id/routes` — Add route
- **Body:** `{ "name": "Coach 1" }`
- **Success (201):** `{ "id", "programmeId", "name", "delegateCount": 0, "checkedIn": 0 }`
- **Errors:** 400 (name required), 404 (programme not found), 500

### PUT `/programmes/:id/routes/:routeId` — Rename route / reassign delegates
- **Body:** `{ "name", "addDelegateIds": ["uuid"], "removeDelegateIds": ["uuid"] }`
- **Note:** a delegate can only belong to one route — adding a delegate removes it from any other route.
- **Success (200):** `{ "id", "programmeId", "name", "delegateCount", "checkedIn" }`
- **Errors:** 404, 500

### PUT `/programmes/:id/routes/:routeId/archive` — Archive route
- **Success (200):** `{ "id", "programmeId", "name", "archived": true, "delegateCount", "checkedIn" }`
- **Errors:** 404, 500

### PUT `/programmes/:id/routes/:routeId/restore` — Restore archived route
- **Success (200):** `{ "id", "programmeId", "name", "archived": false }`
- **Errors:** 404, 500

### DELETE `/programmes/:id/routes/:routeId` — Delete route
- **Success (204).** **Errors:** 404, 500

---

## 5. Delegates — `/programmes/:id/delegates`, `/delegates`

### GET `/programmes/:id/delegates` — List programme delegates with attendance + routes
- **Success (200):**
  ```json
  [ { "id": "uuid", "name": "Ah Ming", "badge": "A001", "userId": "uuid", "routeId": "uuid", "routeName": "Coach 1", "routeIds": ["uuid"], "routeNames": ["Coach 1"], "status": "absent", "method": null, "checkedInAt": null, "notes": "" } ]
  ```
- **Errors:** 500

### POST `/programmes/:id/delegates` — Add delegates to programme
- **Body options:**
  ```json
  { "delegates": [ { "name": "Ah Ming", "badge": "A001" } ] }
  // or { "delegateIds": ["uuid"] }
  // or { "delegateId": "uuid" }
  // or { "name": "Ah Ming", "badge": "A001", "routeId": "uuid" }
  // or { "userIds": ["uuid"], "routeId": "uuid" }   (link existing user accounts)
  ```
- **Success (201):** `{ "added": [ { "delegateId": "uuid", "name": "Ah Ming" } ] }`
- **Errors:** 400 (invalid body), 404 (programme not found), 500

### PATCH `/delegates/:delegateId` — Update delegate (link to user account)
- **Body:** `{ "userId": "uuid" }`
- **Success (200):** `{ "id", "name", "userId" }`
- **Errors:** 400 (user not found), 404, 500

### DELETE `/programmes/:id/delegates/:delegateId` — Remove delegate from programme
- **Note:** also deletes the delegate's attendance records and route memberships.
- **Success (204).** **Errors:** 404, 500

### PUT `/programmes/:id/delegates/:delegateId/routes` — Set delegate's route (max 1)
- **Body:** `{ "routeIds": ["uuid"] }` (empty array removes assignment)
- **Success (200):** `{ "delegateId", "routeIds": ["uuid"], "routeNames": ["Coach 1"] }`
- **Errors:** 400 (not an array / more than one route / invalid route), 500

### GET `/programmes/:id/delegates/:delegateId/routes` — Get delegate's routes
- **Success (200):** `{ "delegateId", "routeIds": [], "routeNames": [] }`
- **Errors:** 500

---

## 6. Attendance — `/programmes/:id/attendance`

### GET `/programmes/:id/attendance` — Get present, missing, unidentified
- **Success (200):**
  ```json
  { "present": [ { "delegateId", "name", "routeId", "routeName", "routeIds", "routeNames", "method", "checkedInAt", "notes" } ],
    "missing": [ { "delegateId", "name", "routeId", "routeName", "routeIds", "routeNames", "notes" } ],
    "unidentified": [ { "scanId": "uuid", "scannedAt": "..." } ] }
  ```
- **Errors:** 500

### POST `/programmes/:id/attendance` — Batch mark attendance
- **Body:**
  ```json
  { "programmeId": "uuid", "records": [ { "delegateId": "uuid", "status": "present", "method": "manual", "notes": "" } ] }
  ```
- **Success (200/201):** `{ "success": [ { "programmeId", "delegateId", "name", "status", "method", "checkedInAt" } ], "errors": [] }` (201 if all succeed, 200 if partial, 400 if all fail)
- **Errors:** 400 (records not a non-empty array), 500

### PUT `/programmes/:id/attendance/:delegateId` — Mark one delegate
- **Body:** `{ "status": "present", "method": "auto", "notes": "" }` (`method` ∈ `auto|manual|qr`, required when present)
- **Success (200):**
  ```json
  { "programmeId", "delegateId", "name", "status": "present", "method": "auto", "checkedInAt": "..." }
  ```
- **Errors:** 400 (bad status, missing method, delegate not in programme), 500
- **Side effects:** emits `attendance:updated` to the `programme:<id>` room; when marking present, clears unverified ScanEvents for the programme.

### GET `/programmes/:id/attendance/summary` — Summary + per-route breakdown
- **Success (200):**
  ```json
  { "total": 30, "checkedIn": 14, "missing": 16, "unidentified": 2,
    "unidentifiedScans": [ { "scanId": "uuid", "scannedAt": "..." } ],
    "byRoute": [ { "routeId", "routeName", "total", "checkedIn", "missing", "unidentified" } ] }
  ```
- **Errors:** 500

---

## 7. Face Recognition

### POST `/programmes/:id/recognize` — Match faces in a live capture
- **Body:**
  ```json
  { "image": "base64-encoded-jpeg" }
  ```
- **Success (200):**
  ```json
  { "matches": [ { "delegateId": "uuid", "name": "Ah Ming", "confidence": 0.82, "imageData": "base64" } ] }
  ```
  Empty `matches: []` when no face detected or no match (an `unverified` `ScanEvent` is recorded in both cases).
- **Errors:** 400 (image required; invalid programme UUID), 500
- **Threshold:** cosine similarity ≥ 0.5 against `faceEmbeddings` rows with `imageType: 'primary'`; only matches delegates already in the programme. Matches are sorted by descending confidence.

### POST `/api/user/:id/face` — Register face cache image for a user
- **Body:** `{ "image": "base64" }`
- **Success (201):** `[ { "imageHash": "sha256", "embeddings": "[...floats...]", "model": "facenet" } ]`
- **Errors:** 400 (missing image), 404 (user not found), 500

### PATCH `/api/user/:id/face/default` — Set/overwrite primary face
- **Body:** `{ "image": "base64" }`
- **Behavior:** deletes all existing `primary` embeddings for the user, then embeds the new image.
- **Success (200):** `[ { "hash", "embedding", "model" } ]`
- **Errors:** 400, 404, 500

### GET `/api/user/:id/face/default` — Get primary face embeddings
- **Success (200):** `[ { "hash", "imageData": "base64", "embedding": "[floats]", "model": "facenet" } ]`
- **Errors:** 404 (no default face / user not found), 500

---

## 8. QR Badge Lookup

### POST `/programmes/:id/scan-qr` — Resolve badge(s) to delegates
- **Body:** `{ "badge": "A001" }` **or** `{ "badges": ["A001", "A002"] }`
- **Success (200):**
  ```json
  { "matches": [ { "delegateId": "uuid", "name": "Ah Ming", "badge": "A001", "photoUrl": null } ],
    "errors": [ "no delegate found for badge: 999" ] }
  ```
- **Errors:** 400 (neither badge nor badges; badge empty), 500

---

## 9. Sync — POST `/sync`

Offline replay endpoint. Accepts queued operations and re-applies them; auth ops (`/api/auth` prefix) are validated against the embedded `token`, other ops require the caller to be staff.

- **Auth:** `Bearer` (staff) — also rate limited (60/min/IP).
- **Body:**
  ```json
  { "ops": [ { "method": "POST", "path": "/programmes", "body": { "name": "Trip", "startDate": "2026-08-01", "endDate": "2026-08-07" }, "token": null } ] }
  ```
- **Success (200):** `{ "ok": true }`
- **Errors:** 401 (auth middleware), 429, 500
- **Supported op patterns (method + path):**
  - POST/PUT/DELETE on `/programmes`, `/programmes/:id/routes(/:routeId)(/archive|/restore)`, `/programmes/:id/delegates`, `/programmes/:id/delegates/:delegateId/routes`, `/programmes/:id/attendance/:delegateId`, `/programmes/:id/routes/:routeId/ready-to-depart`
  - PATCH `/delegates/:delegateId`
  - POST/PATCH/DELETE `/api/auth` (token-validated; `POST /api/auth` optionally accepts `faceImage`)
  - POST `/programmes/:id/attendance` with `records[]` (batch path special-cased)

---

## 10. Misc

### GET `/` — Health check
- **Success (200):** `server is running`

---

## 11. WebSocket (Socket.io)

### Main namespace
- Client → server: `join:programme { programmeId }`, `leave:programme { programmeId }`
- Server → clients: `attendance:updated` (payload: `{ programmeId, delegateId, name, status, method, checkedInAt }`) broadcast to the `programme:<id>` room on every attendance change.

### `/chat` namespace (auth: token via `handshake.auth.token` or `handshake.query.token`)
- Server → socket on connect: `chatbot:config { userId, trigger }`
- Client → server: `chat:join (programmeId)`, `message ({ text ≤ 1000 chars })`
- Server → all: `message ({ message: { id, content, timestamp, senderId } })`, `chatbot:typing { senderId }`, `chatbot:stop { senderId }`, `error ({ text })`
- On connection, server pushes `history { messages[] }` (last 100, ascending).

---

## 12. Internal Python FaceNet Server (FastAPI, `127.0.0.1:8000`)

Called by the Node backend only (not exposed to client).

| Endpoint | Method | Request | Success body |
|----------|--------|---------|--------------|
| `/embed` | POST | multipart `file` (image) | `{ "success": true, "embedding": [floats] }` |
| `/detect` | POST | multipart `file` | `{ "success": true, "faces": [ { "x", "y", "w", "h" } ] }` |
| `/embed-all` | POST | multipart `file` | `{ "success": true, "faces": [ { "faceImage": "base64", "embedding": [floats], "bbox": { "x", "y", "w", "h" } } ] }` |

Failure responses: `{ "success": false, "error": "..." }` or HTTP 500 with `detail`.