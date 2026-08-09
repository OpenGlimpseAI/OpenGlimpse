# API Documentation — OpenGlimpse Express Backend (Ryan)

Base URL: `http://<host>:3001` (dev default port 3001; frontend proxies `/` to this server via Vite).

- All JSON. Request body limit: 10 MB.
- Response envelope errors: `404 Not Found` → `{ "error": "..." }`, `500` → `{ "error": "...", "detail": "..." }` (unhandled error handler) or just `{ "error": "..." }`.

**Scope:** This document covers Ryan's features only — face recognition, QR badge lookup, and the chatbot. These features depend on other members' work:

- **Auth (`/api/auth`)** — accounts, login, and the `Authorization: Bearer <token>` mechanism (auth module).
- **Programmes, routes, delegates, attendance** — `/programmes/:id` scoping, delegate membership, and attendance recording (programme module).
- **`/sync`** — offline replay (sync module).

Those endpoints and tables are documented by the respective module owners.

**Error code reference used across the API:**

| Code | Meaning |
|------|---------|
| 400 | Bad request (missing/invalid fields, validation failure) |
| 404 | Resource not found |
| 500 | Internal server error |

---

## 1. Face Recognition

### POST `/programmes/:id/recognize` — Match faces in a live capture

- **Auth:** `Bearer <token>` (auth module)
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
- **Threshold:** cosine similarity ≥ 0.5 against `faceEmbeddings` rows with `imageType: 'primary'`; only matches delegates already in the programme (delegate membership provided by the programme module). Matches are sorted by descending confidence.

### POST `/api/user/:id/face` — Register face cache image for a user

- **Auth:** `Bearer <token>` (auth module)
- **Body:** `{ "image": "base64" }`
- **Success (201):** `[ { "imageHash": "sha256", "embeddings": "[...floats...]", "model": "facenet" } ]`
- **Errors:** 400 (missing image), 404 (user not found), 500

### PATCH `/api/user/:id/face/default` — Set/overwrite primary face

- **Auth:** `Bearer <token>` (auth module)
- **Body:** `{ "image": "base64" }`
- **Behavior:** deletes all existing `primary` embeddings for the user, then embeds the new image.
- **Success (200):** `[ { "hash", "embedding", "model" } ]`
- **Errors:** 400, 404, 500

### GET `/api/user/:id/face/default` — Get primary face embeddings

- **Auth:** `Bearer <token>` (auth module)
- **Success (200):** `[ { "hash", "imageData": "base64", "embedding": "[floats]", "model": "facenet" } ]`
- **Errors:** 404 (no default face / user not found), 500

---

## 2. QR Badge Lookup

### POST `/programmes/:id/scan-qr` — Resolve badge(s) to delegates

- **Auth:** `Bearer <token>` (auth module)
- **Body:** `{ "badge": "A001" }` **or** `{ "badges": ["A001", "A002"] }`
- **Success (200):**
  ```json
  { "matches": [ { "delegateId": "uuid", "name": "Ah Ming", "badge": "A001", "photoUrl": null } ],
    "errors": [ "no delegate found for badge: 999" ] }
  ```
- **Errors:** 400 (neither badge nor badges; badge empty), 500
- **Dependency:** delegate lookup and programme membership are provided by the programme module.

---

## 3. WebSocket — `/chat` namespace (Chatbot)

### `/chat` namespace (auth: token via `handshake.auth.token` or `handshake.query.token`; token issued by auth module)
- Server → socket on connect: `chatbot:config { userId, trigger }`
- Client → server: `chat:join (programmeId)`, `message ({ text ≤ 1000 chars })`
- Server → all: `message ({ message: { id, content, timestamp, senderId } })`, `chatbot:typing { senderId }`, `chatbot:stop { senderId }`, `error ({ text })`
- On connection, server pushes `history { messages[] }` (last 100, ascending).

---

## 4. Misc

### GET `/` — Health check
- **Success (200):** `server is running`

---

## 5. Internal Python FaceNet Server (FastAPI, `127.0.0.1:8000`)

Called by the Node backend only (not exposed to client).

| Endpoint | Method | Request | Success body |
|----------|--------|---------|--------------|
| `/embed` | POST | multipart `file` (image) | `{ "success": true, "embedding": [floats] }` |
| `/detect` | POST | multipart `file` | `{ "success": true, "faces": [ { "x", "y", "w", "h" } ] }` |
| `/embed-all` | POST | multipart `file` | `{ "success": true, "faces": [ { "faceImage": "base64", "embedding": [floats], "bbox": { "x", "y", "w", "h" } } ] }` |

Failure responses: `{ "success": false, "error": "..." }` or HTTP 500 with `detail`.
