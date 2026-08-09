# API Documentation — Rayhan (Offline Sync & Event Chat)

Base URL: `http://<host>:3001` (dev default port 3001; frontend proxies `/sync` to this server via Vite).

- Auth tokens are the base64 of `<userId>:<role>` (issued by `POST /api/auth/login`, auth module). `authMiddleware` (auth module) validates the `Authorization: Bearer <token>` header.
- All JSON. Request body limit: 10 MB.
- Error responses: `{ "error": "..." }`; unhandled handler errors `{ "error": "...", "detail": "..." }`.

**Scope:** This document covers my features,namely the offline sync replay endpoint and the `/chat` Socket.io namespace. The endpoints being synced (programme/attendance, auth, face) are owned by their respective modules and documented by their owners; this document describes how offline ops reach them.

---

## 1. Sync — `POST /sync`

### POST `/sync` — Replay queued offline operations

- **Auth:** `Bearer <token>` (auth middleware required)
- **Rate limit:** 60 req/min/IP (in-memory limiter in `index.js`)
- **Body:**
  ```json
  {
    "ops": [
      { "method": "PUT", "path": "/programmes/<progId>/attendance/<delegateId>", "body": { "status": "present", "method": "manual" }, "token": null },
      { "method": "POST", "path": "/api/auth", "body": { "name": "...", "email": "...", "password": "..." }, "token": "<base64>" }
    ],
    "timestamp": 1723000000000
  }
  ```
- **Success (200):**
  ```json
  { "ok": true }
  ```
- **Errors:** 401 (missing/invalid token), 429 (rate limit), 500 (malformed body)

#### Replayed operations (`syncController.js` `HANDLERS`)

| Method + Pattern | Handler |
|------------------|---------|
| `POST /programmes` | `Programme.createWithDetails` |
| `PUT /programmes/:id` | `Programme.updateWithDetails` |
| `DELETE /programmes/:id` | `Programme.removeById` |
| `POST /programmes/:id/routes` | `Route.createForProgramme` |
| `PUT /programmes/:id/routes/:routeId` | `Route.updateForProgramme` |
| `DELETE /programmes/:id/routes/:routeId` | `Route.removeById` |
| `PUT /programmes/:id/routes/:routeId/archive` | `Route.archiveById` |
| `PUT /programmes/:id/routes/:routeId/restore` | `Route.restoreById` |
| `POST /programmes/:id/delegates` | `ProgrammeDelegate.addDelegates` |
| `DELETE /programmes/:id/delegates/:delegateId` | `ProgrammeDelegate.removeFromProgramme` |
| `PATCH /delegates/:delegateId` | `Delegate.update` |
| `PUT /programmes/:id/delegates/:delegateId/routes` | `setDelegateRoutes` (destroys + recreates `RouteMember`) |
| `PUT /programmes/:id/attendance/:delegateId` | `AttendanceRecord.markAttendance` |
| `PUT /programmes/:id/routes/:routeId/ready-to-depart` | `ReadyToDepart.setStatus` |
| `POST /api/auth` | validate caller as staff; create `user` (+ optional `faceImage` via `FaceEmbeddings.createFromImage`) |
| `PATCH /api/auth` | validate token; update own account (or any if staff), optional role/password/email/name |
| `DELETE /api/auth` | validate staff (or self); destroy face embeddings + user |
| `PATCH /api/user/:id/face/default` | replace the user's `primary` face embeddings with a new image |

**Permission rules:**
- Ops on `/api/auth` or `/api/user` re-validate the op's embedded `token` (via `parseToken` + DB lookup); `requireStaff` is enforced for create/delete.
- All other ops require the *caller* (`req.user`) to have `role === 'staff'`; participant callers are denied per-op with a console log.
- Batch attendance (`POST /programmes/:id/attendance` with a `records` array) is special-cased: `programmeId` is extracted from the path and each record replayed individually; op is skipped when the body has no `records` array.
- Ops whose path matches no handler are skipped silently (e.g. `/recognize`, `/scan-qr`).

---

