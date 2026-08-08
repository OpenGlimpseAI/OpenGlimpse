import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import TimelineIcon from "@mui/icons-material/Timeline";
import { getProgrammes, createProgramme, updateProgramme, deleteProgramme } from "../../services/api";
import Toast from "../../components/shared/Toast";
import ConfirmModal from "../../components/shared/ConfirmModal";

export default function ManageProgrammeTab() {
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [modalMode, setModalMode] = useState(null);
  const [modalProgramme, setModalProgramme] = useState(null);
  const [modalName, setModalName] = useState("");
  const [modalStart, setModalStart] = useState("");
  const [modalEnd, setModalEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadProgrammes = () => {
    setLoading(true);
    getProgrammes().then((data) => setProgrammes(data || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { loadProgrammes(); }, []);

  const openCreate = () => {
    setModalMode("create");
    setModalProgramme(null);
    setModalName(""); setModalStart(""); setModalEnd("");
  };

  const openEdit = (p) => {
    setModalMode("edit");
    setModalProgramme(p);
    setModalName(p.name); setModalStart(p.startDate); setModalEnd(p.endDate);
  };

  const handleModalSave = async () => {
    if (!modalName.trim() || !modalStart || !modalEnd) return;
    setSaving(true);
    try {
      if (modalMode === "edit" && modalProgramme) {
        await updateProgramme(modalProgramme.id, { name: modalName, startDate: modalStart, endDate: modalEnd });
        setToast("Programme updated");
      } else {
        await createProgramme({ name: modalName, startDate: modalStart, endDate: modalEnd });
        setToast("Programme created");
      }
      setModalMode(null);
      setModalProgramme(null);
      loadProgrammes();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProgramme(deleteTarget);
      setDeleteTarget(null);
      loadProgrammes();
      setToast("Programme deleted");
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">All Programmes</h3>
        <button className="bg-sky-gradient text-white rounded-xl px-4 py-1.5 text-xs font-semibold flex items-center gap-1" onClick={openCreate}>
          <AddIcon sx={{ fontSize: 14 }} /> New
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setModalMode(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">{modalMode === "edit" ? "Edit Programme" : "New Programme"}</h2>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setModalMode(null)}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" placeholder="Programme name" value={modalName} onChange={(e) => setModalName(e.target.value)} style={{ fontSize: "16px" }} />
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="date" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={modalStart} onChange={(e) => setModalStart(e.target.value)} style={{ fontSize: "16px" }} />
              <input type="date" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={modalEnd} onChange={(e) => setModalEnd(e.target.value)} style={{ fontSize: "16px" }} />
            </div>
            <div className="flex gap-2 pt-1">
              <button className="flex-1 rounded-xl bg-sky-gradient text-white py-2.5 text-sm font-semibold disabled:opacity-50" onClick={handleModalSave} disabled={saving}>
                {saving ? "Saving..." : modalMode === "edit" ? "Save" : "Create"}
              </button>
              <button className="flex-1 rounded-xl bg-slate-100 text-slate-600 py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors" onClick={() => setModalMode(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Programme"
          message="This cannot be undone. All routes and delegate assignments will be removed."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
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
                <button className="text-slate-400 hover:text-red-600 transition-colors w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100" onClick={() => setDeleteTarget(p.id)}><DeleteIcon sx={{ fontSize: 16 }} /></button>
              </div>
            </div>
          </div>
        ))
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
