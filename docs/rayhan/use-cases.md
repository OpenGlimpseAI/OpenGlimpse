# Use Cases — Rayhan (Offline Sync & Event Chat)

Covers the **offline sync engine** (`services/api.js`, `db/localDB.js`, `sync/syncEngine.js`, `hooks/useSync.js`, `hooks/useConnectivity.js`, `components/shared/ConnectivityIndicator.jsx`) and the **real-time chat** feature (`modules/chat/chatserver.cjs`, `pages/chat/*`).

**Scope:** The chatbot (`@assistant`) is triggered inside the chat server but the Groq module itself is owned by Ryan; attendance/programme flows that go offline are owned by Xin Ying but reference the sync layer here.

---

## 1. Offline Sync

### 1.1 UC-OS-01: Queue Writes While Offline

- **Actor:** Staff / Admin using any synced write endpoint
- **Trigger:** `navigator.onLine` is false and the user submits a write (create/update/delete on a synced path).
- **Main flow:**
  1. The app calls one of the `api.js` request helpers (e.g. `createProgramme`, `markAttendance`, `updateUserProfile`).
  2. `request()` checks `navigator.onLine`; since offline, it skips `fetch`.
  3. The op `{ method, path, body, token }` is appended to `pendingChanges.current.ops` in IndexedDB (created if it does not exist) and `timestamp` is set to `Date.now()`.
  4. The function returns an optimistic result: `{ ...body, id: 'pending' }` for POST/PUT, or `null` for DELETE.
  5. Components update local state immediately (Dashboard, Directory, ProgrammePage, ProfilePage) instead of refetching.
- **Edge / alternative flows:**
  - *Path is not in `SYNC_PREFIXES`* (`/programmes`, `/delegates`, `/api/auth`, `/api/user`, `/users`): throws `Network required` and nothing is queued.
  - *Path is in `NEVER_QUEUE` (`/api/auth/login`) or matches `NO_SYNC_PATTERNS` (`/recognize`, `/scan-qr`):* throws `Network required` / the original error; camera lookups fail loudly rather than queueing un-replayable ops.
  - *Request has a token:* the token is stored on the op so auth writes can be re-validated on replay.
  - *Multiple offline writes:* ops accumulate in a single `pendingChanges` batch rather than one record per op.

### 1.2 UC-OS-02: Read Cached Data While Offline

- **Actor:** Staff / Admin opening a list or detail screen offline.
- **Trigger:** Offline GET on a synced path.
- **Main flow:**
  1. `request('GET', path)` sees `navigator.onLine === false`.
  2. It reads `requestCache` in IndexedDB keyed by the base path (query string stripped).
  3. If present, the cached `data` is returned as-is; the component renders it.
- **Edge / alternative flows:**
  - *No cached entry:* throws `Not available offline`.
  - *Online GET succeeds on a synced path:* the response is written to `requestCache` first, so the cache is refreshed before it is returned.

### 1.3 UC-OS-03: Auto-Sync When Connectivity Returns

- **Actor:** Staff / Admin with queued offline writes
- **Trigger:** Page load, the `online` browser event, or tab `focus` — with queued ops present.
- **Main flow:**
  1. `useSync()` runs `changeHandler()`; a `syncing` ref guard prevents concurrent runs.
  2. If `pendingChanges.current.ops` is non-empty, `sync:start` is dispatched and `changeHandler()` `POST`s `/sync` with `{ ops, timestamp }` and the stored auth token as a Bearer header.
  3. On `200 OK`, the `pendingChanges` record is deleted and `sync:done` is dispatched (also fired on failure, in a `finally`, so the indicator resets either way).
  4. Components listening for `sync:done` re-fetch fresh data (ParticipantManagement, ProgrammePage, directory, dashboard).
- **Edge / alternative flows:**
  - *Empty queue:* `changeHandler` returns immediately, no request is made.
  - *Sync request fails:* throws `Sync failed`, the queue is preserved, and the `syncing` flag resets so a later trigger retries.

### 1.4 UC-OS-04: Server Replay of Queued Ops

- **Actor:** API server (`POST /sync`)
- **Trigger:** A client with queued ops flushes them via `/sync`.
- **Main flow:**
  1. `syncRoutes.js` mounts `POST /sync` behind `authMiddleware`.
  2. `syncController.handleSync` iterates the ops array; each op's `method + path` is matched against the `HANDLERS` table.
  3. `matchRoute` splits the pattern into segments and extracts `:param` values (programme/route/delegate ids) from the path.
  4. `applyOp` executes the matching handler against the Sequelize models (`Programme`, `Route`, `Delegate`, `AttendanceRecord`, `ReadyToDepart`, `ProgrammeDelegate`, `RouteMember`, `faceEmbeddings`, `user`).
  5. Batch attendance ops (`POST /programmes/:id/attendance` with a `records` array) are special-cased: `programmeId` is pulled from the URL path, each record replayed via `AttendanceRecord.markAttendance`.
  6. Responds `{ ok: true }`.
- **Edge / alternative flows:**
  - *Non-auth op from a participant:* denied (staff role required) and skipped with a log line.
  - *Auth op (`/api/auth*`, `/api/user*`):* token is re-validated via `validateToken`; account create/update/delete and face upload replay against the `user` and `faceEmbeddings` models.
  - *Unknown path / handler match failure:* op is skipped silently (mirrored by `applyOp` returning without executing).
  - *Per-op failure:* caught and logged, but the remaining ops still replay and `{ ok: true }` is returned.

