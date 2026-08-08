# Use Cases — Matthias (Login & Participant Creation)

Roles relevant here: **Admin / Trip Manager (Staff)**, **Secretariat Staff (Staff)**, and **Delegate (Participant)**. Each use case names the actor, trigger, main flow, and edge-case / alternative flows.

---

## 1. Participant Creation

### 1.1 UC-FR-02: Register a Delegate's Face During Account Creation

- **Actor:** Admin / Trip Manager
- **Trigger:** A new user account (delegate or staff) is created and a facial photo needs to be stored.
- **Main flow:**
  1. Admin submits `POST /api/auth` with user details and an optional base64 `faceImage`.
  2. `FaceEmbeddings.createFromImage` sends the image to the Python FaceNet server (`/embed-all`).
  3. Each detected face crop is embedded and stored in `faceEmbeddings` with `imageType: 'primary'`.
  4. The photo is retrievable later via `GET /api/user/:id/face/default`.
- **Edge / alternative flows:**
  - *Face upload fails* (e.g., no face detected): failure is logged but account creation still succeeds.
  - *User uploads a new photo later:* `PATCH /api/user/:id/face/default` deletes all existing `primary` embeddings for the user and replaces them with the new image's embeddings.
  - *Multiple faces in the photo:* one embedding record is created per detected face.

---

## 2. Login

### 2.1 UC-FR-03: Verify Identity on First Login

- **Actor:** User (staff or participant)
- **Trigger:** New person's first login after account creation.
- **Main flow:**
  1. Person logs in via `POST /api/auth/login`.
  2. (Optional) App compares the live face against the stored `primary` face embedding (`GET /api/user/:id/face/default`).
  3. On match, access is granted.
- **Edge / alternative flows:**
  - *No face stored:* app prompts the person to upload a photo (`PATCH /api/user/:id/face/default`).
  - *Verification fails:* person retries in better lighting; login itself is still credential-based.

### 2.2 UC-SUP-01: Login

- **Actor:** Staff / Admin / Participant
- **Trigger:** User opens the app and submits credentials.
- **Main flow:** `POST /api/auth/login` validates email + SHA-256 password hash; returns JWT-style base64 token (`id:role`) and profile.
- **Edge flows:** invalid credentials → 401; rate limit of 10 attempts/min/IP → 429.