# Use Cases — Ryan (Facial Recognition, QR Codes, Chatbot)

All user roles of OpenGlimpse: **Admin / Trip Manager (Staff)**, **Secretariat Staff (Staff)**, and **Delegate (Participant)**. Each use case names the actor, trigger, main flow, and edge-case / alternative flows.

**Scope:** These use cases cover Ryan's features only — face recognition, QR codes, and the chatbot. Flows reference supporting features owned by other members (auth/login, programme & delegate management, attendance, and offline `/sync`); those are documented by their respective owners.

---

## 1. Real-Time Facial Recognition Attendance

### 1.1 UC-FR-01: Automatically Mark Delegate Present via Facial Recognition

- **Actor:** Secretariat Staff (primary), Delegate (secondary)
- **Trigger:** Delegate boards a coach or enters a venue while staff has the camera open on the attendance screen.
- **Main flow:**
  1. Staff opens the camera screen for the assigned programme/route.
  2. The app captures the video stream and detects faces in real time.
  3. A bounding box is drawn around every detected face in the camera view so staff can confirm all faces are being captured.
  4. The app submits each captured face image to `POST /programmes/:id/recognize`.
  5. Backend generates a FaceNet embedding for each face and compares (cosine similarity, threshold ≥ 0.5) against stored `primary` face embeddings in the `faceEmbeddings` table.
  6. For each match, a verified `ScanEvent` is created (programme module's `scan_events` table) and the delegate match is returned with confidence score.
  7. Staff confirms the match; `PUT /programmes/:id/attendance/:delegateId` is called with `status: present`, `method: auto` (attendance endpoint — programme module).
  8. All staff devices receive the `attendance:updated` WebSocket event and the dashboard updates in real time (socket broadcast — programme module).
- **Edge / alternative flows:**
  - *No face detected in image:* backend creates an `unverified` ScanEvent with reason "No face detected in image" and returns an empty `matches` array (no error thrown).
  - *No matching face found:* backend creates an `unverified` ScanEvent ("No matching face found"); admin receives the alert via dashboard `unidentified` list.
  - *Low confidence match:* staff manually confirms identity from the top-candidate list, or falls back to QR scan.
  - *Delegate not registered in this programme:* match is skipped server-side (`inProgramme` check).
  - *Multiple faces in frame:* each face is matched independently; multiple matches are returned sorted by descending confidence.
  - *Offline:* camera capture is disabled; queued offline scans are synced via `POST /sync` when connectivity returns (sync module).

### 1.2 UC-FR-02: Register a Delegate's Face During Account Creation

- **Actor:** Admin / Trip Manager
- **Trigger:** A new user account (delegate or staff) is created and a facial photo needs to be stored.
- **Main flow:**
  1. Admin submits `POST /api/auth` with user details and an optional base64 `faceImage` (account creation — auth module).
  2. `FaceEmbeddings.createFromImage` sends the image to the Python FaceNet server (`/embed-all`).
  3. Each detected face crop is embedded and stored in `faceEmbeddings` with `imageType: 'primary'`.
  4. The photo is retrievable later via `GET /api/user/:id/face/default`.
- **Edge / alternative flows:**
  - *Face upload fails* (e.g., no face detected): failure is logged but account creation still succeeds.
  - *User uploads a new photo later:* `PATCH /api/user/:id/face/default` deletes all existing `primary` embeddings for the user and replaces them with the new image's embeddings.
  - *Multiple faces in the photo:* one embedding record is created per detected face.

### 1.3 UC-FR-03: Verify Staff Identity on First Login

- **Actor:** Secretariat Staff
- **Trigger:** New staff member's first login after account creation.
- **Main flow:**
  1. Staff logs in via `POST /api/auth/login` (login — auth module).
  2. App compares the live face against the user's stored `primary` face embedding (`GET /api/user/:id/face/default`).
  3. On match, access is granted to staff screens.
- **Edge / alternative flows:**
  - *No face stored:* app prompts staff to upload a photo (`PATCH /api/user/:id/face/default`).
  - *Verification fails:* staff retries in better lighting; login itself is still credential-based, so staff can fall back to QR/manual attendance.

---

## 2. QR Code Backup Scanning

### 2.1 UC-QR-01: Scan QR Badge to Mark Delegate Present

- **Actor:** Secretariat Staff (primary), Delegate (secondary)
- **Trigger:** Facial recognition fails or is unavailable; delegate presents the QR code from their badge (or from a tab on their phone).
- **Main flow:**
  1. Staff switches to the QR scanner tab in the app.
  2. The camera reads the QR code, which encodes the delegate's badge string.
  3. App calls `POST /programmes/:id/scan-qr` with the scanned `badge` value.
  4. Backend resolves the badge to a delegate in the programme and returns the delegate's id, name, and photo.
  5. Staff confirms and marks attendance via `PUT /programmes/:id/attendance/:delegateId` with `method: qr` (attendance endpoint — programme module).
- **Edge / alternative flows:**
  - *Badge not found:* the endpoint returns an error entry in the `errors` array; staff can manually mark the delegate present instead.
  - *Multiple badges scanned in one session:* the endpoint accepts a `badges` array for batch lookup.
  - *No badge assigned to delegate:* staff uses manual override; admin assigns a badge later via delegate profile.
  - *QR scan initiated offline:* QR endpoints are not synced; scanning requires connectivity.

### 2.2 UC-QR-02: Manually Add a Person Not Captured by Face or QR

- **Actor:** Secretariat Staff / Admin
- **Trigger:** A person arrives whose face was not captured (poor photo, new late joiner) or whose QR was lost.
- **Main flow:**
  1. Staff taps "Add" from the delegate management screen.
  2. Staff enters the person's name (and optionally badge) via `POST /programmes/:id/delegates` (delegate management — programme module).
  3. The person appears in the programme delegate list and can be marked present manually.
- **Edge / alternative flows:**
  - *Late joiner has an existing user account:* add via `userIds` so the delegate links to the user and its face embeddings become matchable.
  - *Name already exists:* `findOrCreate` reuses the existing delegate row; programme membership is created idempotently.

---

## 3. Unidentified Face Alerting

### 3.1 UC-AL-01: Alert Admins of Unidentified Faces

- **Actor:** Admin / Trip Manager (recipient), Secretariat Staff (source)
- **Trigger:** A captured face fails to match any registered programme delegate (confidence below threshold or no candidate).
- **Main flow:**
  1. `POST /programmes/:id/recognize` creates a `ScanEvent` with `status: 'unverified'` and a reason (scan event — programme module).
  2. Attendance summary (`GET /programmes/:id/attendance/summary`, programme module) counts unverified scans; dashboards list them with scan id and timestamp.
  3. Admins see the unidentified count in real time and investigate (compare to manual roster, ask staff to re-scan, or add the person manually).
  4. Once the person is identified and marked present, unresolved unverified scan events for the programme are cleared.
- **Edge / alternative flows:**
  - *False positive (verified delegate later re-scanned):* the cleared-unverified logic only removes unresolved events when a delegate is marked present.
  - *Person turns out to be non-delegate:* admin ignores the alert; events remain in the unidentified list for audit.

---

## 4. Chatbot Assistant

### 4.1 UC-CH-01: Ask the Assistant About the Programme

- **Actor:** Any staff member
- **Trigger:** A message starting with the configured trigger prefix (default `@assistant`) is sent in the programme chat.
- **Main flow:**
  1. Staff sends `@assistant <question>` in the chat namespace (chat module).
  2. The message is stored (`chat_messages`, chat module), broadcast to all chat users, then routed to the chatbot.
  3. `chatbot:typing` is emitted; the backend builds a full programme context (delegates, routes, attendance summary, staff list) via `buildProgrammeContext` (programme module data).
  4. The Groq API (model from `GROQ_MODEL`, default `gpt-oss-20b`) receives system prompt + last 10 messages + the user query.
  5. The reply is stored as a message from the seeded AI Assistant user (`ai-assistant@openglimpse.com`) and broadcast; `chatbot:stop` is emitted.
- **Edge / alternative flows:**
  - *Message too long (> 1000 chars) or empty:* server emits an `error` event, message rejected.
  - *User not joined to a programme (`chat:join` not sent):* chatbot is not invoked; message is still saved and broadcast.
  - *No chatbot user seeded:* chatbot responses are silently skipped.
  - *Groq API failure / no programme context:* `chatbot:stop` emitted and an `error` event with "Chatbot could not respond" is sent to the socket.
  - *Question unrelated to programme:* the bot answers helpfully but notes it has programme-specific knowledge.

