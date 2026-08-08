# OpenGlimpse — Project Documentation
# SCCCI Delegation Real-Time Facial Recognition Attendance System
# Problem Statement #10 | 4-Person Team

---

## 1. Project Overview

SCCCI (Singapore Chinese Chamber of Commerce & Industry) manages overseas business delegations of 15–30 (sometimes 100+) participants across multiple coaches and venues. Currently, headcount is taken manually by counting heads and doing roll calls — a slow, error-prone process that causes anxiety and programme overruns when someone is missing.

This system digitises and accelerates that process using a React-based mobile-first application with facial recognition as the primary attendance mechanism, supplemented by QR code scanning as a backup.

---

## 2. Use Case Definition

### 2.1 Primary Use Case
**Title:** Real-Time Facial Recognition Attendance with Multi-Staff Sync

**Goal:** Allow SCCCI secretariat staff to take attendance for an overseas delegation in under 1 minute (30 pax) or 2 minutes (100+ pax) using facial recognition, with instant visibility of who is present or absent — across multiple staff devices simultaneously.

**Actors:**
- Staff / Secretariat (Primary) — takes attendance using facial recognition; can manually confirm identity if needed
- Trip Manager / Admin (Primary) — creates programmes, assigns staff, views consolidated real-time attendance, confirms departure readiness
- Delegate (Secondary) — identified via facial recognition as they enter coaches or venues

### 2.2 Preconditions
- A programme has been created with a predetermined participant list
- Each delegate's facial photograph has been registered in the system (passport-sized photo)
- At least one staff member has the app open, is logged in, and is assigned to the current programme/route
- Internet connectivity (cellular data or hotspot) is available at the location for real-time cloud sync
- For first login by staff, updated facial photo is required to verify identity

### 2.3 Main Flow (Happy Path)
1. Admin creates a new programme with routes, bus assignments, and participant list.
2. Staff member logs in with their account (verified by facial recognition on first login).
3. Staff opens the attendance marking screen for their assigned route/coach.
4. Delegate boards; staff activates live camera with facial detection. App displays bounding boxes around detected faces in real time.
5. App matches detected face against stored delegate embeddings. If match confidence is high, delegate is marked Present automatically.
6. If confidence is low or face is unrecognised, admin receives in-app alert. Staff can manually confirm identity from the list or use QR code backup.
7. Attendance record syncs instantly to the cloud. All staff devices update in real time.
8. The dashboard shows: Present list (with photos), Unidentified/Absent list (highlighted at top), and Ready-to-Depart status.
9. When all delegates are accounted for, the Trip Manager confirms departure readiness.

### 2.4 Alternative & Exception Flows

**Alt A — Low confidence facial match:**
- App flags confidence score and shows top candidate matches.
- Staff taps to confirm or manually selects from the list.
- Fallback: QR code scan on separate tab if delegate has badge.

**Alt B — Unidentified face:**
- Admin receives in-app alert for faces that don't match any registered delegate.
- Staff can manually add the person if it's a new arrival or late joiner.
- Photo quality may be poor — staff can request re-scan or use QR/manual override.

**Alt C — Manual attendance override:**
- Staff can always tap a delegate's name from the list to mark them Present or Absent.
- Covers roll calls when facial recognition is not available or delegate forgot badge.

**Alt D — Delegate joins/leaves programme mid-journey:**
- Admin amends the programme participant list on-the-fly from the app (add/remove delegate, change route/coach assignment).

**Alt E — Offline when scanning:**
- App queues facial scans locally (face image + embedding) if internet drops.
- When connectivity restores, queued scans are sent to backend for processing.
- Cloud data merges offline scans without loss or duplication.

---

## 3. System Requirements (Prioritised)

P1 = must-have MVP; P2 = high value, build after P1; P3 = nice-to-have.

