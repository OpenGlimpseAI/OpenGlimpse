import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import { getProgrammes } from "../../services/api";
import RoutesTab from "./RoutesTab";
import SummaryTab from "./SummaryTab";

const TABS = [
  { key: "routes", label: "Routes" },
  { key: "summary", label: "Summary" },
  { key: "manage", label: "Manage Programme" },
];

export default function ProgrammeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [programmes, setProgrammes] = useState([]);
  const [allLoading, setAllLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const activeTab = location.pathname.split("/").pop();
  const tabIndex = TABS.findIndex((t) => t.key === activeTab);

  useEffect(() => {
    if (!id) return;
    setAllLoading(true);
    setLoading(true);
    getProgrammes()
      .then((list) => {
        const data = list || [];
        setProgrammes(data);
        const p = data.find((x) => x.id === id);
        setProgramme(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => { setLoading(false); setAllLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!loading && programme && tabIndex < 0) {
      navigate(`/programmes/${id}/routes`, { replace: true });
    }
  }, [loading, programme, tabIndex, id, navigate]);

  const handleTabChange = (_, idx) => {
    if (idx === 2) {
      navigate("/programmes");
    } else {
      navigate(`/programmes/${id}/${TABS[idx].key}`);
    }
  };

  if (loading) {
    return (
      <main className="directory-page">
        <header className="directory-header">
          <button className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => navigate("/dashboard")}>
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </button>
          <h1 className="directory-title">Loading...</h1>
        </header>
      </main>
    );
  }

  if (error) {
    return (
      <main className="directory-page">
        <header className="directory-header">
          <button className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => navigate("/dashboard")}>
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </button>
          <h1 className="directory-title text-red-500">{error}</h1>
        </header>
      </main>
    );
  }

  if (!programme) {
    return (
      <main className="directory-page">
        <header className="directory-header">
          <button className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => navigate("/dashboard")}>
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </button>
          <h1 className="directory-title text-red-500">Programme not found</h1>
        </header>
      </main>
    );
  }

  return (
    <main className="directory-page">
      <header className="directory-header">
        <div className="flex items-center gap-3">
          <button className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => navigate("/dashboard")}>
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </button>
          <div className="relative min-w-0 flex-1">
            <button
              className="flex items-center gap-1.5 text-left"
              onClick={() => setShowPicker((p) => !p)}
            >
              <div className="min-w-0">
                <h1 className="directory-title truncate">{programme.name}</h1>
                <p className="text-xs text-slate-500">{programme.startDate} – {programme.endDate}</p>
              </div>
              <KeyboardArrowDown sx={{ fontSize: 18, color: "#94a3b8" }} />
            </button>
            {showPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-slate-100 max-h-60 overflow-y-auto">
                {programmes.map((p) => (
                  <button
                    key={p.id}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${p.id === id ? "bg-sky-50 font-semibold text-sky-700" : "text-slate-700"}`}
                    onClick={() => { navigate(`/programmes/${p.id}/routes`); setShowPicker(false); }}
                  >
                    <span className="truncate block">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 pt-2 sm:px-6">
        <Tabs
          value={tabIndex >= 0 && tabIndex < 2 ? tabIndex : false}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
        >
          {TABS.map((t) => <Tab key={t.key} label={t.label} />)}
        </Tabs>
      </div>

      <div className="px-4 sm:px-6 pb-6 pt-6">
        {tabIndex === 0 && <RoutesTab programmeId={id} />}
        {tabIndex === 1 && <SummaryTab programmeId={id} />}
      </div>
    </main>
  );
}
