# System Architecture — OpenGlimpse

---

## 1. Overview

OpenGlimpse is a mobile-first web application that digitises headcount/attendance for SCCCI overseas business delegations. Staff point a phone camera at a group of delegates; faces are detected in real time, matched against pre-registered facial embeddings, and attendance records are synced across all staff devices in real time. QR badges are the backup identity method, and an AI chatbot answers questions about the programme from within the chat.

The system is a monorepo with three runtime processes plus one database:

| Process | Tech | Port | Responsibility |
|---------|------|------|----------------|
| Web client | React 19 + Vite 8 | 5173 (dev) | UI, camera/QR capture, offline queue, realtime views |
| API server | Node.js + Express + Socket.io | 3001 | REST API, auth, sync engine, WebSocket rooms, chatbot orchestration |
| Face service | Python FastAPI + DeepFace (FaceNet) | 8000 (loopback) | Face detection + embedding generation |
| Database | PostgreSQL (via Sequelize ORM) | 5432 | All persistence: users, delegates, programmes, embeddings, attendance, chat, offline queue |

---

## 2. Layers & Components

### 2.1 Frontend Layer (`src/client/`)

A React 19 SPA (Vite 8, JSX, Tailwind CSS v4, MUI icons) with React Compiler active via `babel-plugin-react-compiler`. Key responsibilities:

- **Live facial recognition camera** (`pages/facial_recognition/CameraPage.jsx`) — opens the device camera, displays bounding boxes around detected faces using `face-api.js` (SsdMobilenetv1 loaded from CDN), and submits captured frames as base64 to `POST /programmes/:id/recognize`. Dual-mode: facial recognition or QR code scanning. Front/back camera toggle.
- **QR scanner** (`components/qr_scanner/QrScanner.jsx`) — wraps `html5-qrcode`; camera-based QR decode; the decoded badge string goes to `POST /programmes/:id/scan-qr`. Canvas overlay renders green corner points and "Verified" text on successful scan.
- **Offline-first data layer** (`services/api.js` + `db/localDB.js` + `sync/syncEngine.js`) — all requests go through a single `request()` wrapper backed by Dexie.js v4 (IndexedDB):
  - GET responses for syncable paths are cached in `requestCache` (keyed by URL path);
  - offline writes accumulate in `pendingChanges` (single record with ops array) and replay via `POST /sync` when connectivity returns (`hooks/useSync.js`, `hooks/useConnectivity.js`);
  - optimistic UI updates (`{ id: 'pending' }`) keep screens usable offline;
  - components manually update local state on offline writes (Dashboard, Directory, ProgrammePage, ProfilePage) rather than relying solely on refetch.
- **Realtime** — two independent Socket.IO connections:
  - `services/socket.js` connects to the main server (`VITE_SOCKET_URL`); joins `programme:<id>` rooms to receive `attendance:updated` events; auto-reconnects with exponential backoff.
  - `pages/chat/chat.jsx` creates its own socket to the chat server (`VITE_CHAT_SERVER_URL/chat` namespace); handles `history`, `message`, `chatbot:typing`, `chatbot:stop` events.
- **UI modules**: Dashboard, Programme (routes/delegates/summary), Attendance, Camera, QR Scanner, Chat (with AI assistant), Directory, Profile, Badge, Sync Log, Staff Landing, Auth pages.

#### 2.1.1 Pages and Routes

| Route | Component | Access | Purpose |
|-------|-----------|--------|---------|
| `/` | Dynamic `LandingPage` | Public | Onboarding (unauthenticated), StaffLandingPage (staff), BadgePage (participant) |
| `/onboarding` | `Onboarding` | Public | Welcome screen with login link |
| `/login` | `Login` | Public | Email/password login form |
| `/profile` | `ProfilePage` | Authenticated | Profile editing + participant management (staff-only tab) |
| `/chat` | `Chat` | Authenticated | Real-time event chat with AI assistant |
| `/camera` | `CameraPage` | Staff only | Facial recognition + QR code scanner for attendance |
| `/dashboard` | `AdminDashboard` | Staff only | Live attendance dashboard with route-based views |
| `/dashboard/routes/:routeId` | `AdminDashboard` | Staff only | Deep-linked to a specific route view |
| `/directory` | `Directory` | Authenticated | Delegate directory with search, filter, route assignment |
| `/programmes` | `ProgrammePage` | Staff only | Programme CRUD (list, create, edit, delete) |
| `/programmes/:id/*` | `ProgrammeDetailPage` | Staff only | Tabbed detail view (Routes, Summary, Manage Programme) |
| `/badge` | `BadgePage` | Participant | QR code badge display |

