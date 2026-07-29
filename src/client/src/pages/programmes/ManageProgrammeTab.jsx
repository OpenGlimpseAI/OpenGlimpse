import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getProgrammes, createProgramme, updateProgramme, deleteProgramme } from "../../services/api";

export default function ManageProgrammeTab({ programmeId }) {
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");

  const loadProgrammes = () => {
    setLoading(true);
    getProgrammes().then((data) => setProgrammes(data || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { loadProgrammes(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFormName(""); setFormStart(""); setFormEnd("");
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setFormName(p.name); setFormStart(p.startDate); setFormEnd(p.endDate);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formStart || !formEnd) return;
    try {
      if (editing) await updateProgramme(editing, { name: formName, startDate: formStart, endDate: formEnd });
      else await createProgramme({ name: formName, startDate: formStart, endDate: formEnd });
      setShowForm(false);
      loadProgrammes();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this programme? This cannot be undone.")) return;
    try {
      await deleteProgramme(id);
      loadProgrammes();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">All Programmes</h3>
        <button className="bg-sky-600 text-white rounded-xl px-4 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-sky-700 transition-colors" onClick={openCreate}>
          <AddIcon sx={{ fontSize: 14 }} /> New
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">{editing ? "Edit Programme" : "New Programme"}</h2>
          <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" placeholder="Programme name" value={formName} onChange={(e) => setFormName(e.target.value)} style={{ fontSize: "16px" }} />
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="date" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={formStart} onChange={(e) => setFormStart(e.target.value)} style={{ fontSize: "16px" }} />
            <input type="date" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} style={{ fontSize: "16px" }} />
          </div>
          <div className="flex gap-2 pt-1">
            <button className="flex-1 rounded-xl bg-sky-600 text-white py-2 text-sm font-semibold hover:bg-sky-700 transition-colors" onClick={handleSave}>{editing ? "Save" : "Create"}</button>
            <button className="flex-1 rounded-xl bg-slate-100 text-slate-600 py-2 text-sm font-semibold hover:bg-slate-200 transition-colors" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
      ) : !programmes || programmes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-slate-400">No programmes yet.</p>
        </div>
      ) : (
        programmes.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
            <div className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/programmes/${p.id}/routes`)}>
                <span className="text-sm font-medium text-slate-800 truncate block">{p.name}</span>
                <span className="text-xs text-slate-400">{p.startDate} – {p.endDate}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">{p.checkedIn}/{p.totalDelegates}</span>
                <button className="text-slate-400 hover:text-sky-600 transition-colors w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100" onClick={() => openEdit(p)}><EditIcon sx={{ fontSize: 16 }} /></button>
                <button className="text-slate-400 hover:text-red-600 transition-colors w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100" onClick={() => handleDelete(p.id)}><DeleteIcon sx={{ fontSize: 16 }} /></button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
