import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import { getProgrammes, updateProgramme, deleteProgramme } from "../../services/api";
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
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

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

  const handleEdit = () => {
    if (!programme) return;
    setEditName(programme.name);
    setEditStart(programme.startDate);
    setEditEnd(programme.endDate);
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editStart || !editEnd || !programme) return;
    try {
      await updateProgramme(id, { name: editName, startDate: editStart, endDate: editEnd });
      setShowEditForm(false);
      setProgramme((prev) => ({ ...prev, name: editName, startDate: editStart, endDate: editEnd }));
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this programme? This cannot be undone.")) return;
    try {
      await deleteProgramme(id);
      navigate("/dashboard");
    } catch (e) { setError(e.message); }
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
      </header>

      {showEditForm && (
        <div className="px-4 pb-4 sm:px-6">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Edit Programme</h2>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" placeholder="Programme name" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ fontSize: "16px" }} />
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="date" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={{ fontSize: "16px" }} />
              <input type="date" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={{ fontSize: "16px" }} />
            </div>
            <div className="flex gap-2 pt-1">
              <button className="flex-1 rounded-xl bg-sky-600 text-white py-2 text-sm font-semibold hover:bg-sky-700 transition-colors" onClick={handleSaveEdit}>Save</button>
              <button className="flex-1 rounded-xl bg-slate-100 text-slate-600 py-2 text-sm font-semibold hover:bg-slate-200 transition-colors" onClick={() => setShowEditForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
        {tabIndex === 2 && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Programme Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">Name</label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={editName || programme.name} onChange={(e) => setEditName(e.target.value)} style={{ fontSize: "16px" }} />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 font-medium block mb-1">Start Date</label>
                    <input type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={editStart || programme.startDate} onChange={(e) => setEditStart(e.target.value)} style={{ fontSize: "16px" }} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 font-medium block mb-1">End Date</label>
                    <input type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={editEnd || programme.endDate} onChange={(e) => setEditEnd(e.target.value)} style={{ fontSize: "16px" }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <button className="bg-sky-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-sky-700 transition-colors" onClick={handleSaveEdit}>Save Changes</button>
                <button className="text-red-500 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-red-50 transition-colors" onClick={handleDelete}>Delete Programme</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