## 2. Client Offline Layer (`services/api.js`, `db/localDB.js`, `sync/syncEngine.js`)

No HTTP endpoints of its own, but this is the request interception the sync feature is built on:

- **Local DB (Dexie, `OpenGlimpseDB`):**
  - `requestCache` keyed by `path` — cached GET responses
  - `pendingChanges` keyed by `id` (`'current'`) — `{ ops: [{ method, path, body, token }], timestamp }`
- **`request(method, path, body, token)` behaviour:**
  - `navigator.onLine` true → `fetch`; on success caches GET responses for synced paths; on failure falls through to the offline path for synced paths (retry-queue).
  - Offline GET → serve from `requestCache` (keyed by base path, query string stripped) or throw `Not available offline`.
  - Offline write → append op to `pendingChanges`, return optimistic `{ ...body, id: 'pending' }` (POST/PUT) or `null` (DELETE).
- **Sync path matching:**
  - `SYNC_PREFIXES = ['/programmes', '/delegates', '/api/auth', '/api/user', '/users']`
  - `NEVER_QUEUE = ['/api/auth/login']` — login is never queued, throws `Network required` offline.
  - `NO_SYNC_PATTERNS = [/^\/programmes\/[^/]+\/recognize$/, /^\/programmes\/[^/]+\/scan-qr$/]` — camera lookups fail loudly, not queued.
- **`changeHandler()` (`syncEngine.js`):** reads `pendingChanges`, `POST`s to `${API_BASE}/sync` with the stored auth token, deletes the record on 200, throws `Sync failed` otherwise (queue retained).
- **`useSync()` hook:** runs `changeHandler()` on mount, `online`, and `focus`; guarded by a `syncing` ref; dispatches `sync:start` before flushing and `sync:done` in `finally`.
- **`useConnectivity()` hook:** exposes `{ isOnline, isSyncing, pendingCount }` from `navigator.onLine` + `sync:start`/`sync:done` events + a 3s `pendingCount` poll.

---

## 3. WebSocket — `/chat` namespace (Chat)

### `/chat` namespace (`modules/chat/chatserver.cjs`)

- **Auth:** token via `handshake.auth.token` or `handshake.query.token`; validated with `parseToken` + `user.findByPk`. Attaches `userId`, `userRole`, `userName`.
- **On connect, server → client:**
  - `chatbot:config { userId, trigger }` — emitted when the seeded AI Assistant user exists.
  - `history { messages[] }` — last 100 persisted messages ascending, each `{ id, text/content, timestamp, senderId, senderRole, senderName, reactions[] }`.

#### Client → Server events

| Event | Payload | Behaviour |
|-------|---------|-----------|
| `chat:join` | `programmeId` | Stores `socket.programmeId` (used for chatbot context) |
| `message` | `{ text }` | Trim + validate (non-empty, ≤ 1000 chars); `Messages.create`; broadcast; triggers chatbot if text starts with trigger and a programme is joined |
| `react` | `{ messageId, emoji }` | Toggle a per-user reaction (same emoji → delete, different → update, none → create); recompute aggregate; broadcast |

#### Server → All events

| Event | Payload | Behaviour |
|-------|---------|-----------|
| `message` | `{ message }` | New message broadcast (with sender role/name) |
| `reaction:update` | `{ messageId, reactions }` | Aggregated `[{ emoji, userIds[] }]` sorted by count |
| `chatbot:typing` | `{ senderId }` | Bot started generating |
| `chatbot:stop` | `{ senderId }` | Bot finished / errored |

#### Server → Socket (single) events

| Event | Payload | Behaviour |
|-------|---------|-----------|
| `error` | `{ text }` | Invalid message/reaction/auth, or chatbot failure |

---

## 4. Error Code Reference

| Code | Meaning |
|------|---------|
| 200 | OK — sync replayed, sync:done |
| 400 | Bad request (invalid payload / message over 1000 chars) |
| 401 | Authentication required / invalid token |
| 403 | Staff role required for sync op |
| 404 | Resource not found |
| 429 | Rate limit exceeded (`/sync`: 60/min/IP) |
| 500 | Internal server error |