#### 2.1.2 Component Hierarchy

```
App.jsx
├── ConnectivityIndicator          (always visible, shows online/offline/syncing)
├── BottomNav                      (role-conditional: staff vs participant tabs)
└── Routes
    ├── Onboarding / Login
    ├── StaffLandingPage           (staff summary stats + quick actions)
    ├── Dashboard (AdminDashboard) (programme picker, route cards, delegate list, profile sheet)
    │   └── /dashboard/routes/:routeId  (deep-linked route view)
    ├── CameraPage                 (FR mode + QR mode, batch confirm)
    │   └── QrScanner
    ├── ProgrammePage              (programme list + create/edit modal)
    ├── ProgrammeDetailPage        (tabbed: Routes, Summary, Manage Programme)
    │   ├── RoutesTab              (route CRUD + RouteManageModal)
    │   ├── SummaryTab             (attendance summary + unidentified scans)
    │   └── ManageProgrammeTab     (programme edit/delete)
    ├── Directory                  (delegate list, search, filter, profile sheet, route assignment)
    ├── Chat                       (real-time messages, AI bot, @mention autocomplete)
    │   ├── ChatBubble             (own/other/bot message rendering, Markdown for bot)
    │   ├── ChatInput              (textarea with @autocomplete, Shift+Enter newlines)
    │   └── ReactionBar            (quick-emoji palette for WhatsApp-style reactions)
    ├── ProfilePage                (profile edit + ParticipantSection for staff)
    └── BadgePage                  (QR code display for participants)
```

**Shared components** (`components/shared/`):
- `Toast.jsx` — auto-dismissing success/error/info notification
- `ConfirmModal.jsx` — confirmation dialog with title, message, confirm/cancel
- `ConnectivityIndicator.jsx` — fixed top bar showing sync/offline status
- `Placeholder.jsx` — stub component (unused)

#### 2.1.3 Styling

Tailwind CSS v4 utility classes used inline throughout JSX, supplemented by a large `index.css` (~990 lines) defining semantic class names via `@apply` for chat, dashboard, directory, auth forms, profile sheets, etc. MUI v9 provides icon components; `lucide-react` supplies the bottom-nav icons.

**Theming** — dark mode is default-on and user-toggleable from the Profile page ("Appearance" section). A `ThemeProvider` (`hooks/useTheme.js`) wraps the app in `main.jsx`; a pre-paint inline script in `index.html` applies the persisted `openglimpse-theme` value to the `.dark` class on `<html>` before first render to avoid a flash. Because Tailwind v4 emits `var(--color-*)` in every utility, `index.css` remaps those variables inside a `.dark` scope to re-theme surfaces/borders/text from a single block. The accent colour is user-selectable (blue/purple/red/green, persisted as `openglimpse-accent` and applied via `data-accent` on `<html>`); `index.css` maps each accent to `--grad-*` variables shared by the `bg-sky-gradient` button/bubble gradients (primary buttons, chat send button/bubbles, auth buttons, active nav).

---

### 2.2 Backend Layer (`src/server/`)

Express application, single `index.js` entrypoint. Responsibilities:

- **REST API** — routes registered by:
  - `modules/programmes/index.js` — programmes, routes, delegates, attendance, ready-to-depart, recognize, scan-qr
  - `modules/auth/authRoutes.js` — `/api/auth/*`
  - `modules/facial_recog/facialrecogserver.js` — `/api/user/:id/face*`
  - `modules/sync/syncRoutes.js` — `POST /sync`