### 1.5 UC-OS-05: Connectivity Awareness in the UI

- **Actor:** Staff / Admin using the app
- **Trigger:** Connection state changes or a sync run starts/ends.
- **Main flow:**
  1. `useConnectivity()` initialises from `navigator.onLine` and listens for `online` / `offline`, `sync:start`, and `sync:done` events, plus a 3s interval that refreshes `pendingCount`.
  2. `ConnectivityIndicator` renders a fixed top bar: "Syncing..." while a sync is running, "Offline" when disconnected, and nothing when online.
  3. Offline-gated features read `isOnline` from `useConnectivity` and disable themselves (camera capture/confirm, chat composer, face upload).
- **Edge / alternative flows:**
  - *Offline while inside chat:* chat.jsx redirects to `/profile` once per offline period (`redirectedRef` guard), so users don't sit in a dead chat screen.
  - *Pending count:* reflects `pendingChanges.ops.length`, refreshed on sync completion and every 3s.

---

## 2. Chat

### 2.1 UC-CH-01: Join a Programme Chat

- **Actor:** Staff / Admin
- **Trigger:** User opens the `/chat` page.
- **Main flow:**
  1. `chat.jsx` connects a Socket.io client to `${VITE_CHAT_SERVER_URL}/chat` with `auth: { token }` and `transports: ['websocket']`.
  2. The server's `/chat` middleware validates the token (`parseToken` + `user.findByPk`) and attaches `userId`, `userRole`, `userName` to the socket.
  3. On connect the server emits `chatbot:config` (when the seeded AI user exists) and `history` containing the last 100 persisted messages (ascending), enriched with sender role/name and reactions.
  4. The client fetches programmes and staff lists; it selects a programme and emits `chat:join <programmeId>`.
- **Edge / alternative flows:**
  - *Invalid/missing token:* connection is refused (`next(new Error(...))`).
  - *No programme selected:* messages can still be read/sent; the chatbot is only invoked when a programme is joined.

### 2.2 UC-CH-02: Send a Chat Message

- **Actor:** Staff / Admin
- **Trigger:** User types and hits Enter (Shift+Enter for a newline).
- **Main flow:**
  1. `ChatInput` handles Enter to submit; the composer is disabled when offline or when the socket is not connected.
  2. `chat.jsx` emits `message { text }`.
  3. The server trims the text, rejects empty/over-1000-char messages, persists it via `Messages.create` (`messages` table), and broadcasts `message` to the whole `/chat` namespace with `senderRole` and `senderName`.
  4. All connected clients append it; auto-scroll keeps the view pinned to the bottom (or increments an unread badge on the jump-to-bottom button if scrolled up).
- **Edge / alternative flows:**
  - *Invalid message:* server emits `error { text }` to that socket only.
  - *Text starts with the chatbot trigger and a programme is joined:* the message is saved and broadcast, then the chatbot flow runs (owned by Ryan's module) with `chatbot:typing` / `chatbot:stop` around the bot reply.

### 2.3 UC-CH-03: React to a Message

- **Actor:** Staff / Admin
- **Trigger:** Hover (desktop) or long-press (touch) on a chat bubble opens the quick-emoji bar; tapping an emoji sends a reaction.
- **Main flow:**
  1. `chatbubble.jsx` tracks hover / 400ms long-press (with a 10px move tolerance to cancel).
  2. `reactToMessage(messageId, emoji)` emits `react { messageId, emoji }`.
  3. The server loads the message, then finds the caller's existing reaction: same emoji → delete, different emoji → update, none → create.
  4. It recomputes the aggregated `{ emoji, userIds[] }` list (sorted by count) and broadcasts `reaction:update` to the namespace.
  5. Clients update the message's `reactions` in place; the reacting user's own entry is highlighted (`chat-reaction-mine`).
- **Edge / alternative flows:**
  * *Message not found / invalid payload:* `error` event to that socket.
  * *One reaction per user:* enforced by the unique `(message_id, user_id)` index on `message_reactions` plus the find-or-toggle logic.

### 2.4 UC-CH-04: Identify Staff vs Participant Messages

- **Actor:** Staff / Admin reading the chat
- **Trigger:** A message arrives from any sender.
- **Main flow:**
  1. The server attaches `senderRole` in the broadcast payload (from the socket's `userRole`).
  2. `chatbubble.jsx` adds `chat-bubble-admin` styling when `message.senderRole === 'staff'`, and `chat-bubble-own` / `chat-bubble-other` based on whether `senderId` matches the current user.
  3. A first-letter avatar (`chat-avatar`) renders on the non-own side.
- **Edge / alternative flows:**
  - *Bot messages:* rendered with Markdown via `marked`, an "AI Assistant" label and BOT badge, using `isBot` (senderId === chatbot userId from `chatbot:config`).

### 2.5 UC-CH-05: Offline Behaviour in Chat

- **Actor:** Staff / Admin
- **Trigger:** Connection drops while on the chat page.
- **Main flow:**
  1. `useConnectivity` flips `isOnline` to false.
  2. `chat.jsx` navigates to `/profile` once (`redirectedRef`), so the user leaves the dead chat screen.
  3. If they return while still offline, `ChatInput` is disabled with a "Chat unavailable while offline" placeholder.
- **Edge / alternative flows:**
  - *Connection restored:* `redirectedRef` resets; chat becomes usable again.
