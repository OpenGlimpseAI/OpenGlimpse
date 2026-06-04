import { useState, useMemo, useRef, useEffect } from "react";
import PhoneIcon from "@mui/icons-material/Phone";
import CheckIcon from "@mui/icons-material/Check";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import ScheduleIcon from "@mui/icons-material/Schedule";

const ALL_DELEGATES = [
  { id: "d1", name: "John Tan", status: "missing", notes: "", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-001" },
  { id: "d2", name: "Mary Lim", status: "missing", notes: "Badge missing", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-002" },
  { id: "d3", name: "Alex Wong", status: "missing", notes: "Verified manually", programme: "SG Delegation Trip", route: "Coach B", badge: "SCCCI-003" },
  { id: "d4", name: "Sarah Chen", status: "present", method: "auto", time: "2 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-004" },
  { id: "d5", name: "David Lee", status: "present", method: "manual", time: "5 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-005" },
  { id: "d6", name: "Priya Singh", status: "present", method: "auto", time: "1 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach B", badge: "SCCCI-006" },
  { id: "d7", name: "Robert Ng", status: "present", method: "auto", time: "8 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-007" },
  { id: "d8", name: "Grace Tan", status: "present", method: "auto", time: "3 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach B", badge: "SCCCI-008" },
  { id: "d9", name: "James Chen", status: "present", method: "manual", time: "12 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-009" },
  { id: "d10", name: "Linda Ho", status: "present", method: "auto", time: "1 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-010" },
  { id: "d11", name: "Ahmed Zaki", status: "present", method: "auto", time: "6 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach B", badge: "SCCCI-011" },
  { id: "d12", name: "Siti Rahman", status: "present", method: "auto", time: "4 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-012" },
  { id: "d13", name: "Kevin Low", status: "present", method: "manual", time: "15 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach B", badge: "SCCCI-013" },
  { id: "d14", name: "Nurul Hassan", status: "present", method: "auto", time: "1 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-014" },
  { id: "d15", name: "Chen Wei", status: "present", method: "auto", time: "3 min ago", notes: "", programme: "SG Delegation Trip", route: "Coach A", badge: "SCCCI-015" },
];

const FILTERS = ["All", "Missing", "Present"];

export default function Directory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [checked, setChecked] = useState(() => {
    const map = {};
    ALL_DELEGATES.forEach((d) => {
      map[d.id] = d.status === "present";
    });
    return map;
  });
  const [selected, setSelected] = useState(null);
  const sheetRef = useRef(null);

  const delegates = useMemo(() => {
    let list = ALL_DELEGATES;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }

    if (filter === "Missing") {
      list = list.filter((d) => !checked[d.id]);
    } else if (filter === "Present") {
      list = list.filter((d) => checked[d.id]);
    }

    return [...list].sort((a) => (checked[a.id] ? 1 : -1));
  }, [search, filter, checked]);

  const markPresent = (id) => {
    setChecked((prev) => ({ ...prev, [id]: true }));
  };

  const markAbsent = (id) => {
    setChecked((prev) => ({ ...prev, [id]: false }));
  };

  const missingCount = delegates.filter((d) => !checked[d.id]).length;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) {
      setSelected(null);
    }
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const isPresent = selected ? checked[selected.id] : false;

  return (
    <main className="directory-page">
      <header className="directory-header">
        <h1 className="directory-title">Directory</h1>
        {missingCount > 0 && (
          <span className="directory-missing-pill">{missingCount} missing</span>
        )}
      </header>

      <div className="directory-search-shell">
        <div className="directory-search-box">
          <SearchIcon sx={{ fontSize: 18 }} className="directory-search-icon" />
          <input
            type="text"
            placeholder="Search delegates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="directory-search-input"
          />
          {search && (
            <button className="directory-search-clear" onClick={() => setSearch("")}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          )}
        </div>
      </div>

      <div className="directory-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`directory-filter-btn ${f === filter ? "directory-filter-btn-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="directory-list-shell">
        {delegates.length === 0 ? (
          <p className="directory-empty">No delegates found</p>
        ) : (
          <ul className="directory-card">
            {delegates.map((d) => {
              const present = checked[d.id];
              return (
                <li
                  key={d.id}
                  className="directory-row directory-row-clickable"
                  onClick={() => setSelected(d)}
                >
                  <div className="directory-row-left">
                    <div
                      className={`directory-avatar ${
                        present ? "directory-avatar-present" : "directory-avatar-missing"
                      }`}
                    >
                      {d.name.charAt(0)}
                    </div>
                    <div className="directory-row-text">
                      <span className="directory-row-name">{d.name}</span>
                      <span
                        className={`directory-row-status ${
                          present ? "directory-status-present" : "directory-status-missing"
                        }`}
                      >
                        {present
                          ? d.method === "auto"
                            ? "Checked in (auto)"
                            : "Checked in (manual)"
                          : d.notes || "Not checked in"}
                      </span>
                    </div>
                  </div>

                  <div className="directory-row-actions" onClick={(e) => e.stopPropagation()}>
                    {present ? (
                      <button
                        className="directory-action-btn directory-action-undo"
                        onClick={() => markAbsent(d.id)}
                      >
                        Undo
                      </button>
                    ) : (
                      <>
                        <button
                          className="directory-action-btn directory-action-check"
                          onClick={() => markPresent(d.id)}
                        >
                          <CheckIcon sx={{ fontSize: 16 }} />
                          Check in
                        </button>
                        <button className="directory-call-btn-sm" aria-label={`Call ${d.name}`}>
                          <PhoneIcon sx={{ fontSize: 14 }} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <div className="profile-backdrop" onClick={handleBackdrop}>
          <div className="profile-sheet" ref={sheetRef}>
            <div className="profile-handle" />

            <div className="profile-hero">
              <div
                className={`profile-hero-avatar ${
                  isPresent ? "profile-hero-avatar-present" : "profile-hero-avatar-missing"
                }`}
              >
                {selected.name.charAt(0)}
              </div>
              <h2 className="profile-hero-name">{selected.name}</h2>
              <span
                className={`profile-hero-status ${
                  isPresent ? "profile-hero-status-present" : "profile-hero-status-missing"
                }`}
              >
                {isPresent ? "Checked in" : "Not checked in"}
              </span>
            </div>

            <div className="profile-details">
              <div className="profile-detail-row">
                <BadgeIcon sx={{ fontSize: 18 }} className="profile-detail-icon" />
                <span className="profile-detail-label">Badge</span>
                <span className="profile-detail-value">{selected.badge}</span>
              </div>
              <div className="profile-detail-row">
                <PersonIcon sx={{ fontSize: 18 }} className="profile-detail-icon" />
                <span className="profile-detail-label">Programme</span>
                <span className="profile-detail-value">{selected.programme}</span>
              </div>
              <div className="profile-detail-row">
                <ScheduleIcon sx={{ fontSize: 18 }} className="profile-detail-icon" />
                <span className="profile-detail-label">Route</span>
                <span className="profile-detail-value">{selected.route}</span>
              </div>
              {isPresent && selected.method && (
                <div className="profile-detail-row">
                  <CheckIcon sx={{ fontSize: 18 }} className="profile-detail-icon" />
                  <span className="profile-detail-label">Method</span>
                  <span className="profile-detail-value">
                    {selected.method === "auto" ? "Facial recognition" : "Manual check-in"}
                    {selected.time && ` · ${selected.time}`}
                  </span>
                </div>
              )}
              {!isPresent && selected.notes && (
                <div className="profile-detail-row">
                  <span className="profile-detail-icon">!</span>
                  <span className="profile-detail-label">Note</span>
                  <span className="profile-detail-value profile-detail-value-note">{selected.notes}</span>
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button className="profile-action-btn profile-action-call">
                <PhoneIcon sx={{ fontSize: 18 }} />
                Call
              </button>
              {isPresent ? (
                <button
                  className="profile-action-btn profile-action-absent"
                  onClick={() => { markAbsent(selected.id); setSelected(null); }}
                >
                  Mark as Absent
                </button>
              ) : (
                <button
                  className="profile-action-btn profile-action-present"
                  onClick={() => { markPresent(selected.id); setSelected(null); }}
                >
                  <CheckIcon sx={{ fontSize: 18 }} />
                  Mark as Present
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