| Pri. | Requirement | Owner |
|------|-------------|-------|
| P1 | Facial recognition with real-time face detection — bounding boxes drawn around faces in camera view | Ryan |
| P1 | Face embedding generation & storage — store delegate faces as embeddings in PostgreSQL | Ryan + Backend |
| P1 | Manual identity confirmation — staff can manually tap delegate name to override low-confidence matches | Ryan / XY |
| P1 | Offline sync queue — frontend buffers facial scans locally; backend processes & merges on reconnect | Rayhan |
| P1 | Real-time attendance dashboard with present/absent/unidentified lists; missing marked at top | XY |
| P1 | Multi-staff cloud sync — all staff see the same attendance in real time across devices | Backend + Ryan |
| P1 | Programme & route creation — admin can set up trips, assign buses/routes, manage participant lists | XY / Matt |
| P1 | Staff account management — admin CRUD operations, staff login, face verification on first login | Matt |
| P1 | In-app alerts for unidentified faces — admin notified of FR matches below confidence threshold | Ryan / Backend |
| P1 | China-accessible hosting — app must not be blocked by Great Firewall | Backend |
| P2 | QR code backup scanning — delegate has QR on badge; staff can switch tab to scan if FR not possible | Ryan |
| P2 | Attendance summary & data aggregation — totals, pass rates, missing delegates report | XY |
| P2 | Ready-to-depart indicator — admin confirms all delegates accounted for before departure | XY |
| P2 | In-app chat & announcements — team members can communicate; announce updates with reactions | Rayhan |
| P2 | AI chatbot assistant — context-aware chatbot that answers programme questions via Groq API; triggered by @assistant prefix in chat | Backend |
| P2 | Navbar navigation — easy routing between Programme, Attendance, Profile, Chat sections | Rayhan |
| P3 | User profile management — staff can update personal info including new facial photo | Matt |

---

## 4. Tech Stack Details

### 4.1 Frontend
- React web application with responsive design — optimised for staff smartphones and tablets
- Facial recognition: face-api.js library for real-time face detection, embedding generation, and similarity matching
- Camera API: device camera access with live face detection and bounding box visualization
- QR code scanner: separate tab with camera-based QR decoding (backup mode)
- Offline queue: browser localStorage for queuing facial scans and embeddings when disconnected
- UI: simple, high-contrast, glanceable — unidentified/absent delegates surfaced at top of list
- Chat auto-scroll: chat snaps to the latest message on first entry and when already at the bottom on new messages; a floating jump-to-bottom button (with unread count) appears when scrolled up
- Navbar: floating, pill-shaped bottom nav (`components/navbar/bottomnav.jsx`) using lucide-react icons; active route highlighted via `useLocation`; offline dot badge on Chat; collapses labels to icons on small screens; content pages reserve bottom padding so the floating pill never overlaps interactive elements
- Dark mode: default-on dark theme toggled in the Profile page ("Appearance" section, sun/moon) via `hooks/useTheme.js`, which now exposes a `ThemeProvider` (wraps the app in `main.jsx`) plus a `useTheme()` hook so the toggle reflects instantly everywhere; persisted in `localStorage` (`openglimpse-theme`) and applied by toggling the `.dark` class on `<html>`. Tailwind v4 emits `var(--color-*)` in every utility, so `index.css` remaps those variables in a `.dark` scope to re-theme surfaces, borders, and text across the whole app from a single block, with targeted overrides for white text on coloured buttons, chat code blocks, the floating nav, and MUI tabs; a pre-React inline script in `index.html` sets the class before first paint to avoid a flash. Primary buttons use a `bg-sky-gradient` linear-gradient instead of solid `bg-sky-600` (defined in `index.css`, with hover/active and dark-mode variants), applied via the `.bg-sky-gradient` utility and via a combined CSS selector for the `@apply`-based components (floatnav active, chat send button/bubbles, auth buttons, etc.). The accent colour is user-selectable (blue/purple/red/green): a row of gradient swatches in the same "Appearance" section sets `accent` (persisted as `openglimpse-accent`, applied via `data-accent` on `<html>`, set pre-paint in `index.html`), and `index.css` maps each accent to the `--grad-*` CSS variables shared by all the layered gradient selectors.
- Auth gating: signed-in state is `localStorage['authUser']` (set by Login, cleared on logout). Every private route (`/profile`, `/chat`, `/camera`, `/dashboard*`, `/directory`, `/programmes*`, `/badge`) is wrapped in a `RequireAuth` guard in `App.jsx` that renders `<Navigate to="/login" replace />` when no credentials exist; the `/` root redirects to `/login` the same way. Several pages also keep their own `navigate('/login')` check as defense-in-depth, and `/login` + `/onboarding` remain public.