- **Auth** — base64-encoded tokens (`id:role`, NOT signed JWT); middleware validates tokens on protected endpoints; SHA-256 password hashing; in-memory rate limiting for `/api/auth/login` (10/min) and `/sync` (60/min).
- **Face matching** — `recognize.controller.js` submits the captured image to the Face service, compares returned embeddings (cosine similarity >= 0.5) against stored `primary` embeddings, records `ScanEvent`s (verified/unverified), and returns matches sorted by confidence. Unverified scans power the admin alert list.
- **Sync engine** — `syncController.js` replays offline ops by pattern-matching `method + path` against a `HANDLERS` table; auth ops are re-validated with the embedded token; supports programmes, routes, delegates, attendance, ready-to-depart, and auth operations.
- **Realtime** — Socket.io main namespace handles `join:programme`/`leave:programme` rooms and broadcasts `attendance:updated`; the `/chat` namespace handles messaging, history, and chatbot flow.
- **Chatbot** — `modules/chatbot/chatbot.js` builds a live programme context (delegates, routes, attendance summary, staff) and calls the Groq API (`gpt-oss-20b`, configurable via `GROQ_MODEL`) when a message starts with the trigger prefix (default `@assistant`). The chatbot is a seeded user (`ai-assistant@openglimpse.com`).

#### 2.2.1 Startup Sequence (`index.js`)

1. Create Express app + HTTP server, wrap with Socket.IO (CORS-aware)
2. Mount middleware: JSON body parser (10 MB), rate limiter (per-IP), CORS headers
3. Attach chat server (`/chat` namespace) to Socket.IO instance
4. Attach face recognition REST routes to Express
5. Register Socket.IO namespace events: `join:programme`, `leave:programme`
6. Register programme routes, auth routes, sync routes
7. Add health check (`GET /`) and users endpoint (`GET /users`)
8. `sequelize.sync({ alter: true })` — auto-migrate all models
9. Seed `RouteMember` table from legacy data if empty
10. Seed default staff user (`admin@openglimpse.com` / `admin123`) if none exists
11. Seed AI chatbot user (`ai-assistant@openglimpse.com`)
12. Spawn Python FaceNet server (`facenetClient.js` — auto-installs deps, starts uvicorn)
13. Start listening on port 3001

#### 2.2.2 Complete API Endpoints

**Authentication:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth` | Staff | Create user account |
| `POST` | `/api/auth/login` | Public | Login, returns token + user info |
| `GET` | `/api/auth/all` | Staff | List all users |
| `PATCH` | `/api/auth` | Authenticated | Update account (self or any for staff) |
| `DELETE` | `/api/auth` | Staff | Delete user + face embeddings |

**Face Recognition (REST):**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/user/:id/face` | Upload face image (base64), compute + store embeddings (cache type) |
| `PATCH` | `/api/user/:id/face/default` | Replace primary face embeddings |
| `GET` | `/api/user/:id/face/default` | Get user's primary face embeddings + image |

**Programmes:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/programmes` | List all (with delegate counts) |
| `POST` | `/programmes` | Create programme |
| `PUT` | `/programmes/:id` | Update programme + manage delegates |
| `DELETE` | `/programmes/:id` | Delete programme (cascades) |

**Routes (within programme):**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/programmes/:id/routes` | List routes (optional `?archived=true`) |
| `GET` | `/programmes/:id/routes/:routeId` | Get single route with counts |
| `POST` | `/programmes/:id/routes` | Create route |
| `PUT` | `/programmes/:id/routes/:routeId` | Update route + manage members |
| `PUT` | `/programmes/:id/routes/:routeId/archive` | Soft-archive route |
| `PUT` | `/programmes/:id/routes/:routeId/restore` | Restore archived route |
| `DELETE` | `/programmes/:id/routes/:routeId` | Hard-delete route |

