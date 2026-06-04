import { useState } from "react";
import PhoneIcon from "@mui/icons-material/Phone";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToRegIcon from "@mui/icons-material/HowToReg";

const MOCK_PROGRAMMES = ["SG Delegation Trip", "Shanghai Expo 2026", "ASEAN Trade Mission"];
const MOCK_ROUTE = "Coach A · 14 Jun 2026";

const MOCK_MISSING = [
  { id: "d1", name: "John Tan" },
  { id: "d2", name: "Mary Lim" },
  { id: "d3", name: "Alex Wong" },
];

const MOCK_PRESENT = [
  { id: "d4", name: "Sarah Chen", method: "auto", time: "2 min ago" },
  { id: "d5", name: "David Lee", method: "manual", time: "5 min ago" },
  { id: "d6", name: "Priya Singh", method: "auto", time: "1 min ago" },
  { id: "d7", name: "Robert Ng", method: "auto", time: "8 min ago" },
  { id: "d8", name: "Grace Tan", method: "auto", time: "3 min ago" },
  { id: "d9", name: "James Chen", method: "manual", time: "12 min ago" },
  { id: "d10", name: "Linda Ho", method: "auto", time: "1 min ago" },
  { id: "d11", name: "Ahmed Zaki", method: "auto", time: "6 min ago" },
  { id: "d12", name: "Siti Rahman", method: "auto", time: "4 min ago" },
];

export function AdminDashboard() {
  const [programme, setProgramme] = useState(MOCK_PROGRAMMES[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [ready, setReady] = useState(false);

  const total = MOCK_PRESENT.length + MOCK_MISSING.length;
  const checked = MOCK_PRESENT.length;

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <button
            className="dashboard-programme-btn"
            onClick={() => setShowPicker((p) => !p)}
          >
            <span>{programme}</span>
            <KeyboardArrowDown
              className={`dashboard-chevron ${showPicker ? "dashboard-chevron-open" : ""}`}
            />
          </button>
          <p className="dashboard-route">{MOCK_ROUTE}</p>
        </div>

        {showPicker && (
          <div className="dashboard-picker">
            {MOCK_PROGRAMMES.map((p) => (
              <button
                key={p}
                className={`dashboard-picker-item ${p === programme ? "dashboard-picker-item-active" : ""}`}
                onClick={() => {
                  setProgramme(p);
                  setShowPicker(false);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="dashboard-counter-shell">
        <div className="dashboard-counter-card">
          <GroupsIcon sx={{ fontSize: 20 }} className="dashboard-counter-icon" />
          <span className="dashboard-counter-value">
            {checked}/{total}
          </span>
          <span className="dashboard-counter-label">checked in</span>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2 className="dashboard-section-heading dashboard-section-heading-missing">
            <span className="dashboard-dot dashboard-dot-missing" />
            {MOCK_MISSING.length} still missing
          </h2>
          <ul className="dashboard-card">
            {MOCK_MISSING.map((d) => (
              <li key={d.id} className="dashboard-row">
                <span className="dashboard-row-name">{d.name}</span>
                <button className="dashboard-call-btn" aria-label={`Call ${d.name}`}>
                  <PhoneIcon sx={{ fontSize: 16 }} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-section">
          <h2 className="dashboard-section-heading dashboard-section-heading-present">
            <CheckCircleIcon sx={{ fontSize: 14 }} />
            {MOCK_PRESENT.length} checked in
          </h2>
          <ul className="dashboard-card">
            {MOCK_PRESENT.map((d) => (
              <li key={d.id} className="dashboard-row">
                <div className="dashboard-row-left">
                  <div className="dashboard-avatar" />
                  <span className="dashboard-row-name">{d.name}</span>
                </div>
                <span
                  className={`dashboard-badge ${
                    d.method === "auto" ? "dashboard-badge-auto" : "dashboard-badge-manual"
                  }`}
                >
                  {d.method}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="dashboard-ready-shell">
        <button
          className={`dashboard-ready-btn ${ready ? "dashboard-ready-btn-on" : ""}`}
          onClick={() => setReady((r) => !r)}
        >
          <HowToRegIcon sx={{ fontSize: 20 }} />
          <span>{ready ? "All accounted for" : "Ready to depart?"}</span>
        </button>
      </div>
    </main>
  );
}
