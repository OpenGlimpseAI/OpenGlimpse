# API Documentation — Programme Creation & Attendance (Xin Ying)

Module: Programme Creation & Attendance
Owner: **Xin Ying (XY)**
Base URL: `http://<host>:3001` (Express server). All routes below are registered under the `/programmes` namespace in `src/server/modules/programmes/index.js`.

> These endpoints cover programme/route CRUD, delegate management, attendance marking, ready-to-depart, and attendance summary. Facial recognition (`POST /programmes/:id/recognize`) and QR badge lookup (`POST /programmes/:id/scan-qr`) are owned by other modules and are listed only for completeness.

### Request / Response format
- All request bodies and responses are JSON (`Content-Type: application/json`).
- `:id` refers to a programme id (UUID); `:routeId` and `:delegateId` are UUIDs.
- No JWT middleware is applied to these programme routes on the server (auth is enforced client-side by redirecting non-staff users to the landing page).

---

## 1. Programmes

### 1.1 List programmes

- **Method / Path:** `GET /programmes`
- **Description:** List all programmes, newest first, with aggregate counts.
- **Success — `200 OK`:**
```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "SCCCI Shanghai 2026",
    "startDate": "2026-08-10",
    "endDate": "2026-08-14",
    "status": "active",
    "totalDelegates": 32,
    "checkedIn": 27
  }
]
```
- **Error codes:** `500` `{ "error": "<message>" }`

### 1.2 Create programme

- **Method / Path:** `POST /programmes`
- **Description:** Create a new programme with a name and date range. Initial `status` is `draft`.
- **Request body:**
```json
{ "name": "SCCCI Shanghai 2026", "startDate": "2026-08-10", "endDate": "2026-08-14" }
```
- **Success — `201 Created`:**
```json
{ "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "name": "SCCCI Shanghai 2026", "startDate": "2026-08-10", "endDate": "2026-08-14", "status": "draft" }
```
- **Error codes:**
  - `400` — `{ "error": "name, startDate, endDate are required" }`
  - `500` — `{ "error": "<message>" }`

### 1.3 Update programme

- **Method / Path:** `PUT /programmes/:id`
- **Description:** Update a programme's name/dates and optionally add/remove delegates. Only the fields present in the body are changed.
- **Request body (all optional):**
```json
{ "name": "SCCCI Shanghai 2026 (Revised)", "addDelegateIds": ["<delegateId>"], "removeDelegateIds": ["<delegateId>"] }
```
- **Success — `200 OK`:**
```json
{ "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "name": "SCCCI Shanghai 2026 (Revised)", "startDate": "2026-08-10", "endDate": "2026-08-14", "status": "active", "totalDelegates": 33, "checkedIn": 27 }
```
- **Error codes:**
  - `404` — `{ "error": "Programme not found" }`
  - `500` — `{ "error": "<message>" }`

### 1.4 Delete programme

- **Method / Path:** `DELETE /programmes/:id`
- **Description:** Delete a programme. Dependent routes, route members, and attendance records are cascade-deleted.
- **Success — `204 No Content`** (no body)
- **Error codes:**
  - `404` — `{ "error": "Programme not found" }`
  - `500` — `{ "error": "<message>" }`

---

## 2. Routes

### 2.1 List routes

- **Method / Path:** `GET /programmes/:id/routes[?archived=true]`
- **Description:** List a programme's routes with delegate and check-in counts plus ready-to-depart status. Pass `?archived=true` to include archived routes; omit to get non-archived only.
- **Success — `200 OK`:**
```json
[
  {
    "id": "a1b2c3d4-...", "programmeId": "f47ac10b-...",
    "name": "Coach A", "archived": false,
    "delegateCount": 16, "checkedIn": 14, "ready": false
  }
]
```
- **Error codes:** `500` — `{ "error": "<message>" }`

### 2.2 Get a single route

