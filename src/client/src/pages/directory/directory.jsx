import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CheckIcon from "@mui/icons-material/Check";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import ScheduleIcon from "@mui/icons-material/Schedule";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import EditIcon from "@mui/icons-material/Edit";
import { getProgrammes, getDelegates, getRoutes, getRoute, setDelegateRoutes } from "../../services/api";
import { joinProgramme, leaveProgramme, onAttendanceUpdated } from "../../services/socket";
import { timeAgo, getStoredProgrammeId, setStoredProgrammeId } from "../../services/utils";

const FILTERS = ["All", "Missing", "Present"];

export default function Directory() {
    const navigate = useNavigate();
    const [programmes, setProgrammes] = useState([]);
    const [programmeId, setProgrammeId] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [allDelegates, setAllDelegates] = useState([]);
    const [routes, setRoutes] = useState([]);

    const refreshData = () => {
        if (!programmeId) return;
        Promise.all([
            getDelegates(programmeId),
            getRoutes(programmeId),
        ])
            .then(([d, r]) => { setAllDelegates(d); setRoutes(r); })
            .catch(() => {});
    };

    useEffect(() => {
        const onSyncDone = () => refreshData();
        window.addEventListener('sync:done', onSyncDone);
        return () => window.removeEventListener('sync:done', onSyncDone);
    }, [programmeId]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [noteText, setNoteText] = useState("");
    const [assigning, setAssigning] = useState(null);
    const [selectedRouteIds, setSelectedRouteIds] = useState([]);
    const sheetRef = useRef(null);

    useEffect(() => {
        getProgrammes()
            .then((list) => {
                setProgrammes(list);
                if (list.length > 0) {
                    const stored = getStoredProgrammeId();
                    setProgrammeId(list.some((p) => p.id === stored) ? stored : list[0].id);
                }
            })
            .catch((e) => setError(e.message));
    }, []);

    useEffect(() => {
        if (!programmeId) return;
        setLoading(true);
        Promise.all([
            getDelegates(programmeId),
            getRoutes(programmeId),
        ])
            .then(([delegates, routeList]) => {
                setAllDelegates(delegates);
                setRoutes(routeList);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [programmeId]);

    useEffect(() => {
        if (!programmeId) return;
        joinProgramme(programmeId);
        return () => leaveProgramme(programmeId);
    }, [programmeId]);

    useEffect(() => {
        return onAttendanceUpdated((event) => {
            if (event.programmeId !== programmeId) return;
            setAllDelegates((prev) => prev.map((d) =>
                d.id === event.delegateId
                    ? { ...d, status: event.status, method: event.method, checkedInAt: event.checkedInAt }
                    : d
            ));
        });
    }, [programmeId]);

    const handleAssignRoute = async (delegateId) => {
        try {
            const validIds = selectedRouteIds.filter((id) => id);
            await setDelegateRoutes(programmeId, delegateId, validIds);
            setAssigning(null);
            setSelectedRouteIds([]);
            if (navigator.onLine) {
                const [delegates, routeList] = await Promise.all([
                    getDelegates(programmeId),
                    getRoutes(programmeId),
                ]);
                setAllDelegates(delegates);
                setRoutes(routeList);
            } else {
                const newRouteId = validIds[0] || null;
                const newRouteName = newRouteId ? (routes.find(r => r.id === newRouteId)?.name || null) : null;
                setAllDelegates(prev => prev.map(d =>
                    d.id === delegateId
                        ? { ...d, routeId: newRouteId, routeName: newRouteName, routeIds: validIds, routeNames: validIds.map(id => routes.find(r => r.id === id)?.name).filter(Boolean) }
                        : d
                ));
            }
        } catch (e) {
            // ignore
        }
    };

    const currentProgramme = programmes.find((p) => p.id === programmeId);

    const checkedMap = useMemo(() => {
        const map = {};
        allDelegates.forEach((d) => { map[d.id] = d.status === "present"; });
        return map;
    }, [allDelegates]);

    const delegates = useMemo(() => {
        let list = allDelegates;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((d) => d.name.toLowerCase().includes(q));
        }
        if (filter === "Missing") list = list.filter((d) => !checkedMap[d.id]);
        else if (filter === "Present") list = list.filter((d) => checkedMap[d.id]);
        return [...list].sort((a, b) => (checkedMap[a.id] === checkedMap[b.id] ? 0 : checkedMap[a.id] ? 1 : -1));
    }, [allDelegates, search, filter, checkedMap]);

    const missingCount = delegates.filter((d) => !checkedMap[d.id]).length;
    const handleBackdrop = (e) => { if (e.target === e.currentTarget) { setSelected(null); setNoteText(""); } };

    useEffect(() => {
        if (!selected) return;
        const onKey = (e) => { if (e.key === "Escape") { setSelected(null); setNoteText(""); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selected]);

    const isPresent = selected ? checkedMap[selected.id] : false;

    if (loading && allDelegates.length === 0 && programmes.length === 0) {
        return (
            <main className="directory-page">
                <div className="directory-header"><h1 className="directory-title">Directory</h1></div>
                <p className="text-center text-slate-400 pt-16">Loading...</p>
            </main>
        );
    }

    if (error && programmes.length === 0) {
        return (
            <main className="directory-page">
                <div className="directory-header"><h1 className="directory-title">Directory</h1></div>
                <p className="text-center text-red-500 pt-16">{error}</p>
            </main>
        );
    }

    if (programmes.length === 0) {
        return (
            <main className="directory-page">
                <div className="directory-header"><h1 className="directory-title">Directory</h1></div>
                <p className="text-center text-slate-400 pt-16">No programmes yet</p>
            </main>
        );
    }

    return (
        <main className="directory-page">
            <header className="directory-header">
                <div className="flex items-center gap-3">
                    <button className="text-xs text-sky-600 font-semibold hover:text-sky-700 transition-colors" onClick={() => navigate("/dashboard")}>
                        &larr; Back to Dashboard
                    </button>
                    <div className="flex items-center gap-2">
                        <h1 className="directory-title">Directory</h1>
                        <div className="relative">
                        <button
                            className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1"
                            onClick={() => setShowPicker((p) => !p)}
                        >
                            {currentProgramme?.name || "Select"}
                            <KeyboardArrowDown sx={{ fontSize: 14 }} />
                        </button>
                        {showPicker && (
                            <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl shadow-lg border border-slate-100 p-1 min-w-[180px]">
                                {programmes.map((p) => (
                                    <button
                                        key={p.id}
                                        className={`block w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                            p.id === programmeId ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                        onClick={() => { setProgrammeId(p.id); setStoredProgrammeId(p.id); setShowPicker(false); }}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
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
                {loading ? (
                    <p className="text-center text-slate-400 pt-8">Loading delegates...</p>
                ) : delegates.length === 0 ? (
                    <p className="directory-empty">No delegates found</p>
                ) : (
                    <ul className="directory-card">
                        {delegates.map((d) => {
                            const present = checkedMap[d.id];
                            return (
                                <li
                                    key={d.id}
                                    className="directory-row directory-row-clickable"
                                    onClick={() => { setSelected(d); setNoteText(""); }}
                                >
                                    <div className="directory-row-left">
                                        <div className={`directory-avatar ${present ? "directory-avatar-present" : "directory-avatar-missing"}`}>
                                            {d.name.charAt(0)}
                                        </div>
                                        <div className="directory-row-text">
                                            <span className="directory-row-name">{d.name}</span>
                                            <span className={`directory-row-status ${present ? "directory-status-present" : "directory-status-missing"}`}>
                                                {d.routeName || "No route"} &middot; {present ? "Checked in" : "Not checked in"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="directory-row-actions" onClick={(e) => e.stopPropagation()}>
                                        {assigning?.id === d.id ? (
                                            <div className="flex flex-col gap-1 items-end">
                                                <select
                                                    className="text-xs rounded-lg border border-sky-200 px-2 py-1 outline-none focus:border-sky-400"
                                                    value={selectedRouteIds[0] || ""}
                                                    onChange={(e) => setSelectedRouteIds(e.target.value ? [e.target.value] : [])}
                                                >
                                                    <option value="">— No route —</option>
                                                    {routes.map((r) => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                                <div className="flex gap-1 mt-1">
                                                    <button className="text-xs text-sky-600 font-semibold" onClick={() => handleAssignRoute(d.id)}>Save</button>
                                                    <button className="text-xs text-slate-400" onClick={() => setAssigning(null)}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button className="directory-action-btn" style={{background: "#f1f5f9", color: "#64748b"}} onClick={() => { setAssigning({ id: d.id }); setSelectedRouteIds(d.routeIds || []); }}>
                                                <EditIcon sx={{ fontSize: 14 }} />
                                                Route
                                            </button>
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
                            <div className={`profile-hero-avatar ${isPresent ? "profile-hero-avatar-present" : "profile-hero-avatar-missing"}`}>
                                {selected.name.charAt(0)}
                            </div>
                            <h2 className="profile-hero-name">{selected.name}</h2>
                            <span className={`profile-hero-status ${isPresent ? "profile-hero-status-present" : "profile-hero-status-missing"}`}>
                                {isPresent ? "Checked in" : "Not checked in"}
                            </span>
                        </div>
                        <div className="profile-details">
                            <div className="profile-detail-row">
                                <BadgeIcon sx={{ fontSize: 18 }} className="profile-detail-icon" />
                                <span className="profile-detail-label">Badge</span>
                                <span className="profile-detail-value">{selected.badge || "—"}</span>
                            </div>
                            <div className="profile-detail-row">
                                <PersonIcon sx={{ fontSize: 18 }} className="profile-detail-icon" />
                                <span className="profile-detail-label">Route</span>
                                <span className="profile-detail-value">{selected.routeName || "—"}</span>
                            </div>
                            {isPresent && selected.method && (
                                <div className="profile-detail-row">
                                    <ScheduleIcon sx={{ fontSize: 18 }} className="profile-detail-icon" />
                                    <span className="profile-detail-label">Checked in</span>
                                    <span className="profile-detail-value">{timeAgo(selected.checkedInAt)}</span>
                                </div>
                            )}
                            {isPresent && selected.method && (
                                <div className="profile-detail-row">
                                    <CheckIcon sx={{ fontSize: 18 }} className="profile-detail-icon" />
                                    <span className="profile-detail-label">Method</span>
                                    <span className="profile-detail-value">
                                        {selected.method === "auto" ? "Facial recognition" : "Manual check-in"}
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
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