### 4.2 Backend
- Node.js REST API (Express.js) for programmes, routes, attendance, user management, and chat
- Real-time sync: WebSockets (Socket.io) for instant multi-device attendance updates, in-app chat, and message reactions
- AI chatbot: Groq API (llama-3.3-70b-versatile) with full programme context; chatbot user seeded in DB; triggered by configurable prefix (e.g. `@assistant`) in chat
- Database: PostgreSQL — stores programmes, participants, facial embeddings (vectors), scan events, chat messages, user accounts
- Offline queue processing: backend receives offline scans, validates embeddings, and merges with live data without duplication
- Auth: staff login via JWT; delegate identity verified by facial embedding similarity
- Hosting: must be accessible from China — Alibaba Cloud (Singapore/Hong Kong region) strongly preferred

### 4.3 Data & Privacy
- Delegate data: name, facial photograph (passport-sized JPEG), optional QR code ID, optional NFC tag ID
- Facial embeddings: stored in PostgreSQL as numeric vectors (face-api.js output); compared for similarity matching
- Staff data: account credentials, facial photo for login verification, permission levels
- Photos pre-registered by admin before the programme; staff updates own photo on first login
- Chat messages: persisted in the `messages` table (`content`, `timestamp`, `senderId`) and rendered via the `/chat` socket namespace; retained for programme history; can be archived per admin policy
- Message reactions: one reaction per user per message (WhatsApp-style emoji); stored in `message_reactions` keyed on `(message_id, user_id)`; synced live over the `/chat` socket namespace via the `react` event and `reaction:update` broadcasts

### 4.4 Offline Sync Engine

#### Architecture
- **Client:** Dexie.js (IndexedDB) with `requestCache` and `pendingChanges` tables
- **Interception layer:** `services/api.js` `request()` caches GET responses; offline reads serve from cache, offline writes queue `{ method, path, body, token }` to `pendingChanges`
- **Auth endpoints:** `/api/auth` and `/api/user` in `SYNC_PREFIXES`; login excluded via `NEVER_QUEUE`; token carried in ops for auth writes
- **Sync trigger:** `hooks/useSync.js` calls `sync/changeHandler()` on mount, `online` event, and tab `focus`; dispatches `sync:start` before flushing and `sync:done` after (in `finally`, so it also fires on failure) to drive the syncing indicator and `pendingCount` refresh
- **Server:** `POST /sync` registered in `index.js` via `registerSyncRoutes(app)`; handled by `modules/sync/syncController.js` which replays ops against Sequelize models; auth ops validated via `parseToken()` + DB lookup
- **Rate limiting:** an in-memory limiter in `index.js` caps `/sync` at 60 req/min/IP and `/api/auth/login` at 10 req/min/IP (HTTP 429 on overflow) to prevent replay storms when a device flushes its offline queue (added in the v3 iteration)
- **Vite proxy:** `/sync` added to `vite.config.js` proxy table so `changeHandler` fetch reaches Express (was root cause of silent sync failure)
- **Synced entity types:** programme, route, delegate, attendance (single + batch), readyToDepart, auth, face upload (`PATCH /api/user/:id/face/default`); batch attendance pulls `programmeId` from the URL path since the client payload only carries `records`
- **Not synced:** login (`/api/auth/login`); face recognition (`/programmes/:id/recognize`) and QR scanning (`/programmes/:id/scan-qr`) excluded via `NO_SYNC_PATTERNS` so they fail loudly instead of queueing ops that cannot be replayed; chat and users (`/users`)

#### Client-side data flow
- `request()` in `api.js` checks `navigator.onLine`:
  - **Online:** fetch from server; cache GET responses in `requestCache` for synced paths
  - **Offline:** GET reads from `requestCache`; POST/PUT/DELETE pushes to `pendingChanges` and returns optimistic result (`{ ...body, id: 'pending' }`)
- **Components show optimistic data immediately via `setAccounts` (local state)** — `handleCreate`, `handleUpdate`, `handleDelete` in `ParticipantManagement.jsx` skip the stale cache and directly update state when offline
- **Offline-disabled UIs:** CameraPage capture/confirm buttons disabled; ChatInput shows "unavailable" placeholder; face upload skipped in ParticipantManagement