- **Method / Path:** `GET /programmes/:id/routes/:routeId`
- **Description:** Fetch one route's details including counts and ready status.
- **Success — `200 OK`:** same shape as a single item in §2.1.
- **Error codes:**
  - `404` — `{ "error": "Route not found" }`
  - `500` — `{ "error": "<message>" }`

### 2.3 Add route

- **Method / Path:** `POST /programmes/:id/routes`
- **Description:** Create a new route for a programme.
- **Request body:**
```json
{ "name": "Coach B" }
```
- **Success — `201 Created`:**
```json
{ "id": "a1b2c3d4-...", "programmeId": "f47ac10b-...", "name": "Coach B", "delegateCount": 0, "checkedIn": 0 }
```
- **Error codes:**
  - `400` — `{ "error": "name is required" }`
  - `404` — `{ "error": "Programme not found" }`
  - `500` — `{ "error": "<message>" }`

### 2.4 Update route

- **Method / Path:** `PUT /programmes/:id/routes/:routeId`
- **Description:** Rename a route and/or assign/remove delegates. Assigning a delegate moves them to this route (single-route rule), removing them from any previous route.
- **Request body (all optional):**
```json
{ "name": "Coach B (Suzhou)", "addDelegateIds": ["<delegateId>"], "removeDelegateIds": ["<delegateId>"] }
```
- **Success — `200 OK`:**
```json
{ "id": "a1b2c3d4-...", "programmeId": "f47ac10b-...", "name": "Coach B (Suzhou)", "delegateCount": 12, "checkedIn": 10 }
```
- **Error codes:**
  - `404` — `{ "error": "Route not found" }`
  - `500` — `{ "error": "<message>" }`

### 2.5 Archive route

- **Method / Path:** `PUT /programmes/:id/routes/:routeId/archive`
- **Description:** Soft-archive a route (`archived: true`).
- **Success — `200 OK`:**
```json
{ "id": "a1b2c3d4-...", "programmeId": "f47ac10b-...", "name": "Coach B", "archived": true, "delegateCount": 12, "checkedIn": 10 }
```
- **Error codes:** `404` — `{ "error": "Route not found" }` / `500`

### 2.6 Restore route

- **Method / Path:** `PUT /programmes/:id/routes/:routeId/restore`
- **Description:** Un-archive a previously archived route (`archived: false`).
- **Success — `200 OK`:**
```json
{ "id": "a1b2c3d4-...", "programmeId": "f47ac10b-...", "name": "Coach B", "archived": false }
```
- **Error codes:** `404` — `{ "error": "Route not found" }` / `500`

### 2.7 Delete route

- **Method / Path:** `DELETE /programmes/:id/routes/:routeId`
- **Description:** Delete a route; its route-membership rows are cascade-deleted.
- **Success — `204 No Content`**
- **Error codes:** `404` — `{ "error": "Route not found" }` / `500`

---

## 3. Delegates

### 3.1 List delegates in a programme

- **Method / Path:** `GET /programmes/:id/delegates`
- **Description:** List all delegates in the programme with their current attendance status, check-in info, and route assignment(s). Sorted with checked-in first.
- **Success — `200 OK`:**
```json
[
  {
    "id": "b2c3d4e5-...", "name": "Lim Wei Jie", "badge": null, "userId": "u1-...",
    "routeId": "a1b2c3d4-...", "routeName": "Coach A",
    "routeIds": ["a1b2c3d4-..."], "routeNames": ["Coach A"],
    "status": "present", "method": "manual",
    "checkedInAt": "2026-08-10T09:12:33.000Z", "notes": ""
  }
]
```
- **Error codes:** `500` — `{ "error": "<message>" }`

### 3.2 Add delegates to a programme

- **Method / Path:** `POST /programmes/:id/delegates`
- **Description:** Add delegates to the programme. Accepts one of several payload shapes; the client currently sends `{ userIds, routeId }`.
- **Request body (client shape):**
```json
{ "userIds": ["u1-...", "u2-..."], "routeId": "a1b2c3d4-..." }
```
  Other accepted shapes: `{ delegates: [{ name, badge? }] }`, `{ delegateIds: [...] }`, `{ delegateId }`, `{ name, badge? }`.
