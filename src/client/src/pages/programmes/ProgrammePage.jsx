import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import {
    getProgrammes, createProgramme, updateProgramme, deleteProgramme,
    getRoutes, addRoute, updateRoute, deleteRoute,
    getDelegates, addDelegate, removeDelegate,
} from "../../services/api";

function DelegateRow({ d, routes, programmeId, onRemove, onRefresh }) {
    const [assigning, setAssigning] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(d.routeId || "");

    const handleAssignRoute = async () => {
        if (!selectedRoute) return;
        try {
            await updateRoute(programmeId, selectedRoute, { addDelegateIds: [d.id] });
            if (d.routeId) {
                await updateRoute(programmeId, d.routeId, { removeDelegateIds: [d.id] });
            }
            setAssigning(false);
            onRefresh();
        } catch (e) {
            // ignore
        }
    };

    return (
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    d.status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>
                    {d.name.charAt(0)}
                </div>
                <div className="min-w-0">
                    <span className="text-sm text-slate-800">{d.name}</span>
                    {d.badge && <span className="ml-2 text-xs text-slate-400">{d.badge}</span>}
                    <span className={`ml-2 text-xs ${d.status === "present" ? "text-emerald-500" : "text-amber-500"}`}>
                        {d.status === "present" ? "checked in" : "absent"}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {assigning ? (
                    <div className="flex items-center gap-1">
                        <select className="text-xs rounded-lg border border-slate-200 px-2 py-1 outline-none" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
                            <option value="">No route</option>
                            {routes.filter((r) => r.id !== d.routeId).map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <button className="text-xs text-sky-600 font-semibold" onClick={handleAssignRoute}>Set</button>
                        <button className="text-xs text-slate-400" onClick={() => setAssigning(false)}>X</button>
                    </div>
                ) : (
                    <button className="text-xs text-slate-400 hover:text-sky-600 transition-colors" onClick={() => setAssigning(true)}>
                        {d.routeName || "Assign route"}
                    </button>
                )}
                <button className="text-slate-400 hover:text-red-600 transition-colors" onClick={() => onRemove(d.id)}>
                    <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />
                </button>
            </div>
        </div>
    );
}

export default function ProgrammePage() {
    const navigate = useNavigate();
    const [programmes, setProgrammes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formName, setFormName] = useState("");
    const [formStart, setFormStart] = useState("");
    const [formEnd, setFormEnd] = useState("");

    const [expandedId, setExpandedId] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [routesLoading, setRoutesLoading] = useState(false);
    const [newRouteName, setNewRouteName] = useState("");
    const [editingRouteId, setEditingRouteId] = useState(null);
    const [editingRouteName, setEditingRouteName] = useState("");

    const [delegates, setDelegates] = useState([]);
    const [delegatesLoading, setDelegatesLoading] = useState(false);
    const [showAddDelegate, setShowAddDelegate] = useState(false);
    const [newDelName, setNewDelName] = useState("");
    const [newDelBadge, setNewDelBadge] = useState("");
    const [newDelRoute, setNewDelRoute] = useState("");

    const loadProgrammes = () => {
        setLoading(true);
        getProgrammes()
            .then(setProgrammes)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadProgrammes(); }, []);

    const loadDelegates = async (id) => {
        setDelegatesLoading(true);
        try {
            const list = await getDelegates(id);
            setDelegates(list);
        } catch (e) {
            setError(e.message);
        } finally {
            setDelegatesLoading(false);
        }
    };

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
            if (expandedId === id) { setExpandedId(null); setRoutes([]); }
            loadProgrammes();
        } catch (e) { setError(e.message); }
    };

    const toggleExpand = async (id) => {
        if (expandedId === id) {
            setExpandedId(null); setRoutes([]); setDelegates([]);
            return;
        }
        setExpandedId(id);
        setRoutesLoading(true);
        try {
            const [routeList] = await Promise.all([getRoutes(id)]);
            setRoutes(routeList);
            loadDelegates(id);
        } catch (e) { setError(e.message); }
        finally { setRoutesLoading(false); }
    };

    const handleAddRoute = async (e) => {
        e.preventDefault();
        if (!newRouteName.trim() || !expandedId) return;
        try {
            await addRoute(expandedId, { name: newRouteName.trim() });
            setNewRouteName("");
            setRoutes(await getRoutes(expandedId));
        } catch (e) { setError(e.message); }
    };

    const handleUpdateRoute = async (routeId) => {
        if (!editingRouteName.trim()) return;
        try {
            await updateRoute(expandedId, routeId, { name: editingRouteName.trim() });
            setEditingRouteId(null);
            setRoutes(await getRoutes(expandedId));
        } catch (e) { setError(e.message); }
    };

    const handleDeleteRoute = async (routeId) => {
        if (!confirm("Delete this route?")) return;
        try {
            await deleteRoute(expandedId, routeId);
            setRoutes(await getRoutes(expandedId));
        } catch (e) { setError(e.message); }
    };

    const handleAddDelegate = async (e) => {
        e.preventDefault();
        if (!newDelName.trim() || !expandedId) return;
        try {
            await addDelegate(expandedId, { name: newDelName.trim(), badge: newDelBadge.trim() || undefined, routeId: newDelRoute || undefined });
            setNewDelName(""); setNewDelBadge(""); setNewDelRoute("");
            setShowAddDelegate(false);
            loadDelegates(expandedId);
        } catch (e) { setError(e.message); }
    };

    const handleRemoveDelegate = async (delegateId) => {
        if (!confirm("Remove this delegate from the programme?")) return;
        try {
            await removeDelegate(expandedId, delegateId);
            loadDelegates(expandedId);
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

            {showForm && (
                <div className="px-4 pb-4 sm:px-6">
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-3">
                        <h2 className="text-sm font-semibold text-slate-700">{editing ? "Edit Programme" : "New Programme"}</h2>
                        <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" placeholder="Programme name" value={formName} onChange={(e) => setFormName(e.target.value)} />
                        <div className="flex gap-3">
                            <input type="date" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
                            <input type="date" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button className="flex-1 rounded-xl bg-sky-600 text-white py-2 text-sm font-semibold hover:bg-sky-700 transition-colors" onClick={handleSave}>{editing ? "Save" : "Create"}</button>
                            <button className="flex-1 rounded-xl bg-slate-100 text-slate-600 py-2 text-sm font-semibold hover:bg-slate-200 transition-colors" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 px-4 pb-6 sm:px-6 space-y-2">
                {loading ? (
                    <p className="text-center text-slate-400 pt-8">Loading...</p>
                ) : programmes.length === 0 ? (
                    <p className="text-center text-slate-400 pt-8">No programmes. Create one to get started.</p>
                ) : (
                    programmes.map((p) => (
                        <div key={p.id} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                            <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors" onClick={() => toggleExpand(p.id)}>
                                <div>
                                    <span className="text-sm font-medium text-slate-800">{p.name}</span>
                                    <span className="ml-2 text-xs text-slate-400">{p.startDate} – {p.endDate}</span>
                                    <span className={`ml-2 text-xs uppercase px-2 py-0.5 rounded-full ${
                                        p.status === "active" ? "bg-emerald-50 text-emerald-600" :
                                        p.status === "completed" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-600"
                                    }`}>{p.status}</span>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-xs text-slate-400">{p.checkedIn}/{p.totalDelegates}</span>
                                    <button className="text-slate-400 hover:text-sky-600 transition-colors" onClick={() => openEdit(p)}><EditIcon sx={{ fontSize: 16 }} /></button>
                                    <button className="text-slate-400 hover:text-red-600 transition-colors" onClick={() => handleDelete(p.id)}><DeleteIcon sx={{ fontSize: 16 }} /></button>
                                </div>
                            </button>

                            {expandedId === p.id && (
                                <div className="border-t border-slate-100">
                                    <div className="px-4 py-3 bg-slate-50 space-y-2">
                                        <h3 className="text-xs font-semibold text-slate-500 uppercase">Routes / Coaches</h3>
                                        {routesLoading ? (
                                            <p className="text-xs text-slate-400">Loading...</p>
                                        ) : routes.length === 0 ? (
                                            <p className="text-xs text-slate-400">No routes yet</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {routes.map((r) => (
                                                    <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
                                                        {editingRouteId === r.id ? (
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <input className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-sky-400" value={editingRouteName} onChange={(e) => setEditingRouteName(e.target.value)} />
                                                                <button className="text-xs text-sky-600 font-semibold" onClick={() => handleUpdateRoute(r.id)}>Save</button>
                                                                <button className="text-xs text-slate-500" onClick={() => setEditingRouteId(null)}>Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="text-sm text-slate-800">{r.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-slate-400">{r.checkedIn}/{r.delegateCount} checked</span>
                                                                    <button className="text-slate-400 hover:text-sky-600 transition-colors" onClick={() => { setEditingRouteId(r.id); setEditingRouteName(r.name); }}><EditIcon sx={{ fontSize: 14 }} /></button>
                                                                    <button className="text-slate-400 hover:text-red-600 transition-colors" onClick={() => handleDeleteRoute(r.id)}><DeleteIcon sx={{ fontSize: 14 }} /></button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <form className="flex items-center gap-2 pt-1" onSubmit={handleAddRoute}>
                                            <input className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-sky-400" placeholder="New route name..." value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} />
                                            <button type="submit" className="bg-sky-600 text-white rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-sky-700 transition-colors">Add</button>
                                        </form>
                                    </div>

                                    <div className="border-t border-slate-100 px-4 py-3 bg-white space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-semibold text-slate-500 uppercase">Delegates</h3>
                                            <button className="text-sky-600 text-xs font-semibold flex items-center gap-1 hover:text-sky-700 transition-colors" onClick={() => setShowAddDelegate(true)}>
                                                <PersonAddIcon sx={{ fontSize: 14 }} /> Add
                                            </button>
                                        </div>

                                        {showAddDelegate && (
                                            <form className="rounded-xl bg-sky-50 p-3 border border-sky-100 space-y-2" onSubmit={handleAddDelegate}>
                                                <input className="w-full rounded-lg border border-sky-200 px-3 py-1.5 text-xs outline-none focus:border-sky-400" placeholder="Delegate name" value={newDelName} onChange={(e) => setNewDelName(e.target.value)} />
                                                <div className="flex gap-2">
                                                    <input className="flex-1 rounded-lg border border-sky-200 px-3 py-1.5 text-xs outline-none focus:border-sky-400" placeholder="Badge (optional)" value={newDelBadge} onChange={(e) => setNewDelBadge(e.target.value)} />
                                                    <select className="flex-1 rounded-lg border border-sky-200 px-3 py-1.5 text-xs outline-none focus:border-sky-400" value={newDelRoute} onChange={(e) => setNewDelRoute(e.target.value)}>
                                                        <option value="">No route</option>
                                                        {routes.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                                                    </select>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="submit" className="flex-1 bg-sky-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-sky-700 transition-colors">Add Delegate</button>
                                                    <button type="button" className="flex-1 bg-slate-100 text-slate-600 rounded-lg py-1.5 text-xs font-semibold hover:bg-slate-200 transition-colors" onClick={() => setShowAddDelegate(false)}>Cancel</button>
                                                </div>
                                            </form>
                                        )}

                                        {delegatesLoading ? (
                                            <p className="text-xs text-slate-400">Loading...</p>
                                        ) : delegates.length === 0 ? (
                                            <p className="text-xs text-slate-400">No delegates assigned yet</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {delegates.map((d) => (
                                                    <DelegateRow key={d.id} d={d} routes={routes} programmeId={expandedId} onRemove={handleRemoveDelegate} onRefresh={() => loadDelegates(expandedId)} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}