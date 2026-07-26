import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import {
    getProgrammes, createProgramme, updateProgramme, deleteProgramme,
    getRoutes, addRoute, updateRoute, deleteRoute,
    getDelegates, addDelegate, removeDelegate, setDelegateRoutes,
    getUsers,
} from "../../services/api";

function RouteManageModal({ route, allDelegates, programmeId, onClose, onSaved }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (route) {
            setSelectedIds(
                allDelegates.filter((d) => d.routeIds?.includes(route.id)).map((d) => d.id)
            );
        }
    }, [route, allDelegates]);

    const { onRoute, unassigned, otherRoutes } = useMemo(() => {
        const onR = [], un = [], other = [];
        for (const d of allDelegates) {
            const isOnThisRoute = d.routeIds?.includes(route.id);
            const hasOtherRoute = d.routeIds?.length > 0 && !isOnThisRoute;
            const match = !search.trim() || d.name.toLowerCase().includes(search.toLowerCase());
            if (!match) continue;
            if (isOnThisRoute) onR.push(d);
            else if (hasOtherRoute) other.push(d);
            else un.push(d);
        }
        return { onRoute: onR, unassigned: un, otherRoutes: other };
    }, [allDelegates, route, search]);

    if (!route) return null;

    const handleToggle = (id) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            for (const d of allDelegates) {
                const was = d.routeIds?.includes(route.id);
                const now = selectedIds.includes(d.id);
                if (was === now) continue;
                await setDelegateRoutes(programmeId, d.id, now ? [route.id] : []);
            }
            onSaved();
            onClose();
        } catch (e) {
            // ignore
        } finally {
            setSaving(false);
        }
    };

    const renderDelegate = (d, showRouteName) => {
        const checked = selectedIds.includes(d.id);
        const otherRoute = d.routeNames?.find((n) => n !== route.name) || d.routeName;
        return (
            <label key={d.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${checked ? "bg-sky-50" : "hover:bg-slate-50"}`}>
                <input type="checkbox" className="accent-sky-600 h-4 w-4 shrink-0" checked={checked} onChange={() => handleToggle(d.id)} />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{d.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{d.name}</div>
                    {showRouteName && otherRoute && (
                        <div className="text-[11px] text-slate-400 truncate">Currently on <span className="font-medium text-slate-500">{otherRoute}</span></div>
                    )}
                </div>
                {checked && <span className="text-[10px] font-semibold text-sky-600 shrink-0">Selected</span>}
            </label>
        );
    };

    const totalCount = allDelegates.length;
    const filteredCount = onRoute.length + unassigned.length + otherRoutes.length;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">{route.name}</h3>
                        <p className="text-[11px] text-slate-500">{selectedIds.length} of {totalCount} delegates</p>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100 shrink-0" onClick={onClose}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </button>
                </div>

                <div className="px-4 pt-3 pb-2 shrink-0">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-sky-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
                        <SearchIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                        <input
                            type="text"
                            placeholder="Search delegates..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                            style={{ fontSize: "16px" }}
                        />
                        {search && (
                            <button className="flex items-center justify-center text-slate-400 hover:text-slate-600" onClick={() => setSearch("")}>
                                <CloseIcon sx={{ fontSize: 14 }} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
                    {filteredCount === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">No delegates match your search.</p>
                    ) : (
                        <>
                            {onRoute.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between px-1 py-1.5">
                                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">On this route</span>
                                        <span className="text-[10px] text-slate-400">{onRoute.length}</span>
                                    </div>
                                    <div className="space-y-0.5">{onRoute.map((d) => renderDelegate(d, false))}</div>
                                </div>
                            )}
                            {unassigned.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between px-1 py-1.5">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Unassigned</span>
                                        <span className="text-[10px] text-slate-400">{unassigned.length}</span>
                                    </div>
                                    <div className="space-y-0.5">{unassigned.map((d) => renderDelegate(d, false))}</div>
                                </div>
                            )}
                            {otherRoutes.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between px-1 py-1.5">
                                        <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wide">On other routes</span>
                                        <span className="text-[10px] text-slate-400">{otherRoutes.length}</span>
                                    </div>
                                    <div className="space-y-0.5">{otherRoutes.map((d) => renderDelegate(d, true))}</div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="border-t border-slate-100 px-4 py-3 flex gap-2 shrink-0">
                    <button className="flex-1 bg-sky-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50 active:bg-sky-800" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : `Save (${selectedIds.length})`}
                    </button>
                    <button className="px-6 bg-slate-100 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors active:bg-slate-300" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

function DelegateRow({ d, onRemove }) {
    return (
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {d.name.charAt(0)}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{d.name}</span>
                        {d.badge && <span className="text-xs text-slate-400">{d.badge}</span>}
                    </div>
                    {d.routeName && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-medium">{d.routeName}</span>
                        </div>
                    )}
                </div>
            </div>
            <button className="text-slate-400 hover:text-red-600 transition-colors shrink-0" onClick={() => onRemove(d.id)} title="Remove from programme">
                <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />
            </button>
        </div>
    );
}

function UserPicker({ users, alreadyAdded, onAdd, onCancel, routes }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [adding, setAdding] = useState(false);
    const [assignRouteId, setAssignRouteId] = useState(routes.length === 1 ? routes[0].id : "");

    const available = users.filter((u) => !alreadyAdded(u.id));

    const handleSubmit = async () => {
        if (!selectedIds.length) return;
        setAdding(true);
        try {
            await onAdd(selectedIds, assignRouteId || undefined);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-700">Add from user list</span>
                {selectedIds.length > 0 && (
                    <span className="text-[10px] text-sky-500">{selectedIds.length} selected</span>
                )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
                {available.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">All users are already added.</p>
                ) : (
                    available.map((u) => {
                        const checked = selectedIds.includes(u.id);
                        return (
                            <label key={u.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${checked ? "bg-sky-100" : "hover:bg-sky-50/60"}`}>
                                <input type="checkbox" className="accent-sky-600 scale-90" checked={checked} onChange={() => setSelectedIds((prev) => checked ? prev.filter((i) => i !== u.id) : [...prev, u.id])} />
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-200 text-[10px] font-semibold text-sky-700">
                                    {u.enName.charAt(0)}
                                </div>
                                <span className="text-xs font-medium text-slate-700">{u.enName}</span>
                                {u.zhName && <span className="text-[10px] text-slate-400">{u.zhName}</span>}
                            </label>
                        );
                    })
                )}
            </div>
            {routes.length > 0 && (
                <select className="w-full rounded-lg border border-sky-200 px-2 py-1.5 text-xs outline-none focus:border-sky-400" value={assignRouteId} onChange={(e) => setAssignRouteId(e.target.value)}>
                    <option value="">No route assignment</option>
                    {routes.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
            )}
            <div className="flex gap-2 pt-1">
                <button className="flex-1 bg-sky-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50" onClick={handleSubmit} disabled={!selectedIds.length || adding}>
                    {adding ? "Adding..." : `Add (${selectedIds.length})`}
                </button>
                <button className="flex-1 bg-white text-slate-500 rounded-lg py-1.5 text-xs font-semibold border border-slate-200 hover:bg-slate-50 transition-colors" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}

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
    const [allUsers, setAllUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);

    const [manageRoute, setManageRoute] = useState(null);

    const loadProgrammes = () => {
        setLoading(true);
        getProgrammes().then((data) => setProgrammes(data || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
    };

    useEffect(() => { loadProgrammes(); }, []);

    const loadDelegates = async (id) => {
        setDelegatesLoading(true);
        try {
            const data = await getDelegates(id);
            setDelegates(data || []);
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
        if (!confirm("Delete this route? Delegates will keep their other routes.")) return;
        try {
            await deleteRoute(expandedId, routeId);
            setRoutes(await getRoutes(expandedId));
        } catch (e) { setError(e.message); }
    };

    const handleAddDelegate = async (userIds, routeId) => {
        if (!userIds?.length || !expandedId) return;
        try {
            await addDelegate(expandedId, { userIds, routeId: routeId || undefined });
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

    const delegateCountForRoute = (routeId) =>
        delegates.filter((d) => d.routeIds?.includes(routeId)).length;

    const openAddDelegate = async () => {
        setUsersLoading(true);
        setShowAddDelegate(true);
        try {
            const users = await getUsers();
            setAllUsers(users || []);
        } catch (e) { setError(e.message); }
        finally { setUsersLoading(false); }
    };

    const alreadyInProgramme = (userId) =>
        delegates.some((d) => d.userId === userId);

    return (
        <main className="directory-page">
            <header className="directory-header">
                <h1 className="directory-title">Programmes</h1>
                {currentUser.role === 'staff' && (
                    <button className="bg-sky-600 text-white rounded-xl px-4 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-sky-700 transition-colors" onClick={openCreate}>
                        <AddIcon sx={{ fontSize: 14 }} /> New
                    </button>
                )}
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
                </div>
            )}

            <div className="flex-1 px-4 pb-6 sm:px-6 space-y-2">
                {loading ? (
                    <p className="text-center text-slate-400 pt-8">Loading...</p>
                ) : !programmes || programmes.length === 0 ? (
                    <p className="text-center text-slate-400 pt-8">No programmes. Create one to get started.</p>
                ) : (
                    programmes.map((p) => (
                        <div key={p.id} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                            <div className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleExpand(p.id)}>
                                <div className="min-w-0 flex-1">
                                    <span className="text-sm font-medium text-slate-800 truncate block">{p.name}</span>
                                    <span className="text-xs text-slate-400">{p.startDate} – {p.endDate}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{p.checkedIn}/{p.totalDelegates}</span>
                                    <button className="text-slate-400 hover:text-sky-600 transition-colors w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100" onClick={() => openEdit(p)}><EditIcon sx={{ fontSize: 16 }} /></button>
                                    <button className="text-slate-400 hover:text-red-600 transition-colors w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100" onClick={() => handleDelete(p.id)}><DeleteIcon sx={{ fontSize: 16 }} /></button>
                                </div>
                            </div>

                            {expandedId === p.id && (
                                <div className="border-t border-slate-100">
                                    {/* Routes Section */}
                                    <div className="px-4 py-3 bg-slate-50 space-y-2">
                                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Routes / Coaches</h3>
                                        {routesLoading ? (
                                            <p className="text-xs text-slate-400">Loading...</p>
                                        ) : routes.length === 0 ? (
                                            <p className="text-xs text-slate-400 py-2">No routes yet. Add one below.</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {routes.map((r) => (
                                                    <div key={r.id} className="flex items-center bg-white rounded-xl px-3 py-2.5 border border-slate-100 gap-2">
                                                        {editingRouteId === r.id ? (
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <input className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-sky-400" value={editingRouteName} onChange={(e) => setEditingRouteName(e.target.value)} autoFocus />
                                                                <button className="text-xs text-sky-600 font-semibold shrink-0" onClick={() => handleUpdateRoute(r.id)}>Save</button>
                                                                <button className="text-xs text-slate-500 shrink-0" onClick={() => setEditingRouteId(null)}>Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-sm font-medium text-slate-800 truncate block">{r.name}</span>
                                                                    <span className="text-xs text-slate-400">
                                                                        <PeopleIcon sx={{ fontSize: 12, verticalAlign: "middle", mr: 0.3 }} />
                                                                        {delegateCountForRoute(r.id)} delegates
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <button className="text-[11px] bg-sky-600 text-white rounded-lg px-2.5 py-1.5 font-semibold hover:bg-sky-700 transition-colors active:bg-sky-800" onClick={() => setManageRoute(r)}>Assign</button>
                                                                    <button className="text-slate-400 hover:text-sky-600 transition-colors w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100" onClick={() => { setEditingRouteId(r.id); setEditingRouteName(r.name); }}><EditIcon sx={{ fontSize: 14 }} /></button>
                                                                    <button className="text-slate-400 hover:text-red-600 transition-colors w-9 h-9 flex items-center justify-center rounded-lg active:bg-slate-100" onClick={() => handleDeleteRoute(r.id)}><DeleteIcon sx={{ fontSize: 14 }} /></button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <form className="flex items-center gap-2 pt-1" onSubmit={handleAddRoute}>
                                            <input className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-400" placeholder="New route name..." value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} style={{ fontSize: "16px" }} />
                                            <button type="submit" className="bg-sky-600 text-white rounded-xl px-4 py-2 text-xs font-semibold hover:bg-sky-700 transition-colors shrink-0 active:bg-sky-800">Add</button>
                                        </form>
                                    </div>

                                    {/* Delegates Section */}
                                    <div className="border-t border-slate-100 px-4 py-3 bg-white space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Delegates
                                                {delegates.length > 0 && <span className="ml-1.5 text-slate-400 font-normal normal-case">({delegates.length})</span>}
                                            </h3>
                                            <button className="text-sky-600 text-xs font-semibold flex items-center gap-1 hover:text-sky-700 transition-colors" onClick={openAddDelegate}>
                                                <PersonAddIcon sx={{ fontSize: 14 }} /> Add
                                            </button>
                                        </div>

                                        {showAddDelegate && (
                                            <div className="rounded-xl bg-sky-50 p-3 border border-sky-100 space-y-2">
                                                {usersLoading ? (
                                                    <p className="text-xs text-slate-400 text-center py-4">Loading users...</p>
                                                ) : !allUsers || allUsers.length === 0 ? (
                                                    <p className="text-xs text-slate-400 text-center py-4">No users found.</p>
                                                ) : (
                                                    <UserPicker
                                                        users={allUsers}
                                                        alreadyAdded={(uid) => alreadyInProgramme(uid)}
                                                        onAdd={(userIds, routeId) => handleAddDelegate(userIds, routeId)}
                                                        onCancel={() => setShowAddDelegate(false)}
                                                        routes={routes}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {delegatesLoading ? (
                                            <p className="text-xs text-slate-400 text-center py-4">Loading...</p>
                                        ) : !delegates || delegates.length === 0 ? (
                                            <div className="text-center py-6">
                                                <p className="text-xs text-slate-400">No delegates assigned yet.</p>
                                                <p className="text-[10px] text-slate-300 mt-1">Add delegates above, then assign them to routes via Manage.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {delegates.map((d) => (
                                                    <DelegateRow key={d.id} d={d} onRemove={handleRemoveDelegate} />
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

            {manageRoute && (
                <RouteManageModal
                    route={manageRoute}
                    allDelegates={delegates}
                    programmeId={expandedId}
                    onClose={() => setManageRoute(null)}
                    onSaved={() => loadDelegates(expandedId)}
                />
            )}
        </main>
    );
}