- **Success — `201 Created`:**
```json
{ "added": [ { "delegateId": "b2c3d4e5-...", "name": "Lim Wei Jie" } ] }
```
- **Error codes:**
  - `400` — `{ "error": "Provide delegates array, delegateIds, delegateId, or name" }`
  - `404` — `{ "error": "Programme not found" }`
  - `500` — `{ "error": "<message>" }`

### 3.3 Update a delegate

- **Method / Path:** `PATCH /delegates/:delegateId`
- **Description:** Link or unlink a delegate to a user account.
- **Request body:**
```json
{ "userId": "u1-..." }
```
- **Success — `200 OK`:**
```json
{ "id": "b2c3d4e5-...", "name": "Lim Wei Jie", "userId": "u1-..." }
```
- **Error codes:**
  - `404` — `{ "error": "Delegate not found" }`
  - `400` — `{ "error": "User not found" }` (when `userId` given but invalid)
  - `500` — `{ "error": "<message>" }`

### 3.4 Remove a delegate from a programme

- **Method / Path:** `DELETE /programmes/:id/delegates/:delegateId`
- **Description:** Remove a delegate from a programme. Also deletes the delegate's attendance records and route memberships within the programme.
- **Success — `204 No Content`**
- **Error codes:**
  - `404` — `{ "error": "Delegate not found in programme" }`
  - `500` — `{ "error": "<message>" }`

### 3.5 Set a delegate's route membership

- **Method / Path:** `PUT /programmes/:id/delegates/:delegateId/routes`
- **Description:** Assign a delegate to exactly one route (or clear their route with an empty array). Enforces the single-route rule.
- **Request body:**
```json
{ "routeIds": ["a1b2c3d4-..."] }
```
- **Success — `200 OK`:**
```json
{ "delegateId": "b2c3d4e5-...", "routeIds": ["a1b2c3d4-..."], "routeNames": ["Coach A"] }
```
- **Error codes:**
  - `400` — `{ "error": "routeIds must be an array" }`
  - `400` — `{ "error": "Each delegate can only be assigned to one route" }`
  - `400` — `{ "error": "Invalid routeId: <id>" }`
  - `500` — `{ "error": "<message>" }`

### 3.6 Get a delegate's route membership

- **Method / Path:** `GET /programmes/:id/delegates/:delegateId/routes`
- **Description:** Fetch a delegate's current route assignment(s).
- **Success — `200 OK`:** same shape as §3.5.
- **Error codes:** `500` — `{ "error": "<message>" }`

---

## 4. Attendance

### 4.1 Get attendance

- **Method / Path:** `GET /programmes/:id/attendance`
- **Description:** Fetch the full attendance snapshot for a programme: present delegates (with method and check-in time), missing delegates, and unidentified scan events.
- **Success — `200 OK`:**
```json
{
  "present": [
    { "delegateId": "b2c3d4e5-...", "name": "Lim Wei Jie", "routeId": "a1b2c3d4-...", "routeName": "Coach A", "routeIds": ["a1b2c3d4-..."], "routeNames": ["Coach A"], "method": "manual", "checkedInAt": "2026-08-10T09:12:33.000Z", "notes": "" }
  ],
  "missing": [
    { "delegateId": "c3d4e5f6-...", "name": "Tan Mei Ling", "routeId": null, "routeName": null, "routeIds": [], "routeNames": [], "notes": "" }
  ],
  "unidentified": [ { "scanId": "e5f6a7b8-...", "scannedAt": "2026-08-10T09:13:00.000Z" } ]
}
```
- **Error codes:** `500` — `{ "error": "<message>" }`

### 4.2 Mark a delegate's attendance