**Delegates:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/programmes/:id/delegates` | List delegates (with attendance, routes) |
| `POST` | `/programmes/:id/delegates` | Add delegates (multiple body formats supported) |
| `PATCH` | `/delegates/:delegateId` | Update delegate |
| `DELETE` | `/programmes/:id/delegates/:delegateId` | Remove delegate (cascades attendance + routes) |
| `PUT` | `/programmes/:id/delegates/:delegateId/routes` | Set route assignment |
| `GET` | `/programmes/:id/delegates/:delegateId/routes` | Get route assignment |

**Attendance:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/programmes/:id/attendance` | Full attendance (present + missing + unidentified) |
| `POST` | `/programmes/:id/attendance` | Batch mark attendance |
| `PUT` | `/programmes/:id/attendance/:delegateId` | Mark single delegate (present/absent) |
| `GET` | `/programmes/:id/attendance/summary` | Summary stats per programme + per route |

**Ready to Depart:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/programmes/:id/routes/:routeId/ready-to-depart` | Get ready status |
| `PUT` | `/programmes/:id/routes/:routeId/ready-to-depart` | Toggle ready (boolean) |

**Recognition & QR:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/programmes/:id/recognize` | Face recognition scan (base64 image) |
| `POST` | `/programmes/:id/scan-qr` | QR badge lookup |

**Sync:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sync` | Batch replay of offline operations |

**Misc:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/users` | List all users (id, enName, zhName) |

#### 2.2.3 WebSocket Events

**Main namespace (attendance sync):**

| Event | Direction | Description |
|-------|-----------|-------------|
| `join:programme` | Client -> Server | Join programme room |
| `leave:programme` | Client -> Server | Leave programme room |
| `attendance:updated` | Server -> Room | Attendance change broadcast |

**`/chat` namespace (messaging + AI):**

| Event | Direction | Description |
|-------|-----------|-------------|
| `connection` | Client -> Server | Connect with auth token |
| `chatbot:config` | Server -> Client | Bot userId + trigger prefix |
| `history` | Server -> Client | Full message history |
| `chat:join` | Client -> Server | Join programme context |
| `message` | Client -> Server | Send message (max 1000 chars) |
| `message` | Server -> All | Broadcast new message |
| `react` | Client -> Server | Toggle an emoji reaction on a message (same emoji removes it) |
| `reaction:update` | Server -> All | Aggregated `{ emoji, userIds[] }` list for a message |
| `chatbot:typing` | Server -> All | Bot started generating |
| `chatbot:stop` | Server -> All | Bot finished or errored |
| `error` | Server -> Client | Error notification |

---

### 2.3 Face Service (`src/server/python_server/server.py`)

A thin FastAPI service wrapping DeepFace with the Facenet model, spawned and supervised by the Node backend (`facenetClient.js` — auto-installs pip deps from `requirements.txt`, starts uvicorn, kills subprocess on SIGINT/SIGTERM):

| Endpoint | Purpose |
|----------|---------|
| `POST /embed` | Single face -> 128-dim embedding |
| `POST /detect` | Face bounding boxes only |
| `POST /embed-all` | Crop + embed every face in a frame; returns crops, embeddings, bbox |

Not reachable from the client — only the API server talks to it over loopback HTTP (multipart file upload). Uses OpenCV for image processing, numpy for arrays.

---

### 2.4 Database (`src/server/database/db.cjs`)

PostgreSQL accessed exclusively through Sequelize (`sequelize.sync({ alter: true })` at startup). Seventeen Sequelize models are defined in `db.cjs`; twelve back active features, while `attendee`, `admin`, `Staff`, `ChatMessage`, and `OfflineQueue` are legacy/vestigial (see notes):

