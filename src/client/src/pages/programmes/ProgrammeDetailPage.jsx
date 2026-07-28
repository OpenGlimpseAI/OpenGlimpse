import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import { getProgrammes } from "../../services/api";
import RoutesTab from "./RoutesTab";
import SummaryTab from "./SummaryTab";

const TABS = [
  { key: "routes", label: "Routes" },
  { key: "summary", label: "Summary" },
];

export default function ProgrammeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeTab = location.pathname.split("/").pop();
  const tabIndex = TABS.findIndex((t) => t.key === activeTab);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProgrammes()
      .then((list) => {
        const p = list.find((x) => x.id === id);
        setProgramme(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Redirect bare /programmes/:id to first tab
  useEffect(() => {
    if (!loading && programme && tabIndex < 0) {
      navigate(`/programmes/${id}/routes`, { replace: true });
    }
  }, [loading, programme, tabIndex, id, navigate]);

  const handleTabChange = (_, idx) => {
    navigate(`/programmes/${id}/${TABS[idx].key}`);
  };

  // Loading state
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

  // Error state
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

  // Not found state
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
          <div>
            <h1 className="directory-title">{programme.name}</h1>
            <p className="text-xs text-slate-500">{programme.startDate} – {programme.endDate}</p>
          </div>
        </div>
        <button className="bg-sky-600 text-white rounded-xl px-4 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-sky-700 transition-colors" onClick={() => navigate("/programmes")}>
          <AddIcon sx={{ fontSize: 14 }} /> New Programme
        </button>
      </header>

      <div className="px-4 pt-2 sm:px-6">
        <Tabs
          value={tabIndex >= 0 ? tabIndex : 0}
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