- **Method / Path:** `PUT /programmes/:id/attendance/:delegateId`
- **Description:** Mark a single delegate present or absent. On success, an `attendance:updated` WebSocket event is broadcast to all staff devices in the programme room.
- **Request body:**
```json
{ "status": "present", "method": "manual", "notes": "badge missing, verified by photo" }
```
- **Success — `200 OK`:**
```json
{ "programmeId": "f47ac10b-...", "delegateId": "b2c3d4e5-...", "name": "Lim Wei Jie", "status": "present", "method": "manual", "checkedInAt": "2026-08-10T09:12:33.000Z" }
```
- **Error codes:**
  - `400` — `{ "error": "status must be \"present\" or \"absent\"" }`
  - `400` — `{ "error": "method is required when marking present" }`
  - `400` — `{ "error": "Delegate is not in this programme" }`
  - `500` — `{ "error": "<message>" }`

### 4.3 Batch mark attendance

- **Method / Path:** `POST /programmes/:id/attendance`
- **Description:** Mark attendance for multiple delegates in one request. Each record is processed independently.
- **Request body:**
```json
{ "records": [ { "delegateId": "b2c3d4e5-...", "status": "present", "method": "manual" }, { "delegateId": "c3d4e5f6-...", "status": "absent" } ] }
```
- **Success — `200 OK`** (when at least one record fails) or **`201 Created`** (all succeeded):
```json
{ "success": [ { "programmeId": "...", "delegateId": "...", "name": "...", "status": "present", "method": "manual", "checkedInAt": "..." } ], "errors": [ { "delegateId": "...", "error": "..." } ] }
```
- **Error codes:**
  - `400` — `{ "error": "records must be a non-empty array" }` (also returned when all records fail)
  - `500` — `{ "error": "<message>" }`

### 4.4 Get attendance summary

- **Method / Path:** `GET /programmes/:id/attendance/summary`
- **Description:** Fetch aggregate attendance for the programme, broken down per route, plus the count of unidentified scans.
- **Success — `200 OK`:**
```json
{
  "total": 32, "checkedIn": 27, "missing": 5, "unidentified": 2,
  "unidentifiedScans": [ { "scanId": "e5f6a7b8-...", "scannedAt": "2026-08-10T09:13:00.000Z" } ],
  "byRoute": [
    { "routeId": "a1b2c3d4-...", "routeName": "Coach A", "total": 16, "checkedIn": 14, "missing": 2, "unidentified": 1 }
  ]
}
```
- **Error codes:** `500` — `{ "error": "<message>" }`

---

## 5. Ready-to-Depart

### 5.1 Get ready-to-depart status

- **Method / Path:** `GET /programmes/:id/routes/:routeId/ready-to-depart`
- **Description:** Fetch the ready-to-depart status for a route.
- **Success — `200 OK`:**
```json
{ "routeId": "a1b2c3d4-...", "ready": false, "toggledBy": null, "toggledAt": null }
```
- **Error codes:** `500` — `{ "error": "<message>" }`

### 5.2 Toggle ready-to-depart

- **Method / Path:** `PUT /programmes/:id/routes/:routeId/ready-to-depart`
- **Description:** Set whether a route is ready to depart.
- **Request body:**
```json
{ "ready": true }
```
- **Success — `200 OK`:**
```json
{ "routeId": "a1b2c3d4-...", "ready": true, "toggledBy": null, "toggledAt": "2026-08-10T09:20:00.000Z" }
```
- **Error codes:**
  - `400` — `{ "error": "ready must be a boolean" }`
  - `500` — `{ "error": "<message>" }`

---

## 6. Shared Error Codes

| Code | Meaning |
|------|---------|
| `200` | OK — request succeeded |
| `201` | Created — a new resource was created |
| `204` | No Content — deletion succeeded, no body returned |
| `400` | Bad Request — invalid/missing body fields or a validation rule failed |
| `404` | Not Found — the resource (programme/route/delegate) does not exist |
| `429` | Too Many Requests — rate-limited (applies to `/sync` and `/api/auth/login`; not the programme routes) |
| `500` | Internal Server Error — unexpected server failure; body is `{ "error": "<message>" }` |

Error responses always use the shape `{ "error": "<human-readable message>" }`.