| Model | Table | Key Fields | Purpose |
|-------|-------|------------|---------|
| `user` | `users` | id (UUID), enName, zhName, email (unique), passwordHash, photoUrl, role (`staff`/`participant`) | Auth accounts |
| `messages` | `messages` | id, content, timestamp, senderId (FK -> users) | Chat messages (used by chat server) |
| `attendee` | `attendees` | id, name | Legacy model (unused) |
| `admin` | `admins` | id, name, privileges | Legacy model (unused) |
| `faceEmbeddings` | `face_embeddings` | imageHash (PK), userId, imageType (`primary`/`cache`), imageData (BLOB), embeddings (JSON), model | Face vector storage |
| `Programme` | `programmes` | id (UUID), name, startDate, endDate, status (`draft`/`active`/`completed`) | Event programmes |
| `Route` | `routes` | id, programmeId, name, archived | Transport routes per programme |
| `Delegate` | `delegates` | id, name, badge, photoUrl, userId (FK -> user) | Event attendees |
| `AttendanceRecord` | `attendance_records` | id, programmeId, delegateId, status (`present`/`absent`), method (`auto`/`manual`/`qr`), checkedInAt, checkedInBy, notes | Attendance tracking |
| `ReadyToDepart` | `ready_to_depart` | id, programmeId, routeId, ready, toggledBy, toggledAt | Per-route departure readiness |
| `ProgrammeDelegate` | `programme_delegates` | id, programmeId, delegateId (unique compound), notes | Many-to-many: delegates in programmes |
| `RouteMember` | `route_members` | id, routeId, delegateId, programmeId (unique on programme+delegate) | Many-to-many: delegates on routes |
| `Staff` | `staff` | id, name, email, passwordHash, photoUrl, role (`admin`/`staff`) | Separate staff model (unused — auth uses `user`) |
| `ScanEvent` | `scan_events` | id, programmeId, delegateId, confidence, status (`verified`/`unverified`), unverifiedReason, boundingBoxId, scannedAt | Face recognition audit log |
| `ChatMessage` | `chat_messages` | id, programmeId, senderId, text, sentAt | Programme-scoped chat (not used by chat server) |
| `MessageReaction` | `message_reactions` | id, messageId (FK -> messages), userId (FK -> users), emoji; unique on (message_id, user_id) | Per-user emoji reactions on chat messages |
| `OfflineQueue` | `offline_queue` | id, scanId (unique), deviceId, programmeId, payload (JSONB), syncedAt, processed | Defined but unused — offline sync replays ops via `POST /sync` instead |

**Key associations:**
- Programme 1:N Route, AttendanceRecord, ProgrammeDelegate, ScanEvent, ChatMessage, OfflineQueue
- Route 1:1 ReadyToDepart, 1:N RouteMember
- Delegate 1:N AttendanceRecord, ProgrammeDelegate; N:1 user
- ProgrammeDelegate belongsTo Programme + Delegate
- RouteMember belongsTo Route + Delegate + Programme
- user 1:N Messages (senderId); Messages 1:N MessageReaction (messageId); user 1:N MessageReaction (userId)

Face images and embeddings are stored **in PostgreSQL** (`faceEmbeddings.imageData` BLOB + `embeddings` JSON text) — there is no external file storage.

---

## 3. Data Flows

### 3.1 Facial Recognition Attendance (Primary Flow)

```
Staff opens CameraPage for a programme
    -> Live video via face-api.js (SsdMobilenetv1) shows bounding boxes
    -> Staff captures frame (base64 JPEG)
    -> POST /programmes/:id/recognize { image: "<base64>" }

Server:
    1. Decode base64 -> buffer
    2. Call Python FaceNet /embed-all -> per-face crops + 128-dim embeddings
    3. Load all faceEmbeddings where imageType = 'primary' from DB
    4. For each captured face x each stored embedding:
       -> cosineSimilarity >= 0.5?
       -> Find Delegate by userId, verify in Programme via ProgrammeDelegate
    5. Create ScanEvent records (verified or unverified)
    6. Return matches sorted by confidence (descending)

Staff sees matched delegates with confidence scores
    -> Selects/deselects delegates
    -> Confirms batch -> POST /programmes/:id/attendance { records: [...] }

Server:
    -> AttendanceRecord.markAttendance() upserts record
    -> Emits 'attendance:updated' to programme:<id> room

All staff dashboards refresh instantly via Socket.IO
```

### 3.2 QR Badge Lookup (Backup Flow)

```
Staff switches to QR mode on CameraPage
    -> html5-qrcode decodes badge string
    -> POST /programmes/:id/scan-qr { badge: "<decoded>" }
    -> Server resolves badge -> delegate -> same attendance path with method: 'qr'
```

