# OpenGlimpse — SCCCI Delegation Attendance System

## Project Overview
Real-time facial recognition attendance system for SCCCI overseas business delegations (15–100+ pax across multiple coaches). Mobile-first React app with offline-capable scanning, multi-staff real-time sync, and QR/NFC backup.

**Target metrics:** <1 min for 30 pax, <2 min for 100+ pax, ≥99% face match accuracy (with staff confirmation), zero data loss on offline sync.

---

## Branch & Workflow Rules

| Branch | Purpose |
|--------|---------|
| `main` | Final reviewed, confirmed code only. Ryan or Rayhan must review before merge. |
| `test` | Target branch for all PRs. All code must be tested here before going to `main`. |
| Feature branches | One branch per major feature, under a subfolder naming convention. |

**Workflow:** Finish feature on feature branch → merge into `test` branch and test changes locally → push to `test` → send PR to `main` with changes → wait for review.

---

## Team Roles

| Member | Module | Responsibilities |
|--------|--------|------------------|
| **Ryan** | General Image Recognition | Face detection (bounding boxes, face-api.js), embedding generation & matching, QR code backup, in-app alerts for unidentified faces |
| **Xin Ying (XY)** | Programme Creation & Attendance | Programme/route/bus creation, attendance marking UI, present/absent lists, ready-to-depart indicator, attendance summary aggregation |
| **Matt** | Registration & Profile | Admin CRUD for accounts, staff login, facial verification on first login, profile management, permission levels |
| **Rayhan** | Navbar, Chat & Offline Sync | Navigation component, in-app chat + announcements, frontend offline queue (localStorage), backend offline sync with deduplication, WebSocket integration |

---

## Tech Stack

- **Frontend:** React.js (Vite), face-api.js (face detection/embeddings), MUI components, React Router
- **Backend:** Node.js + Express, Socket.io (real-time WebSocket sync), Axios
- **ML Server:** Python FastAPI + HuggingFace models (facial embedding verification)
- **Database:** PostgreSQL with pgvector (facial embeddings), SQLite (local/offline fallback)
- **Auth:** JWT tokens
- **Hosting:** Alibaba Cloud (Singapore/HK region — must be accessible from China)

---

## Folder Structure

```
src/
  client/
    assets/
    src/
      components/
        <one folder per module>
      pages/
        <one folder per module>
    <vite configs>
  server/
    database/
    modules/
      <one folder per module>
    index.js
README.md
PROJECT_DOCUMENTATION.md
.gitignore
```

---

## API & Integration Points

- **Face scans:** `POST /programmes/{id}/scans` — embedding + confidence score
- **Manual attendance:** `PUT /programmes/{id}/attendance/{delegateId}` — mark present/absent
- **Real-time sync:** WebSocket event `attendance:updated` — all devices refresh dashboard
- **Offline queue:** Client buffers scan payloads with unique ID (timestamp + device ID); backend deduplicates on sync
- **Auth:** JWT tokens from auth endpoint, validated by all API consumers

---

# Reasoning
Before writing any code, first, examine the folder structure, and any relevant files to understand the project. Read the PROJECT_DOCUMENTATION.md file, and update it with new information as you add new features or if any information is missing.
Next, look at the user's query and reason through what needs to be done for it to be implemented, consult documentation before implementing anything, plan out a list of functions or other functionality you want to implement
Before implementing any code, look up for keywords of the code you want to implement from the previous step, and reuse the code rather than creating redundant functions
Finally, you can implement the code, ensure that the style guide is followed

# Coding Guide:
## General Style
Do not use excessive or aesthetic comments, keep comments and documentation to a minimal
Do not modify the README.md file, do not create any new files for documentation or any other purposes unless explicitly instructed to

## Client Side/ React Code
For client side code, ensure that all react components are properly split into components
Each reusable component should have its own file within its own module folder, any components that only need to be used within a component can be placed in that file

## Server Side / Node js Code
Any Express.js routing code should be placed in the index.js file
Any module specific code must remain inside the module folder

---

## Priority Features (P1 — MVP)

- Facial recognition with real-time face detection (bounding boxes in camera view)
- Face embedding generation & storage in PostgreSQL
- Manual identity confirmation for low-confidence matches
- Offline sync queue (frontend buffers, backend merges on reconnect)
- Real-time attendance dashboard (present/absent/unidentified lists)
- Multi-staff cloud sync via WebSockets
- Programme & route creation
- Staff account management (CRUD + login + face verification on first login)
- In-app alerts for unidentified faces
- China-accessible hosting

## Lower Priority

- P2: QR code backup, attendance summary, ready-to-depart indicator, in-app chat & announcements, navbar
- P3: User profile management, role-based access control, message history archive

## Out of Scope

- GPS/location tracking (client uses WhatsApp)
- Liveness detection / anti-spoofing
- Government compliance audit trails
- External system integrations
- Push notifications beyond in-app alerts
- Voice/video calls (WhatsApp remains communication channel)