#### Sync lifecycle
1. **Queue:** offline writes accumulate in `pendingChanges` (IndexedDB, persists across sessions)
2. **Trigger:** `useSync.js` fires `changeHandler()` on mount, `online` event, or tab `focus` (with ref guard to prevent concurrent runs)
3. **Send:** `changeHandler()` does `POST /sync` with `{ ops, timestamp }`; on 200 OK, deletes `pendingChanges`; `useSync.js` then dispatches `sync:done`
4. **Server processing:** `syncController.js` `HANDLERS` map dispatches each op by `method + path` pattern; auth ops include `validateToken()` checks
5. **UI refresh:** components listen for `sync:done` via `window.addEventListener('sync:done', ...)` and `sync:done` event to re-fetch fresh data: `ParticipantManagement.jsx`, `ProgrammePage.jsx`, `directory.jsx`
6. **Connectivity indicator:** `useConnectivity.js` polls `pendingChanges` every 3s **and** listens for `sync:done` to instantly update `pendingCount`; camera & chat disabled when offline

#### Automated tests
- **Client offline layer** (`npm run test:sync` in `src/client`): `tests/sync/client-offline.test.mjs` runs the real `api.js`/`syncEngine.js` in Node via a loader hook (`tests/sync/meta-loader.cjs`) that injects `import.meta.env` and resolves extensionless imports; Dexie backed by `fake-indexeddb`. Covers GET caching, offline cache reads, offline write queueing, never-queued endpoints (login, recognize, scan-qr), optimistic results, auth headers, and the `/sync` flush (success clears, failure retains).
- **Server replay** (`npm run test:sync` in `src/server`): `tests/server-replay.test.cjs` creates a throwaway `OpenGlimpse_test` database and exercises `handleSync` against the real Sequelize models. Covers every `HANDLERS` pattern (batch/single attendance, ready-to-depart, programme/route/delegate CRUD, auth account create/delete, face upload), staff-vs-participant permission rules, and unknown-path skipping.

### 4.5 Real-Time Chat Feature

#### Overview
An in-app, programme-scoped chat with message persistence, emoji reactions, admin/highlighted bubbles, sender avatars, and an optional AI assistant. Built by **Rayablepy** (Rayhan) on the `messages-update` / `feature/chat-improvements` branches and merged via PR #7 and the `feature/offline-sync-v3` line. Uses a dedicated Socket.io namespace (`/chat`) served from `src/server/modules/chat/chatserver.cjs` (separate from the attendance socket namespace). The `@assistant`-triggered Groq chatbot (`server/modules/chatbot/chatbot.js`) was authored by RyanStudio and integrated into the chat server by Rayablepy.

#### Server-side architecture
- **Namespace:** Socket.io `io.of('/chat')` mounted in `index.js` via `attachChatServer(io, getChatbotUserId)`.
- **Auth middleware:** every socket handshake must supply a JWT (`auth.token` or `query.token`); `parseToken()` + `user.findByPk()` validate it and attach `userId`, `userRole`, `userName` to the socket.
- **History:** on connection, loads the last 100 `Messages` ordered ascending, joins each message's sender role/name, and resolves reactions via `Reactions.readByMessageIds`; emits `history` with the full formatted payload.
- **Events (client → server):**
  - `chat:join <programmeId>` — stores `socket.programmeId` for chatbot context.
  - `message { text }` — trims/validates (≤1000 chars), persists via `Messages.create`, broadcasts `message` to the whole `/chat` namespace; if the text contains the chatbot trigger (e.g. `@assistant`) anywhere and a programme is joined, builds programme context and streams a Groq response (emitting `chatbot:typing` / `chatbot:stop` around it and persisting the bot reply).
  - `react { messageId, emoji }` — toggles a per-user reaction on a message (same emoji → delete; different emoji → update; else create), then broadcasts `reaction:update` with the aggregated `{ emoji, userIds[] }` list, sorted by count.
- **Chatbot config:** on connection the server emits `chatbot:config` (`{ userId, trigger }`) so the client knows how to render bot bubbles; the chatbot user is seeded as `ai-assistant@openglimpse.com` on startup (`index.js`).