### 3.3 Offline Sync

```
Client (offline):
    -> api.js request() checks navigator.onLine
    -> GET: returns cached data from requestCache (IndexedDB)
    -> POST/PUT/DELETE: appends op to pendingChanges.current.ops
    -> Returns optimistic response ({ id: 'pending' })
    -> Components update local state immediately (Dashboard, Directory, ProgrammePage, ProfilePage)

Client (online / tab focus):
    -> useSync.js triggers changeHandler()
    -> Reads pendingChanges from IndexedDB
    -> POST /sync { ops: [{method, path, body}, ...], timestamp }
    -> On success: deletes pendingChanges, dispatches CustomEvent('sync:done')

Server (POST /sync):
    -> authMiddleware validates caller
    -> For each op:
       -> matchRoute(method, path) finds handler + extracts :param segments
       -> If auth op: validate caller's token from op.token
       -> If non-auth: require staff role
       -> Execute handler(params, body, token)
    -> Returns { ok: true }

Components listen for 'sync:done' to refresh stale data
ConnectivityIndicator polls pendingChanges every 3s for pending count
```

### 3.4 Chat + AI Chatbot

```
Client connects to /chat namespace with base64 token
    -> Chat server auth middleware validates token
    -> Server sends: chatbot:config { userId, trigger }, history { messages }

Client sends: chat:join(programmeId)
    -> Joins programme room for message scoping

User types: "@assistant How many delegates are missing?"
    -> Client sends: message { text: "@assistant How many delegates are missing?" }
    -> Server saves message, broadcasts to room
    -> Detects @assistant trigger prefix
    -> buildProgrammeContext(programmeId):
       -> Queries DB for programme name/dates/status, delegates, routes, attendance, staff
       -> Builds structured text context
    -> getChatbotResponse(query, context, chatbotUserId, senderId):
       -> Retrieves last 10 messages between sender and bot
       -> Constructs system prompt with programme context + sender identity
       -> Calls Groq API (gpt-oss-20b, temperature 0.5, max 1024 tokens)
    -> Saves bot message as Messages record, broadcasts to room
    -> Client renders via ChatBubble (Markdown rendering for bot responses)
```

### 3.5 Face Registration

```
Admin creates user with face image via ProfilePage -> ParticipantSection
    -> POST /api/user/:id/face { image: "<base64>" }

Server:
    -> facialrecogserver.js receives request
    -> FaceEmbeddings.createFromImage(userId, imageData, 'cache')
       -> facenetClient.getFaceEmbeddings(buffer)
          -> HTTP POST /embed-all -> Python FastAPI (DeepFace Facenet)
       -> Store each face: imageHash, userId, imageType='cache', imageData, embeddings, model

Admin sets default face:
    -> PATCH /api/user/:id/face/default { image: "<base64>" }
    -> Deletes old 'primary' embeddings, stores new ones as 'primary'
```

---

## 4. Technology Choices

| Concern | Choice | Why |
|---------|--------|-----|
| UI | React 19 + Vite 8 + Tailwind CSS v4 | Fast mobile-first SPA; React Compiler for performance; team familiarity |
| Icons/UI primitives | MUI v9 | Mature component library, icon set |
| Real-time | Socket.io | Rooms per programme; automatic reconnection; multi-device attendance sync |
| Offline | Dexie.js v4 (IndexedDB) + server replay endpoint | Zero data loss on flaky cellular/hotspot connections; queue survives page reloads |
| Face detection (client) | face-api.js (SsdMobilenetv1, CDN) | Real-time bounding boxes in browser; no server roundtrip for detection |
| Face recognition (server) | DeepFace / FaceNet via FastAPI | Accurate, free, runs locally (no external face API -> no GFW issues, no per-call cost); embeddings stored in Postgres |
| Matching | Cosine similarity in Node (>= 0.5 threshold) | Simple, transparent; embeddings stay in the DB as JSON |
| Database | PostgreSQL + Sequelize | Relational integrity for programmes/routes/delegates; `alter: true` auto-migration for demos |
| Auth | Base64 token (`id:role`) + SHA-256 hashes | Simple and sufficient for the demo scope; rate limiting protects login/sync |
| Chatbot | Groq API (`gpt-oss-20b`) | Fast inference; full programme context in system prompt |
| Hosting | Alibaba Cloud (SG/HK), China-accessible | Must not be blocked by the Great Firewall (P1 requirement) |
| QR | html5-qrcode (client-side decode) | No hardware readers needed; badges are printed codes |
| QR badge display | qrcode.react | Renders the participant's personal QR code on BadgePage |
| Bot markdown | marked | Renders chatbot responses as Markdown in chat bubbles |
| Nav icons | lucide-react | Floating bottom-nav + theme toggle icons (alongside MUI icons) |
| Offline DB | Dexie.js with `requestCache` + `pendingChanges` tables | Typed IndexedDB wrapper; persists across sessions |

