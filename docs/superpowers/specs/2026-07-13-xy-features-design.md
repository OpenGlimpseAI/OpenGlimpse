# XY Feature Reorganization — Design

## Context
The app tracks attendance for sequential multi-leg delegation trips. Delegates may join specific legs, not necessarily the whole programme. The current Dashboard shows duplicated delegate lists that overlap with the Directory page.

## Core Principle
Dashboard is the command center — route timeline overview with inline check-in. Directory remains a standalone page for full delegate management. Navbar/Settings untouched.

---

## Dashboard — Route Timeline Command Center

**Purpose:** At-a-glance view of where the delegation is right now, with ability to drill into a route for check-in.

**Changes:**
- Keep route timeline with stat cards showing each route's progress bar, check-in count, status (pending/active/completed)
- Add inline Directory features: tapping a route shows search, filter (All/Missing/Present), delegate list with check-in/undo, profile sheet with notes
- Pass `archived=true` to `getRoutes()` so archived routes remain visible (dimmed) with completed badge
- Add Restore button to archived route cards alongside the existing Archive button on active routes
- Keep existing header, programme picker, navigation icons, counter card, ready-to-depart button
- Keep archive functionality — archive button on active routes, archived routes dimmed with "completed" badge and restore button

## Data Model Change

Add `archived` boolean to the Route model:
- Route model: add `archived: { type: DataTypes.BOOLEAN, defaultValue: false }`
- API: `PUT /programmes/:id/routes/:routeId/archive`
- API: `PUT /programmes/:id/routes/:routeId/restore`
- `Route.listForProgramme` updated to accept optional `{ archived }` filter

## Navigation

- Navbar/Settings untouched — no changes to bottomnav.jsx
- Directory still accessible from Dashboard icon (unchanged)
- ProgrammePage accessible from Dashboard icon (unchanged)
- SummaryPage accessible from Dashboard icon (unchanged)