#### Database models (`db.cjs` + `dbcrudmethods.js`)
- `messages` (`content`, `timestamp`, `senderId` → `users`) — chat message persistence, written by Rayable's original chat/db commits (`0ee92b6`) and extended with `senderId` (`7e96bda`).
- `message_reactions` (`messageId` → `messages`, `userId` → `users`, `emoji`; unique on `(message_id, user_id)`) — one reaction per user per message.
- CRUD classes: `Messages` (create/read last 100/update/delete) and `Reactions` (create/findOne/update/destroy/readByMessageIds) in `server/database/dbcrudmethods.js`.

#### Client-side components (`src/client/src/pages/chat/`)
- `chat.jsx` — main page: connects `io(`${VITE_CHAT_SERVER_URL}/chat`, { auth: { token }, transports: ['websocket'] })`, joins the selected programme, renders the message list, fetches programmes + staff for mentions, tracks scroll position with a jump-to-bottom button + unread count, and shows online/offline pills. Redirects to `/profile` when the device goes offline (`e0a85c8`), and disables the composer with a "Chat unavailable while offline" placeholder.
- `chatbubble.jsx` — message bubble; own/other alignment via `chat-bubble-own`/`chat-bubble-other`, admin bubbles highlighted with `chat-bubble-admin` (`9908dc8`), bot bubbles render Markdown via `marked` with a "BOT" badge, sender avatars (`e335d56`), and per-bubble emoji reactions triggered by hover or long-press (`chatbubble.jsx` + `ReactionBar.jsx`).
- `ChatInput.jsx` — textarea composer with `@` mention suggestions (staff names + `@assistant`), keyboard navigation (arrows/enter/tab/escape), and a gradient send button.
- `ReactionBar.jsx` — quick-emoji palette shown above a bubble.

#### Chat UI styling (`index.css`)
`.chat-*` classes: layout (`chat-page`, `chat-header`, `chat-layout`, `chat-scroll`, `chat-content`, `chat-composer-shell`), bubbles (`chat-bubble-own`/`-other`/`-bot`/`-admin`, `chat-bubble-time-*`), reactions (`chat-reactions`, `chat-reaction`, `chat-reaction-mine`, `chat-reaction-bar`), mention dropdown, and the gradient `chat-send-button` / `chat-jump-bottom` (sky gradient via the combined selector).

#### Chatbot (`server/modules/chatbot/chatbot.js`)
- Groq API client (authored by RyanStudio); `buildProgrammeContext(programmeId)` assembles a text context from programme, routes, delegates, attendance summary, and staff list; `getChatbotResponse` injects a system prompt + recent 10-message history and calls the model (`GROQ_MODEL`, default `gpt-oss-20b`). Triggered whenever the text contains `VITE_CHATBOT_TRIGGER` (default `@assistant`), regardless of position; the chat-server wiring that emits `chatbot:typing` / `chatbot:stop` and persists the bot reply lives in `chatserver.cjs`.

#### Related env vars
- `VITE_CHAT_SERVER_URL` — Socket.io chat endpoint (client).
- `VITE_CHATBOT_TRIGGER` (default `@assistant`) and `GROQ_API_KEY` / `GROQ_MODEL` — chatbot trigger + provider config.

### 4.6 Hardware (for Demo & Production)
- Development: laptop webcam acceptable with printed QR codes and mock data
- Final demo: mobile phone (Android/iOS) for live facial recognition, camera-based QR scanning
- QR badges: printed QR codes embedded in delegate badge lanyard
- NFC badges: optional for future enhancement; requires NFC-equipped phone

---

## 5. Integration Points

- Ryan calls: `POST /programmes/{id}/scans` with facial embedding + confidence
- XY calls: `PUT /programmes/{id}/attendance/{delegateId}` for manual mark present/absent
- Ryan & XY listen: WebSocket event `attendance:updated` to refresh dashboard in real time
- Rayhan manages: offline queue — client-side buffers scan payloads, backend deduplicates on sync
- Matt ensures: JWT tokens issued by auth endpoint are validated by all API consumers

---

## 6. Success Criteria

