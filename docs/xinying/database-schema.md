# Database Schema — Programme Creation & Attendance (Xin Ying)

Module: Programme Creation & Attendance
Owner: **Xin Ying (XY)**
Database: PostgreSQL (via Sequelize ORM, `src/server/database/db.cjs`)

This document describes the tables that back the **Programme Creation & Attendance** module. The module owns the following tables:

- `programmes`
- `routes`
- `delegates`
- `programme_delegates` (join: programme ↔ delegate)
- `route_members` (join: route ↔ delegate)
- `attendance_records`
- `ready_to_depart`

It also reads from `scan_events` (owned by the facial-recognition module) to surface unidentified scans in the summary.

> Column naming: Sequelize `field:` mappings are shown — the `field` value is the actual PostgreSQL column name. Where a column has no `field:`, the attribute name is the column name. Date columns are `DATE`/`DATEONLY`; ids are `UUID` with default `UUIDV4`.

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ DELEGATES : "user_id"
    PROGRAMMES ||--o{ ROUTES : "programme_id"
    PROGRAMMES ||--o{ PROGRAMME_DELEGATES : "programme_id"
    PROGRAMMES ||--o{ ATTENDANCE_RECORDS : "programme_id"
    PROGRAMMES ||--o{ SCAN_EVENTS : "programme_id"
    PROGRAMMES ||--o{ READY_TO_DEPART : "programme_id"
    ROUTES ||--o{ ROUTE_MEMBERS : "route_id"
    ROUTES ||--o{ READY_TO_DEPART : "route_id"
    DELEGATES ||--o{ PROGRAMME_DELEGATES : "delegate_id"
    DELEGATES ||--o{ ROUTE_MEMBERS : "delegate_id"
    DELEGATES ||--o{ ATTENDANCE_RECORDS : "delegate_id"

    USERS {
        uuid id PK
        text en_name
        text zh_name
        text email UK
        text password_hash
        text photo_url
        text role
    }
    PROGRAMMES {
        uuid id PK
        text name
        date start_date
        date end_date
        text status
        timestamp created_at
        timestamp updated_at
    }
    ROUTES {
        uuid id PK
        uuid programme_id FK
        text name
        boolean archived
        timestamp created_at
    }
    DELEGATES {
        uuid id PK
        text name
        text badge
        text photo_url
        uuid user_id FK
        timestamp created_at
    }
    PROGRAMME_DELEGATES {
        uuid id PK
        uuid programme_id FK
        uuid delegate_id FK
        text notes
    }
    ROUTE_MEMBERS {
        uuid id PK
        uuid route_id FK
        uuid delegate_id FK
        uuid programme_id FK
    }
    ATTENDANCE_RECORDS {
        uuid id PK
        uuid programme_id FK
        uuid delegate_id FK
        text status
        text method
        timestamp checked_in_at
        uuid checked_in_by
        text notes
    }
    READY_TO_DEPART {
        uuid id PK
        uuid programme_id FK UK
        uuid route_id FK
        boolean ready
        uuid toggled_by
        timestamp toggled_at
    }
    SCAN_EVENTS {
        uuid id PK
        uuid programme_id FK
        uuid delegate_id FK
        real confidence
        text status
        text unverified_reason
        text bounding_box_id
        timestamp scanned_at
    }
```

---

## 2. Table Definitions

### 2.1 `programmes`

A delegation trip. The top-level resource of the module.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, default `UUIDV4` | Programme identifier |
| `name` | `TEXT` | `NOT NULL` | Programme name |
| `start_date` | `DATEONLY` | `NOT NULL` | Start date |
| `end_date` | `DATEONLY` | `NOT NULL` | End date |
| `status` | `TEXT` | default `'draft'`; `IN ('draft','active','completed')` | Lifecycle state |
| `created_at` | `TIMESTAMP` | auto | Created timestamp |
| `updated_at` | `TIMESTAMP` | auto | Updated timestamp |

### 2.2 `routes`

A coach / route within a programme.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, default `UUIDV4` | Route identifier |
| `programme_id` | `UUID` | `NOT NULL` → FK `programmes.id` (`ON DELETE CASCADE`) | Owning programme |
| `name` | `TEXT` | `NOT NULL` | Route/coach name |
| `archived` | `BOOLEAN` | default `false` | Soft-delete flag |
| `created_at` | `TIMESTAMP` | auto | Created timestamp |

### 2.3 `delegates`

A physical person participating in a programme. One delegate may appear in many programmes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, default `UUIDV4` | Delegate identifier |
| `name` | `TEXT` | `NOT NULL` | Delegate name |
| `badge` | `TEXT` | — | Optional QR/badge id |
| `photo_url` | `TEXT` | — | Stored facial photo path |
| `user_id` | `UUID` | `NULL` → FK `users.id` | Linked user account (optional) |
| `created_at` | `TIMESTAMP` | auto | Created timestamp |

### 2.4 `programme_delegates`

Join table linking a delegate to a programme (the programme's participant list).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, default `UUIDV4` | Row identifier |
| `programme_id` | `UUID` | `NOT NULL` → FK `programmes.id` (`CASCADE`) | Programme |
| `delegate_id` | `UUID` | `NOT NULL` → FK `delegates.id` (`CASCADE`) | Delegate |
| `notes` | `TEXT` | default `''` | Per-programme note for the delegate |

**Indexes:**
- `UNIQUE (programme_id, delegate_id)` — a delegate appears once per programme
- `(programme_id)`, `(delegate_id)`

### 2.5 `route_members`

Join table linking a delegate to a route within a programme. **Enforces the single-route rule** via a unique constraint on `(programme_id, delegate_id)` — each delegate belongs to exactly one route per programme.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, default `UUIDV4` | Row identifier |
| `route_id` | `UUID` | `NOT NULL` → FK `routes.id` (`CASCADE`) | Route |
| `delegate_id` | `UUID` | `NOT NULL` → FK `delegates.id` (`CASCADE`) | Delegate |
| `programme_id` | `UUID` | `NOT NULL` → FK `programmes.id` (`CASCADE`) | Programme (denormalised for lookup) |

**Indexes:**
- `UNIQUE (programme_id, delegate_id)` — one route per delegate per programme
- `(route_id)`, `(delegate_id)`, `(programme_id)`

> The server also rejects `routeIds` arrays of length > 1 (`400`) in `PUT /programmes/:id/delegates/:delegateId/routes`, so the rule is enforced at both the API and schema level.

### 2.6 `attendance_records`

One row per delegate per programme holding their current attendance state (status is upserted — marking present then absent updates the same row).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, default `UUIDV4` | Record identifier |
| `programme_id` | `UUID` | `NOT NULL` → FK `programmes.id` (`CASCADE`) | Programme |
| `delegate_id` | `UUID` | `NOT NULL` → FK `delegates.id` (`CASCADE`) | Delegate |
| `status` | `TEXT` | `NOT NULL`; `IN ('present','absent')` | Attendance state |
| `method` | `TEXT` | `NOT NULL`; `IN ('auto','manual','qr')` | How attendance was recorded |
| `checked_in_at` | `TIMESTAMP` | default `NOW` | Check-in timestamp |
| `checked_in_by` | `UUID` | — | Staff id who marked attendance (optional) |
| `notes` | `TEXT` | default `''` | Free-text note (e.g. "badge missing") |

**Indexes:** `(programme_id)`, `(delegate_id)`

### 2.7 `ready_to_depart`

Per-route (or per-programme) departure-readiness toggle.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, default `UUIDV4` | Row identifier |
| `programme_id` | `UUID` | `NOT NULL`, `UNIQUE` → FK `programmes.id` (`CASCADE`) | Programme |
| `route_id` | `UUID` | `NULL` → FK `routes.id` (`CASCADE`) | Route (programme-level row when null) |
| `ready` | `BOOLEAN` | default `false` | Ready-to-depart flag |
| `toggled_by` | `UUID` | — | Staff id who toggled |
| `toggled_at` | `TIMESTAMP` | — | Last toggle time |

### 2.8 `scan_events` (read-only for this module)

Written by the facial-recognition module; this module reads rows with `status = 'unverified'` to show unidentified scans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, default `UUIDV4` | Scan identifier |
| `programme_id` | `UUID` | `NOT NULL` → FK `programmes.id` (`CASCADE`) | Programme |
| `delegate_id` | `UUID` | — | Matched delegate (null when unidentified) |
| `confidence` | `REAL` | — | Match confidence score |
| `status` | `TEXT` | `NOT NULL`; `IN ('verified','unverified')` | Scan outcome |
| `unverified_reason` | `TEXT` | — | Why the scan was not verified |
| `bounding_box_id` | `TEXT` | — | Client-side bounding box reference |
| `scanned_at` | `TIMESTAMP` | default `NOW` | When the face was scanned |

### 2.9 Related `users` table (referenced)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, default `UUIDV4` | User identifier |
| `en_name` | `STRING` | `NOT NULL` | English name |
| `zh_name` | `STRING` | `NULL` | Chinese name |
| `email` | `TEXT` | `NOT NULL`, `UNIQUE` | Login email |
| `password_hash` | `TEXT` | `NULL` | Hashed password |
| `photo_url` | `TEXT` | `NULL` | Profile photo |
| `role` | `TEXT` | `IN ('staff','participant')` | Account role |
| `created_at` | `TIMESTAMP` | auto | Created timestamp |

---

## 3. Relationships Summary

| Relationship | Cardinality | Foreign Key | Cascade |
|--------------|-------------|-------------|---------|
| `programmes` → `routes` | 1 : N | `routes.programme_id` | Delete programme → routes |
| `programmes` → `programme_delegates` | 1 : N | `programme_delegates.programme_id` | Delete programme → join rows |
| `programmes` → `attendance_records` | 1 : N | `attendance_records.programme_id` | Delete programme → records |
| `programmes` → `scan_events` | 1 : N | `scan_events.programme_id` | Delete programme → scans |
| `programmes` → `ready_to_depart` | 1 : N | `ready_to_depart.programme_id` | Delete programme → rows |
| `routes` → `route_members` | 1 : N | `route_members.route_id` | Delete route → members |
| `routes` → `ready_to_depart` | 1 : 1 | `ready_to_depart.route_id` | Delete route → row |
| `delegates` → `programme_delegates` | 1 : N | `programme_delegates.delegate_id` | Delete delegate → join rows |
| `delegates` → `route_members` | 1 : N | `route_members.delegate_id` | Delete delegate → members |
| `delegates` → `attendance_records` | 1 : N | `attendance_records.delegate_id` | Delete delegate → records |
| `users` → `delegates` | 1 : N | `delegates.user_id` | — (nullable) |

**Key invariants:**
- A delegate belongs to **exactly one route** per programme (enforced by `UNIQUE (programme_id, delegate_id)` on `route_members` and a server-side length check).
- A delegate appears at most once per programme (`UNIQUE (programme_id, delegate_id)` on `programme_delegates`).
- `attendance_records` holds one current-state row per delegate per programme (upserted on each mark).
