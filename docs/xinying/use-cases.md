# Use Cases — Programme Creation & Attendance (Xin Ying)

Module: Programme Creation & Attendance
Owner: **Xin Ying (XY)**

This document defines the use cases for the **Programme Creation & Attendance** module. It covers the two primary user roles that interact with the module — **Admin / Trip Manager** and **Staff / Secretariat** — plus the secondary **Delegate** role where relevant.

> Scope note: The module consists of three functional areas: (1) Programme & route creation, (2) attendance marking and the present/missing list, and (3) ready-to-depart confirmation and attendance summary. Facial recognition itself is owned by Ryan's module; the attendance marking flow here focuses on the manual marking UI and the real-time dashboard.

---

## 2.1 Actors

| Actor | Description |
|-------|-------------|
| **Admin / Trip Manager** | Creates programmes, defines routes, manages the participant list, confirms departure readiness, and reviews the consolidated attendance report. |
| **Staff / Secretariat** | Takes attendance on the ground for an assigned route, marks delegates present/absent manually, and views the live present/missing list. |
| **Delegate** | A programme participant whose presence is recorded. Secondary actor — no direct interaction with this module. |

---

## UC-PA-01 — Create a programme

- **Actor:** Admin / Trip Manager
- **Trigger:** A new overseas delegation trip is confirmed and must be set up in the system.
- **Precondition:** The admin is signed in with the `staff` role and can access the "Manage Programmes" page.
- **Main flow:**
  1. Admin opens **Manage Programmes** (`/programmes`).
  2. Admin clicks **New**.
  3. Admin enters the programme name, start date, end date, and **at least one route name** (ready-to-depart only operates per route, so a programme cannot be created without a route).
  4. Admin submits. The system creates the programme with status `draft` and its route(s) in one atomic call.
  5. The system shows a "Programme created" toast and reloads the list; the new programme appears at the top.
- **Alternative flows:**
  - *4a. Validation failure:* If any of name / start date / end date / route name is missing, the system ignores the submit (the save button is disabled until all fields are filled).
  - *5a. Offline:* If offline, the programme is optimistically added to the list with a pending id and queued for sync via the offline queue; the bundled route is replayed with the create.
- **Postcondition:** A new programme exists and is selectable in the dashboard, directory, and detail page.

---

## UC-PA-02 — Edit a programme

- **Actor:** Admin / Trip Manager
- **Trigger:** The name or dates of an existing programme need to change.
- **Main flow:**
  1. Admin opens **Manage Programmes**.
  2. Admin clicks the edit (pencil) icon on the programme card.
  3. The modal pre-fills the current name, start date, and end date.
  4. Admin edits the fields and clicks **Save**.
  5. The system updates the programme and reloads the list.
- **Alternative flows:**
  - *4a. Offline:* The programme card is updated optimistically and the change is queued for sync.
- **Postcondition:** The programme's name and dates reflect the update.

---

## UC-PA-03 — Delete a programme

- **Actor:** Admin / Trip Manager
- **Trigger:** A programme is no longer needed.
- **Main flow:**
  1. Admin opens **Manage Programmes**.
  2. Admin clicks the delete (trash) icon on the programme card.
  3. A confirmation modal warns that "All routes and delegate assignments will be removed."
  4. Admin confirms. The system deletes the programme; associated routes, route members, and attendance records are cascade-deleted.
- **Alternative flows:**
  - *4a. Cancel:* Admin cancels; nothing changes.
- **Postcondition:** The programme and its dependent data are removed.

---

## UC-PA-04 — Add a route to a programme

- **Actor:** Admin / Trip Manager
- **Trigger:** A programme needs a new coach/route (e.g. Coach A, Coach B).
- **Precondition:** A programme exists.
- **Main flow:**
  1. Admin opens the programme detail page (`/programmes/{id}/routes`).
  2. Admin types a route name and clicks **Add**.
  3. The system creates the route with `delegateCount: 0` and `checkedIn: 0` and shows a "Route added" toast.
