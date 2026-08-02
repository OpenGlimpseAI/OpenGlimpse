import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConnectivity } from "../../hooks/useConnectivity";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import { getProgrammes, createProgramme, updateProgramme, deleteProgramme } from "../../services/api";
import Toast from "../../components/shared/Toast";
import ConfirmModal from "../../components/shared/ConfirmModal";

function getAuthUser() {
    const raw = localStorage.getItem('authUser');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function ProgrammePage() {
    const navigate = useNavigate();
    const currentUser = getAuthUser();

    if (!currentUser) {
        navigate('/login');
        return null;
    }
    if (currentUser.role !== 'staff') {
        navigate('/');
        return null;
    }

    const [programmes, setProgrammes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    // Modal state
    const [modalMode, setModalMode] = useState(null); // 'create' | 'edit'
    const [modalProgramme, setModalProgramme] = useState(null);
    const [modalName, setModalName] = useState("");
    const [modalStart, setModalStart] = useState("");
    const [modalEnd, setModalEnd] = useState("");
    const [saving, setSaving] = useState(false);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { isOnline } = useConnectivity();

    const loadProgrammes = () => {
        setLoading(true);
        getProgrammes().then((data) => setProgrammes(data || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
    };

    useEffect(() => { loadProgrammes(); }, []);

    // Reload programme list when back online
    useEffect(() => {
        if (isOnline) loadProgrammes();
    }, [isOnline]);

    // Reload programme list after offline sync completes
    useEffect(() => {
        const onSyncDone = () => loadProgrammes();
        window.addEventListener('sync:done', onSyncDone);
        return () => window.removeEventListener('sync:done', onSyncDone);
    }, []);

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
                if (!navigator.onLine) {
                    setProgrammes(prev => prev.map(p =>
                        p.id === modalProgramme.id ? { ...p, name: modalName, startDate: modalStart, endDate: modalEnd } : p
                    ));
                }
                setToast("Programme updated");
            } else {
                const created = await createProgramme({ name: modalName, startDate: modalStart, endDate: modalEnd });
                if (!navigator.onLine) {
                    setProgrammes(prev => [...prev, { ...created, id: 'pending-' + Date.now() }]);
                }
                setToast("Programme created");
            }
            setModalMode(null);
            setModalProgramme(null);
            if (navigator.onLine) loadProgrammes();
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteProgramme(deleteTarget);
            setDeleteTarget(null);
            if (navigator.onLine) {
                loadProgrammes();
            } else {
                setProgrammes(prev => prev.filter(p => p.id !== deleteTarget));
            }
            setToast("Programme deleted");
        } catch (e) { setError(e.message); }
    };

    return (
        <main className="directory-page">
            <header className="directory-header">
                <div className="flex items-center gap-3">
                    <button className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => navigate("/dashboard")}>
                        <ArrowBackIcon sx={{ fontSize: 20 }} />
                    </button>
                    <h1 className="directory-title">Manage Programmes</h1>
                </div>
                <button className="bg-sky-600 text-white rounded-xl px-4 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-sky-700 transition-colors" onClick={openCreate}>
                    <AddIcon sx={{ fontSize: 14 }} /> New
                </button>
            </header>

            {error && (
                <div className="mx-4 mb-3 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
                    {error}
                    <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {/* Modal */}
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
                            <button className="flex-1 rounded-xl bg-sky-600 text-white py-2.5 text-sm font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50" onClick={handleModalSave} disabled={saving}>
                                {saving ? "Saving..." : modalMode === "edit" ? "Save" : "Create"}
                            </button>
                            <button className="flex-1 rounded-xl bg-slate-100 text-slate-600 py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors" onClick={() => setModalMode(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteTarget && (
                <ConfirmModal
                    title="Delete Programme"
                    message="This cannot be undone. All routes and delegate assignments will be removed."
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            <div className="flex-1 px-4 pb-6 sm:px-6 space-y-2">
                {loading ? (
                    <p className="text-center text-slate-400 pt-8">Loading...</p>
                ) : !programmes || programmes.length === 0 ? (
                    <div className="text-center pt-8 space-y-4">
                        <p className="text-sm text-slate-400">No programmes. Create one to get started.</p>
                        <button className="bg-sky-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-sky-700 transition-colors" onClick={openCreate}>
                            Create Programme
                        </button>
                    </div>
                ) : (
                    programmes.map((p) => (
                        <div key={p.id} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                            <div className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/programmes/${p.id}/routes`)}>
                                <div className="min-w-0 flex-1">
                                    <span className="text-sm font-medium text-slate-800 truncate block">{p.name}</span>
                                    <span className="text-xs text-slate-400">{p.startDate} – {p.endDate}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{p.checkedIn}/{p.totalDelegates}</span>
                                    <button className="text-slate-400 hover:text-sky-600 transition-colors w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100" onClick={() => openEdit(p)}><EditIcon sx={{ fontSize: 16 }} /></button>
                                    <button className="text-slate-400 hover:text-red-600 transition-colors w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100" onClick={() => setDeleteTarget(p.id)}><DeleteIcon sx={{ fontSize: 16 }} /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        </main>
    );
}