---

## 5. Project Structure Navigation

```
OpenGlimpse/
├── PROJECT_DOCUMENTATION.md      # main project doc (use cases, requirements, tech stack)
├── docs/                         # detailed documentation
│   ├── architecture.md           # THIS FILE — system overview
│   ├── ryan/                     # per-member deep dives
│   │   ├── use-cases.md          # all-role use cases (FR, QR, alerts, chatbot)
│   │   ├── api-documentation.md  # every endpoint, payloads, error codes
│   │   └── database-schema.md    # ER diagram + table definitions
│   └── Matthias/                 # per-member deep dives
│       ├── use-cases.md
│       ├── api-documentation.md
│       └── database-schema.md
└── src/
    ├── client/                   # FRONTEND (React SPA)
    │   ├── src/
    │   │   ├── main.jsx          # Root: BrowserRouter + ThemeProvider
    │   │   ├── App.jsx           # Root: useSync(), routes, BottomNav, ConnectivityIndicator
    │   │   ├── pages/
    │   │   │   ├── auth/         # Onboarding, Login, ProfilePage, ParticipantManagement
    │   │   │   ├── chat/         # Chat (Socket.IO /chat), ChatBubble, ChatInput, ReactionBar
    │   │   │   ├── dashboard/    # AdminDashboard (programme picker, route cards, delegate list)
    │   │   │   ├── directory/    # Directory (delegate list, search, filter, profile sheet)
    │   │   │   ├── facial_recognition/  # CameraPage (FR + QR dual mode)
    │   │   │   ├── programmes/   # ProgrammePage, ProgrammeDetailPage, RoutesTab, SummaryTab, ManageProgrammeTab, DelegatesTab, RouteManageModal, UserPicker
    │   │   │   ├── staff/        # StaffLandingPage (summary stats, quick actions)
    │   │   │   └── badge/        # BadgePage (QR code display for participants)
    │   │   ├── components/
    │   │   │   ├── navbar/       # BottomNav (role-conditional tabs)
    │   │   │   ├── qr_scanner/   # QrScanner (html5-qrcode wrapper)
    │   │   │   └── shared/       # Toast, ConfirmModal, ConnectivityIndicator
    │   │   ├── services/         # api.js (offline-aware requests), socket.js (main server), utils.js
    │   │   ├── hooks/            # useSync.js (sync trigger), useConnectivity.js (online/sync state), useTheme.js (dark mode + accent)
    │   │   ├── db/localDB.js     # Dexie schema (requestCache, pendingChanges)
    │   │   └── sync/syncEngine.js # changeHandler + sync:done dispatch
    │   ├── public/               # icons.svg, favicon.svg
    │   └── vite.config.js        # Proxy /api + /sync + /programmes + /delegates + /users + /socket.io -> :3001
    └── server/                   # BACKEND (Node.js Express)
        ├── index.js              # App bootstrap, rate limiter, CORS, socket wiring, seeding
        ├── database/
        │   ├── db.cjs            # All 17 models, associations, business logic methods
        │   └── dbcrudmethods.js  # OOP CRUD wrappers (User, FaceEmbeddings, Messages, Reactions)
        ├── modules/
        │   ├── auth/             # authRoutes.js — /api/auth/* + token middleware
        │   ├── programmes/       # controllers: programmes, routes, delegates, attendance, ready, qr, recognize
        │   │   └── models/       # Pass-through to db.cjs
        │   ├── sync/             # syncRoutes.js + syncController.js (POST /sync replay)
        │   ├── chat/             # chatserver.cjs — Socket.io /chat namespace + chatbot trigger
        │   ├── chatbot/          # chatbot.js — Groq API + programme context builder
        │   └── facial_recog/     # facialrecogserver.js (face routes), facenetClient.js (spawn/supervise Python), startFaceNet.js
        ├── python_server/
        │   ├── server.py         # FastAPI + DeepFace (Facenet), /embed, /detect, /embed-all
        │   └── requirements.txt  # Python dependencies
        └── package.json          # Node dependencies
```