- **Postcondition:** The route is listed with zero delegates assigned.

---

## UC-PA-05 — Rename a route

- **Actor:** Admin / Trip Manager
- **Trigger:** A route's display name needs correcting.
- **Main flow:**
  1. Admin clicks the edit icon next to the route.
  2. The route name becomes an inline editable input.
  3. Admin types the new name and clicks **Save**.
- **Alternative flows:**
  - *3a. Cancel:* Admin clicks **Cancel** and the original name is kept.
- **Postcondition:** The route name is updated.

---

## UC-PA-06 — Delete a route

- **Actor:** Admin / Trip Manager
- **Trigger:** A route is no longer used.
- **Main flow:**
  1. Admin clicks the delete icon next to the route.
  2. A confirmation modal asks "Delete this route? Delegates will keep their other routes."
  3. Admin confirms. The route is removed; route membership rows for that route are cascade-deleted.
- **Postcondition:** The route no longer appears in the list; its delegates remain in the programme.

---

## UC-PA-07 — Assign delegates to a route

- **Actor:** Admin / Trip Manager
- **Trigger:** Delegates must be grouped onto a specific coach/route.
- **Precondition:** The programme has at least one route and delegates in its participant list.
- **Main flow:**
  1. Admin clicks **Assign** on a route.
  2. The route-management modal opens, listing delegates grouped as **On this route**, **Unassigned**, and **On other routes** (delegates already on a different route).
  3. Admin checks the delegates to move onto this route and clicks **Save (n)**.
  4. The system assigns each delegate to this route. Because each delegate may belong to exactly one route, any delegate moved here is removed from their previous route first.
- **Alternative flows:**
  - *3a. Search:* Admin types in the search box to filter delegates by name.
- **Postcondition:** Each selected delegate's route membership points to this route.

---

## UC-PA-08 — Add delegates to a programme

- **Actor:** Admin / Trip Manager
- **Trigger:** The participant list needs new members.
- **Precondition:** The delegate (or user account) exists in the system's user list.
- **Main flow:**
  1. Admin opens the **Manage** tab → delegate list.
  2. Admin clicks **Add**.
  3. The user picker opens with all participant users not yet in the programme (staff accounts and the AI assistant are excluded).
  4. Admin checks one or more users, **selects a route** (required — the picker pre-selects the first route and rejects adding without one), and clicks **Add (n)**.
  5. The system find-or-creates a `Delegate` for each selected user and links it to the programme and route.
- **Alternative flows:**
  - *4a. No route selected:* If no route is chosen, the system shows an error ("Select a route to assign these delegates to" / "No routes in this programme — add a route first") and does not add.
- **Postcondition:** The selected users appear in the delegate list for the programme, each on a route.

---

## UC-PA-09 — Remove a delegate from a programme

- **Actor:** Admin / Trip Manager
- **Trigger:** A participant is no longer part of the programme.
- **Main flow:**
  1. Admin clicks the remove icon next to a delegate in the delegate list.
  2. The browser confirm asks "Remove this delegate from the programme?"
  3. On confirm, the system deletes the delegate's attendance record, route membership, and programme membership.
- **Postcondition:** The delegate no longer appears in the programme's lists.

---

## UC-PA-10 — Mark a delegate present (manual attendance)

