import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CheckIcon from "@mui/icons-material/Check";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import GroupsIcon from "@mui/icons-material/Groups";
import AddIcon from "@mui/icons-material/Add";
import BarChartIcon from "@mui/icons-material/BarChart";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import { getProgrammes, getAttendance, getAttendanceSummary, getRoutes, getRoute, getDelegates, markAttendance, toggleReady } from "../../services/api";
import { joinProgramme, leaveProgramme, onAttendanceUpdated } from "../../services/socket";
import { timeAgo } from "../../services/utils";
import { useConnectivity } from "../../hooks/useConnectivity";
import { resolveProgramme, saveProgrammeId } from "../../hooks/useProgramme";

function getAuthUser() {
    const raw = localStorage.getItem('authUser');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

const FILTERS = ["All", "Missing", "Present"];

export function AdminDashboard() {
    const navigate = useNavigate();
    const { routeId } = useParams();
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
    const [programmeId, setProgrammeId] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [allDelegates, setAllDelegates] = useState([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [selected, setSelected] = useState(null);
    const [noteText, setNoteText] = useState("");
    const [tick, setTick] = useState(0);
    const { isOnline } = useConnectivity();
    const allDelegatesRef = useRef(allDelegates);
    allDelegatesRef.current = allDelegates;
    const routesRef = useRef(routes);
    routesRef.current = routes;

    useEffect(() => {
        getProgrammes()
            .then((list) => {
                setProgrammes(list);
                setProgrammeId(resolveProgramme(list));
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const loadData = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const [att, summ] = await Promise.all([
                getAttendance(id),
                getAttendanceSummary(id),
            ]);
            setSummary(summ);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (programmeId) {
            loadData(programmeId);
            joinProgramme(programmeId);
            getRoutes(programmeId).then(setRoutes).catch(() => {});
            getDelegates(programmeId).then(setAllDelegates).catch(() => {});
            return () => leaveProgramme(programmeId);
        }
    }, [programmeId, loadData]);

    // Deep-link: load route from URL param on mount / programme change
    useEffect(() => {
        if (!programmeId || !routeId || !routes.length) return;
        const match = routes.find((r) => r.id === routeId);
        if (match) {
            getRoute(programmeId, routeId).then(setSelectedRoute).catch(() => {});
        }
        // eslint-disable-next-line
    }, [programmeId, routeId, routes.length]);

    useEffect(() => {
        return onAttendanceUpdated((event) => {
            if (event.programmeId !== programmeId) return;
            const delegate = allDelegatesRef.current.find((d) => d.id === event.delegateId);
            const delegateRouteIds = delegate?.routeIds || [];
            setAllDelegates((prev) => prev.map((d) =>
                d.id === event.delegateId
                    ? { ...d, status: event.status, method: event.method, checkedInAt: event.checkedInAt }
                    : d
            ));
            setSummary((prev) => prev ? {
                ...prev,
                checkedIn: event.status === "present" ? prev.checkedIn + 1 : prev.checkedIn - 1,
                missing: event.status === "present" ? prev.missing - 1 : prev.missing + 1,
            } : prev);
            setRoutes((prev) => prev.map((r) =>
                delegateRouteIds.includes(r.id)
                    ? { ...r, checkedIn: event.status === "present" ? r.checkedIn + 1 : r.checkedIn - 1 }
                    : r
            ));
            setSelectedRoute((prev) =>
                prev && delegateRouteIds.includes(prev.id)
                    ? { ...prev, checkedIn: event.status === "present" ? prev.checkedIn + 1 : prev.checkedIn - 1 }
                    : prev
            );
        });
    }, [programmeId]);

    useEffect(() => {
        const onSyncDone = () => {
            if (programmeId) {
                loadData(programmeId);
                getRoutes(programmeId).then(setRoutes).catch(() => {});
                getDelegates(programmeId).then(setAllDelegates).catch(() => {});
            }
        };
        window.addEventListener('sync:done', onSyncDone);
        return () => window.removeEventListener('sync:done', onSyncDone);
    }, [programmeId, loadData]);

    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 10000);
        return () => clearInterval(id);
    }, []);

    const handleProgrammeChange = (id) => {
        saveProgrammeId(id);
        setProgrammeId(id);
        setSelectedRoute(null);
        setSelected(null);
        setSearch("");
        setShowPicker(false);
    };

    const handleToggleReady = async (routeId) => {
        if (!programmeId) return;
        const route = routes.find((r) => r.id === routeId);
        if (!route) return;
        const next = !route.ready;
        try {
            await toggleReady(programmeId, routeId, { ready: next });
            setRoutes((prev) => prev.map((r) => r.id === routeId ? { ...r, ready: next } : r));
            setSelectedRoute((prev) => prev?.id === routeId ? { ...prev, ready: next } : prev);
        } catch (e) {
            setError(e.message);
        }
    };

    const handleSelectRoute = async (route) => {
        if (selectedRoute?.id === route.id) {
            setSelectedRoute(null);
            setSearch("");
            setFilter("All");
            navigate(`/dashboard`, { replace: true });
            return;
        }
        try {
            const full = await getRoute(programmeId, route.id);
            setSelectedRoute(full);
            navigate(`/dashboard/routes/${route.id}`, { replace: true });
        } catch (e) {
            setError(e.message);
        }
    };

    const handleCheckIn = async (id, notes = "") => {
        try {
            await markAttendance(programmeId, id, { status: "present", method: "manual", notes });
            setNoteText("");
            if (!navigator.onLine) {
                const delegate = allDelegatesRef.current.find(d => d.id === id);
                const delegateRouteIds = delegate?.routeIds || [];
                setAllDelegates(prev => prev.map(d =>
                    d.id === id ? { ...d, status: "present", method: "manual", checkedInAt: new Date().toISOString() } : d
                ));
                setSummary(prev => prev ? { ...prev, checkedIn: prev.checkedIn + 1, missing: prev.missing - 1 } : prev);
                setRoutes(prev => prev.map(r =>
                    delegateRouteIds.includes(r.id) ? { ...r, checkedIn: r.checkedIn + 1 } : r
                ));
                setSelectedRoute(prev =>
                    prev && delegateRouteIds.includes(prev.id)
                        ? { ...prev, checkedIn: prev.checkedIn + 1 }
                        : prev
                );
            }
        } catch (e) {
            setError(e.message);
        }
    };

    const handleUndo = async (id) => {
        try {
            await markAttendance(programmeId, id, { status: "absent", method: "manual", notes: "" });
        } catch (e) {
            setError(e.message);
        }
        setNoteText("");
        if (!navigator.onLine) {
            const delegate = allDelegatesRef.current.find(d => d.id === id);
            const delegateRouteIds = delegate?.routeIds || [];
            setAllDelegates(prev => prev.map(d =>
                d.id === id ? { ...d, status: "absent", method: null, checkedInAt: null } : d
            ));
            setSummary(prev => prev ? { ...prev, checkedIn: prev.checkedIn - 1, missing: prev.missing + 1 } : prev);
            setRoutes(prev => prev.map(r =>
                delegateRouteIds.includes(r.id) ? { ...r, checkedIn: r.checkedIn - 1 } : r
            ));
            setSelectedRoute(prev =>
                prev && delegateRouteIds.includes(prev.id)
                    ? { ...prev, checkedIn: prev.checkedIn - 1 }
                    : prev
            );
        }
    };

    const currentProgramme = programmes.find((p) => p.id === programmeId);

    const checkedMap = useMemo(() => {
        const map = {};
        allDelegates.forEach((d) => { map[d.id] = d.status === "present"; });
        return map;
    }, [allDelegates]);

    const routeDelegates = useMemo(() => {
        let list = allDelegates;
        if (selectedRoute) list = list.filter((d) => d.routeIds?.includes(selectedRoute.id));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((d) => d.name.toLowerCase().includes(q));
        }
        if (filter === "Missing") list = list.filter((d) => !checkedMap[d.id]);
        else if (filter === "Present") list = list.filter((d) => checkedMap[d.id]);
        return [...list].sort((a, b) => (checkedMap[a.id] === checkedMap[b.id] ? 0 : checkedMap[a.id] ? 1 : -1));
    }, [allDelegates, selectedRoute, search, filter, checkedMap]);

    const routeMissing = routeDelegates.filter((d) => !checkedMap[d.id]).length;

    const handleBackdrop = (e) => { if (e.target === e.currentTarget) { setSelected(null); setNoteText(""); } };

    useEffect(() => {
        if (!selected) return;
        const onKey = (e) => { if (e.key === "Escape") { setSelected(null); setNoteText(""); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selected]);

    const isPresent = selected ? checkedMap[selected.id] : false;

    if (loading && programmes.length === 0) {
        return (
            <main className="dashboard-page">
                <div className="px-4 pt-16 text-center">
                    <p className="text-sm text-slate-400">Loading programmes...</p>
                </div>
            </main>
        );
    }

    if (error && programmes.length === 0) {
        return (
            <main className="dashboard-page">
                <div className="px-4 pt-16 text-center">
                    <p className="text-sm text-red-500">{error}</p>
                </div>
            </main>
        );
    }

    if (programmes.length === 0) {
        return (
            <main className="dashboard-page">
                <div className="px-4 pt-16 text-center">
                    <p className="text-sm text-slate-500 mb-4">No programmes yet</p>
                    <button
                        className="bg-sky-gradient text-white px-6 py-2 rounded-xl text-sm font-semibold"
                        onClick={() => navigate("/programmes")}
                    >
                        Create Programme
                    </button>
                </div>
            </main>
        );
    }

    const checked = summary?.checkedIn ?? 0;
    const total = summary?.total ?? 0;

    return (
        <main className="dashboard-page">
            {error && (
                <div className="mx-4 mb-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm flex justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="underline">Dismiss</button>
                </div>
            )}
            <header className="dashboard-header">
                <div className="dashboard-header-inner">
                    <div className="flex items-center gap-1 min-w-0">
                        {selectedRoute ? (
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <button
                                    className="text-xs text-sky-600 font-semibold hover:text-sky-700 transition-colors shrink-0 whitespace-nowrap"
                                    onClick={() => { setSelectedRoute(null); setSearch(""); setFilter("All"); navigate("/dashboard", { replace: true }); }}
                                >
                                    &larr; All Routes
                                </button>
                                <span className="text-xs text-slate-300 shrink-0">/</span>
                                <span className="text-sm font-medium text-slate-700 truncate">{selectedRoute.name}</span>
                            </div>
                        ) : (
                            <button
                                className="dashboard-programme-btn min-w-0 flex-1"
                                onClick={() => setShowPicker((p) => !p)}
                            >
                                <span className="truncate">{currentProgramme?.name || "Select programme"}</span>
                                <KeyboardArrowDown
                                    className={`dashboard-chevron shrink-0 ${showPicker ? "dashboard-chevron-open" : ""}`}
                                />
                            </button>
                        )}
                        <div className="flex items-center gap-0.5 shrink-0">
                            <button
                                className="text-slate-400 hover:text-sky-600 transition-colors w-11 h-11 flex items-center justify-center rounded-xl active:bg-slate-100"
                                onClick={() => navigate("/directory")}
                                aria-label="Delegate directory"
                            >
                                <PeopleAltIcon sx={{ fontSize: 20 }} />
                            </button>
                            <button
                                className="text-slate-400 hover:text-sky-600 transition-colors w-11 h-11 flex items-center justify-center rounded-xl active:bg-slate-100"
                                onClick={() => navigate(`/programmes/${programmeId}/summary`)}
                                aria-label="View report"
                            >
                                <BarChartIcon sx={{ fontSize: 20 }} />
                            </button>
                            <button
                                className="text-slate-400 hover:text-slate-600 transition-colors w-11 h-11 flex items-center justify-center rounded-xl active:bg-slate-100"
                                onClick={() => navigate(`/programmes/${programmeId}/routes`)}
                                aria-label="Manage routes"
                            >
                                <AddIcon sx={{ fontSize: 24 }} />
                            </button>
                        </div>
                    </div>
                    {currentProgramme && (
                        <p className="dashboard-route">
                            {currentProgramme.startDate} – {currentProgramme.endDate}
                        </p>
                    )}
                </div>

                {showPicker && (
                    <div className="dashboard-picker">
                        {programmes.map((p) => (
                            <button
                                key={p.id}
                                className={`dashboard-picker-item ${p.id === programmeId ? "dashboard-picker-item-active" : ""}`}
                                onClick={() => handleProgrammeChange(p.id)}
                            >
                                <span>{p.name}</span>
                                <span className="text-xs text-slate-400 ml-2">{p.checkedIn}/{p.totalDelegates}</span>
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <div className="px-4 sm:px-6 space-y-3 pb-3 pt-2">
                {selectedRoute && (
                    <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm w-full">
                        <div className="flex items-center gap-2">
                            <GroupsIcon sx={{ fontSize: 16 }} className="text-slate-400" />
                            <span className="text-xs text-slate-500">Delegates</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-semibold text-slate-900">{selectedRoute.checkedIn}/{selectedRoute.delegateCount}</span>
                                <span className="text-xs text-emerald-600 font-medium">checked in</span>
                            </div>
                            {selectedRoute.delegateCount - selectedRoute.checkedIn > 0 && (
                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                                    {selectedRoute.delegateCount - selectedRoute.checkedIn} missing
                                </span>
                            )}
                        </div>
                    </div>
                )}
                {!selectedRoute && (
                    <div className="dashboard-counter-card">
                        <GroupsIcon sx={{ fontSize: 20 }} className="dashboard-counter-icon" />
                        <span className="dashboard-counter-value">{checked}/{total}</span>
                        <span className="dashboard-counter-label">checked in</span>
                    </div>
                )}
            </div>

            {!selectedRoute && (
                <div className="mx-4 sm:px-6 space-y-2 mb-4">
                    {routes.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center pt-4">No routes yet</p>
                    ) : routes.map((r) => {
                    const pct = r.delegateCount > 0 ? Math.round((r.checkedIn / r.delegateCount) * 100) : 0;
                    const isSelected = selectedRoute?.id === r.id;
                    return (
                        <div
                            key={r.id}
                            className={`rounded-2xl px-4 py-3 shadow-sm border cursor-pointer transition-colors ${isSelected ? "bg-white border-sky-300" : "bg-white border-slate-100 hover:border-sky-200"}`}
                            onClick={() => handleSelectRoute(r)}
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm font-medium text-slate-800 truncate">{r.name}</span>
                                    {r.ready ? (
                                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0">Ready to depart</span>
                                    ) : isSelected ? (
                                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600 shrink-0">active</span>
                                    ) : (
                                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 shrink-0">pending</span>
                                    )}
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${r.ready ? "bg-emerald-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between mt-1.5 gap-2">
                                <span className="text-xs text-emerald-600 truncate">{r.checkedIn} checked in</span>
                                {!r.ready && r.delegateCount - r.checkedIn > 0 && (
                                    <span className="text-xs text-amber-600 shrink-0" onClick={(e) => e.stopPropagation()}>{r.delegateCount - r.checkedIn} missing</span>
                                )}
                            </div>
                        </div>
                    );
                })}
                    </div>
                )}

            {selectedRoute && (
                <div className="px-4 sm:px-6 space-y-3 pb-4">
                    {/* Search & filter */}
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 directory-search-box">
                                <SearchIcon sx={{ fontSize: 18 }} className="directory-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search delegates..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="directory-search-input"
                                    style={{ fontSize: "16px" }}
                                />
                                {search && (
                                    <button className="directory-search-clear" onClick={() => setSearch("")}>
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
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
                    </div>

                    {/* Delegate list */}
                    <div>
                        {routeDelegates.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center pt-4">No delegates found</p>
                        ) : (
                            <ul className="directory-card">
                                {routeDelegates.map((d) => {
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
                                                        {present
                                                            ? d.method === "auto" ? "Checked in (auto)" : "Checked in (manual)"
                                                            : d.notes || "Not checked in"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="directory-row-actions" onClick={(e) => e.stopPropagation()}>
                                                {present ? (
                                                    <button className="directory-action-btn directory-action-undo" onClick={() => handleUndo(d.id)}>
                                                        Undo
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button className="directory-action-btn directory-action-check" onClick={() => handleCheckIn(d.id)}>
                                                            <CheckIcon sx={{ fontSize: 16 }} />
                                                            Check in
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Profile sheet */}
                    {selected && (
                        <div className="profile-backdrop" onClick={handleBackdrop}>
                            <div className="profile-sheet">
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
                                        <span className="profile-detail-label">Badge</span>
                                        <span className="profile-detail-value">{selected.badge || "---"}</span>
                                    </div>
                                    <div className="profile-detail-row">
                                        <span className="profile-detail-label">Route</span>
                                        <span className="profile-detail-value">{selected.routeName || "---"}</span>
                                    </div>
                                    {isPresent && selected.method && (
                                        <div className="profile-detail-row">
                                            <span className="profile-detail-label">Checked in</span>
                                            <span className="profile-detail-value">{timeAgo(selected.checkedInAt)}</span>
                                        </div>
                                    )}
                                    {isPresent && selected.method && (
                                        <div className="profile-detail-row">
                                            <span className="profile-detail-label">Method</span>
                                            <span className="profile-detail-value">
                                                {selected.method === "auto" ? "Facial recognition" : "Manual check-in"}
                                            </span>
                                        </div>
                                    )}
                                    {!isPresent && selected.notes && (
                                        <div className="profile-detail-row">
                                            <span className="profile-detail-label">Note</span>
                                            <span className="profile-detail-value profile-detail-value-note">{selected.notes}</span>
                                        </div>
                                    )}
                                </div>
                                {!isPresent && (
                                    <div className="px-4 py-2">
                                        <input
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-sky-400"
                                            placeholder="Add a note (e.g. badge missing, verified by photo)"
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            style={{ fontSize: "16px" }}
                                        />
                                    </div>
                                )}
                                <div className="profile-actions">
                                    {isPresent ? (
                                        <button className="profile-action-btn profile-action-absent" onClick={() => { handleUndo(selected.id); setSelected(null); setNoteText(""); }}>
                                            Mark as Absent
                                        </button>
                                    ) : (
                                        <button className="profile-action-btn profile-action-present" onClick={() => { handleCheckIn(selected.id, noteText); setSelected(null); }}>
                                            <CheckIcon sx={{ fontSize: 18 }} />
                                            Mark as Present
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ready to depart */}
                    <div className="dashboard-ready-shell">
                        <button
                            onClick={() => handleToggleReady(selectedRoute.id)}
                            className={`dashboard-ready-btn ${selectedRoute.ready ? "dashboard-ready-btn-on" : ""}`}
                        >
                            <HowToRegIcon sx={{ fontSize: 20 }} />
                            <span>{selectedRoute.ready ? "All accounted for" : "Ready to depart?"}</span>
                        </button>
                    </div>
                </div>
            )}

        </main>
    );
}