### Where to look for specific features

- **Facial recognition**: `src/server/modules/programmes/recognize.controller.js` (matching + threshold), `src/server/python_server/server.py` (embedding), `src/client/src/pages/facial_recognition/CameraPage.jsx` (camera/boxes), `src/server/database/db.cjs` (`faceEmbeddings`).
- **QR backup**: `src/server/modules/programmes/qr.controller.js`, `src/client/src/components/qr_scanner/QrScanner.jsx`.
- **Unidentified alerts**: `ScanEvent` (unverified) -> `GET /programmes/:id/attendance` + `/summary`.
- **Chatbot**: `src/server/modules/chat/chatserver.cjs` (trigger + flow), `src/server/modules/chatbot/chatbot.js` (context + Groq).
- **Offline sync**: `src/client/src/services/api.js`, `sync/syncEngine.js`, `src/server/modules/sync/syncController.js`.
- **Realtime**: `src/server/index.js` (rooms), `attendance.controller.js` (emits).
- **Auth**: `src/server/modules/auth/authRoutes.js` (login, CRUD, token middleware).
- **Database models**: `src/server/database/db.cjs` (all 17 models + associations + business logic).

---

## 6. Cross-Cutting Concerns

- **Security**: Base64 token auth on protected routes, staff role gates (`ensureStaff`), rate limiting on login/sync, no secrets in client code (API key stays server-side in `.env`). Password hashing uses SHA-256 (not bcrypt). Face recognition routes (`/api/user/:id/face/*`) currently have no auth middleware.
- **Offline resilience**: Camera capture and chat are disabled when offline; writes queue in IndexedDB; optimistic UI updates keep screens usable; server replays ops on `POST /sync`; `sync:done` events refresh stale UI; `ConnectivityIndicator` polls pending count every 3s.
- **Privacy**: Delegate photos/embeddings stored only in the project's own PostgreSQL; no third-party face APIs called at runtime; face matching runs on the local Face service.
- **Startup order**: `index.js` syncs the DB and seeds (default admin, AI Assistant user), then starts the Face service (installs deps on first run) and listens for HTTP.
- **Known architectural notes**: The `Staff`, `attendee`, and `admin` models in `db.cjs` are unused (auth operates on `user`). The `ChatMessage` model exists but the chat server uses the `Messages` model; `OfflineQueue` is defined but offline sync replays ops via `POST /sync` instead. Auth token is base64-encoded (not signed JWT). Two independent Socket.IO connections exist (main server + chat server).
- **Dead code / cleanup candidates**: `DelegatesTab.jsx` (`src/client/src/pages/programmes/`) is never imported; `Placeholder.jsx` and the `@mui/x-chat` dependency are unused; a stray Python venv lives in `src/client/testing/` (untracked). The sync test harness referenced by `npm run test:sync` in both `src/client/package.json` and `src/server/package.json` (`tests/sync/*`, `tests/server-replay.test.cjs`) is not present in the repo — only the endpoint smoke tests under `tests/` exist.
- **Mixed module systems**: `.cjs` files use CommonJS; `facenetClient.js` uses ESM (dynamically imported in `index.js`).

> This document reflects the deployed system and should be updated whenever the architecture changes (new modules, layers, or technology choices).