- **Actor:** Staff / Secretariat
- **Trigger:** A delegate checks in manually (roll call, badge not scanned, facial recognition unavailable).
- **Precondition:** A programme is loaded and a route is selected on the dashboard.
- **Main flow:**
  1. Staff opens the dashboard and selects the route they are taking attendance for.
  2. Staff searches or scrolls to the delegate in the list.
  3. Staff clicks **Check in** (or opens the delegate's profile sheet and clicks **Mark as Present**).
  4. The system writes an attendance record with `status: present`, `method: manual`, and the current time; it broadcasts an `attendance:updated` WebSocket event to all staff devices.
  5. All devices update the present count, the delegate's status, and the route progress bar in real time.
- **Alternative flows:**
  - *4a. Note attached:* Staff may add a note (e.g. "badge missing, verified by photo") before marking present; the note is stored with the record.
  - *4b. Offline:* The mark is applied optimistically in local state and queued for sync; it merges on reconnect.
- **Postcondition:** The delegate is shown as checked in with method "manual", and the summary counters are updated.

---

## UC-PA-11 — Mark a delegate absent (undo check-in)

- **Actor:** Staff / Secretariat
- **Trigger:** A delegate was marked present by mistake, or checked-in status must be reset.
- **Main flow:**
  1. Staff opens the dashboard and selects the route.
  2. Staff finds the present delegate and clicks **Undo** (or opens the profile sheet and clicks **Mark as Absent**).
  3. The system writes `status: absent` and broadcasts `attendance:updated`.
  4. The delegate moves back to the missing list; counters and progress bars update across devices.
- **Postcondition:** The delegate is no longer counted as checked in.

---

## UC-PA-12 — View the live attendance dashboard

- **Actor:** Staff / Secretariat, Admin / Trip Manager
- **Trigger:** Staff want to see who is present/missing on a route at a glance.
- **Precondition:** A programme is selected.
- **Main flow:**
  1. User opens the dashboard.
  2. The header shows the selected programme and a **checked in / total** counter.
  3. Each route card shows its name, a progress bar, "n checked in", and (if any) "n missing".
  4. Selecting a route shows the delegate list sorted with missing delegates first, filterable by **All / Missing / Present** and searchable by name.
  5. If any delegate has no route assigned, a red error banner shows **"assign every delegate to a route — N delegate(s) unassigned."**
  6. The view refreshes automatically on every `attendance:updated` WebSocket event.
- **Postcondition:** The user has an up-to-date picture of attendance for the route.

---

## UC-PA-13 — Confirm ready-to-depart for a route

- **Actor:** Admin / Trip Manager (staff role)
- **Trigger:** All delegates on a route are accounted for and the coach is ready to leave.
- **Precondition:** A route is selected on the dashboard.
- **Main flow:**
  1. The route is selected, showing the **Ready to depart?** button.
  2. Admin confirms everyone is accounted for and taps the button.
  3. The system sets `ready: true` for the route; the button switches to "All accounted for" and the route card shows a "Ready to depart" badge.
- **Alternative flows:**
  - *2a. Delegate becomes missing later:* Admin taps again to set `ready: false`.
  - *2b. Unassigned delegates:* If any delegate in the programme has no route, the toggle is rejected with the error **"assign every delegate to a route"** (dashboard banner also flags it), and `ready` stays `false`.
- **Postcondition:** The route's ready-to-depart status reflects the confirmation, visible to all staff.

---

## UC-PA-14 — View the attendance summary report

- **Actor:** Admin / Trip Manager
- **Trigger:** A consolidated report is needed (e.g. before departure or after the trip).
- **Precondition:** The programme has attendance data.
- **Main flow:**
  1. Admin opens the programme detail page → **Summary** tab.
  2. For each route, a section shows **Total / Checked In / Missing / Unidentified** counts and a progress bar, plus an "All checked in" or "n missing" label.
  3. If there are no routes, a single 3-tile summary shows programme-wide Total / Checked In / Missing.
  4. Unidentified scans (from the facial recognition module) are listed with their scan time and id.
- **Postcondition:** Admin can review the aggregate attendance status of the programme.

---

## 2.5 Use-Case Mapping to Requirements

| Requirement (P1/P2) | Use Case |
|----------------------|----------|
| P1 — Programme & route creation | UC-PA-01, UC-PA-02, UC-PA-03, UC-PA-04, UC-PA-05, UC-PA-06, UC-PA-07, UC-PA-08, UC-PA-09 |
| P1 — Manual identity confirmation | UC-PA-10, UC-PA-11 |
| P1 — Real-time attendance dashboard with present/absent lists | UC-PA-12 |
| P2 — Ready-to-depart indicator | UC-PA-13 |
| P2 — Attendance summary & data aggregation | UC-PA-14 |
