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

### 4.2 Backend
- Node.js REST API (Express.js) for programmes, routes, attendance, user management, and chat
- Real-time sync: WebSockets (Socket.io) for instant multi-device attendance updates, in-app chat, and message reactions
- Database: PostgreSQL — stores programmes, participants, facial embeddings (vectors), scan events, chat messages, user accounts
- Offline queue processing: backend receives offline scans, validates embeddings, and merges with live data without duplication
- Auth: staff login via JWT; delegate identity verified by facial embedding similarity
- Hosting: must be accessible from China — Alibaba Cloud (Singapore/Hong Kong region) strongly preferred

### 4.3 Data & Privacy
- Delegate data: name, facial photograph (passport-sized JPEG), optional QR code ID, optional NFC tag ID
- Facial embeddings: stored in PostgreSQL as numeric vectors (face-api.js output); compared for similarity matching
- Staff data: account credentials, facial photo for login verification, permission levels
- Photos pre-registered by admin before the programme; staff updates own photo on first login
- Chat messages: retained for programme history; can be archived per admin policy
- Message reactions: one reaction per user per message (WhatsApp-style emoji); stored in `message_reactions` keyed on `(message_id, user_id)`; synced live over the `/chat` socket namespace via the `react` event and `reaction:update` broadcasts

### 4.4 Offline Sync Engine

#### Architecture
- **Client:** Dexie.js (IndexedDB) with `requestCache` and `pendingChanges` tables
- **Interception layer:** `services/api.js` `request()` caches GET responses; offline reads serve from cache, offline writes queue `{ method, path, body, token }` to `pendingChanges`
- **Auth endpoints:** `/api/auth` in `SYNC_PREFIXES`; login excluded via `NEVER_QUEUE`; token carried in ops for auth writes
- **Sync trigger:** `hooks/useSync.js` calls `sync/changeHandler()` on mount, `online` event, and tab `focus`; dispatches `sync:done` custom event after successful sync
- **Server:** `POST /sync` registered in `index.js` via `registerSyncRoutes(app)`; handled by `modules/sync/syncController.js` which replays ops against Sequelize models; auth ops validated via `parseToken()` + DB lookup
- **Vite proxy:** `/sync` added to `vite.config.js` proxy table so `changeHandler` fetch reaches Express (was root cause of silent sync failure)
- **Synced entity types:** programme, route, delegate, attendance, readyToDepart, auth (prefixed `/programmes`, `/delegates`, or `/api/auth`)
- **Not synced:** login (`/api/auth/login`), face recognition, QR scanning, chat, users (`/users`)

#### Client-side data flow
- `request()` in `api.js` checks `navigator.onLine`:
  - **Online:** fetch from server; cache GET responses in `requestCache` for synced paths
  - **Offline:** GET reads from `requestCache`; POST/PUT/DELETE pushes to `pendingChanges` and returns optimistic result (`{ ...body, id: 'pending' }`)
- **Components show optimistic data immediately via `setAccounts` (local state)** — `handleCreate`, `handleUpdate`, `handleDelete` in `ParticipantManagement.jsx` skip the stale cache and directly update state when offline
- **Offline-disabled UIs:** CameraPage capture/confirm buttons disabled; ChatInput shows "unavailable" placeholder; face upload skipped in ParticipantManagement

#### Sync lifecycle
1. **Queue:** offline writes accumulate in `pendingChanges` (IndexedDB, persists across sessions)
2. **Trigger:** `useSync.js` fires `changeHandler()` on mount, `online` event, or tab `focus` (with ref guard to prevent concurrent runs)
3. **Send:** `changeHandler()` does `POST /sync` with `{ ops, timestamp }`; on 200 OK, deletes `pendingChanges` and dispatches `sync:done`
4. **Server processing:** `syncController.js` `HANDLERS` map dispatches each op by `method + path` pattern; auth ops include `validateToken()` checks
5. **UI refresh:** components listen for `sync:done` via `window.addEventListener('sync:done', ...)` and `sync:done` event to re-fetch fresh data: `ParticipantManagement.jsx`, `ProgrammePage.jsx`, `directory.jsx`
6. **Connectivity indicator:** `useConnectivity.js` polls `pendingChanges` every 3s **and** listens for `sync:done` to instantly update `pendingCount`; camera & chat disabled when offline

### 4.5 Hardware (for Demo & Production)
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

## 9. Pages (UI)

- **Dashboard / Overview** — instant snapshot of delegate status; real-time counter (present/overall)
- **Scanner** — QR/NFC and facial scanning
- **Profile Page** — CRUD operations for delegate profiles
- **Support Tickets** — CRUD operations
- **Directory** — all delegates' name and info; manual check-in; notes (badge missing, verified manually)
- **Missing List** — shows who is missing; call button for direct contact; toggle for special occasions
- **Sync Log** — connectivity indicator (offline/online/syncing); pending sync count