| Metric | Target |
|--------|--------|
| Time to reconcile 30 pax | < 1 minute |
| Time to reconcile 100+ pax | < 2 minutes |
| Facial recognition accuracy | ≥99% with staff confirmation for matches |
| Data loss on offline sync | Zero |
| Staff usability score | ≥4.5 / 5 |
| China accessibility | Fully functional on Alibaba Cloud; no GFW blocks |
| Cloud sync latency | < 2 seconds for multi-device updates |

---

## 7. Out of Scope

- Real-time location tracking or GPS maps (client uses WhatsApp)
- Liveness detection / anti-spoofing (client prioritises speed over security compliance)
- Government compliance audit trails
- Integration with external HR, CRM, or event management systems
- Push notifications beyond in-app alerts
- Voice calls or video conferencing (WhatsApp remains communication channel)

---

## 8. Assumptions & Risks

### 8.1 Assumptions
- Internet (cellular data or hotspot) is available at all trip locations (China, ASEAN countries)
- Client will provide sample participant data: names + passport-sized facial photos
- Staff members have smartphones capable of running React web app (Android/iOS, modern browsers)
- Face-api.js embeddings are sufficient for matching with ≥99% accuracy among diverse delegate faces
- PostgreSQL with pgvector extension (or JSONB) is available on hosting provider

### 8.2 Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Facial recognition accuracy on diverse faces, varied lighting, or poor photo quality | Set clear confidence thresholds (0.6+); always offer manual override; test with diverse delegation photos early |
| Great Firewall blocks Alibaba Cloud or host provider | Verify Alibaba Cloud Singapore/HK region connectivity from China SIM in Week 1; have AWS HK as backup |
| Face-api.js embedding format incompatible with backend matching algorithm | Agree on embedding format (size, normalization) in Week 1; test sample embeddings on both sides |
| WebSocket scaling — many concurrent staff devices cause latency | Load test early; consider Socket.io room/namespace for per-programme isolation |
| Offline queue duplication — same scan synced twice on reconnect | Add unique scan ID (timestamp + device ID) to each offline queue item; backend deduplicates on ID |
| QR code as backup underutilised if FR works well | Defer QR printing to P2; clients may choose not to use if FR is reliable |

---

## 9. Individual Documentation

Per-team-member deep-dive docs (use cases, API reference, database schema) live under `docs/<student-name>/`, with the overall system architecture in `docs/architecture.md`:

- `docs/architecture.md` — system architecture overview
- `docs/ryan/use-cases.md` — use cases for all roles (facial recognition, QR backup, unidentified alerts, chatbot)
- `docs/ryan/api-documentation.md` — every HTTP endpoint + WebSocket/chat events + internal FaceNet API
- `docs/ryan/database-schema.md` — ER diagram + full table definitions for the PostgreSQL schema

### 9.1 Rayablepy's feature branches

Rayablepy (Muhammad Rayhan) authored the offline sync engine and the real-time chat feature across these branches:

- `feature/offline-sync`, `feature/offline-syncv2` — initial Dexie.js/IndexedDB offline queue, `useConnectivity`/`useSync` hooks, sync engine, conflict handling + queue pruning, wired into the UI; server `POST /sync` handler with last-write-wins logic.
- `feature/offline-sync-v3` — synced previously unsupported routes, added in-memory rate limiting for `/sync` and `/api/auth/login`, connectivity indicator rework, offline redirection out of chat, offline-aware UI (disabled camera/chat/face-upload), fixed participant rendering and face upload; merged into `main` via PR #15.
- `feature/admin-dashboard` (early) — admin dashboard UI + user CRUD (later superseded).
- `feature/chat-improvements` — chat bubbles with admin highlight, emoji reactions (server + client), sender avatars, and the light/dark mode theme work; currently the active branch (`origin/feature/chat-improvements`).
- `messages-update` — original chat feature work (Socket.io `/chat` namespace, message persistence, auth), merged via PR #7.

---

## 10. Pages (UI)

- **Dashboard / Overview** — instant snapshot of delegate status; real-time counter (present/overall)
- **Scanner** — QR/NFC and facial scanning
- **Profile Page** — CRUD operations for delegate profiles
- **Support Tickets** — CRUD operations
- **Directory** — all delegates' name and info; manual check-in; notes (badge missing, verified manually)
- **Missing List** — shows who is missing; call button for direct contact; toggle for special occasions
- **Sync Log** — connectivity indicator (offline/online/syncing); pending sync count
