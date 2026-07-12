import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PhoneIcon from "@mui/icons-material/Phone";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import SettingsIcon from "@mui/icons-material/Settings";
import BarChartIcon from "@mui/icons-material/BarChart";
import { getProgrammes, getAttendance, getAttendanceSummary, getReadyStatus, toggleReady } from "../../services/api";
import { joinProgramme, leaveProgramme, onAttendanceUpdated } from "../../services/socket";
import { timeAgo } from "../../services/utils";

export function AdminDashboard() {
    const navigate = useNavigate();
    const [programmes, setProgrammes] = useState([]);
    const [programmeId, setProgrammeId] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [summary, setSummary] = useState(null);
    const [present, setPresent] = useState([]);
    const [missing, setMissing] = useState([]);
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unidentified, setUnidentified] = useState([]);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        getProgrammes()
            .then((list) => {
                setProgrammes(list);
                if (list.length > 0) setProgrammeId(list[0].id);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const loadData = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const [att, summ, r] = await Promise.all([
                getAttendance(id),
                getAttendanceSummary(id),
                getReadyStatus(id),
            ]);
            setPresent(att.present);
            setMissing(att.missing);
            setUnidentified(att.unidentified || []);
            setSummary(summ);
            setReady(r.ready);
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
            return () => leaveProgramme(programmeId);
        }
    }, [programmeId, loadData]);

    useEffect(() => {
        return onAttendanceUpdated((event) => {
            if (event.programmeId !== programmeId) return;
            if (event.status === "present") {
                setPresent((prev) => {
                    if (prev.some((d) => d.delegateId === event.delegateId)) return prev;
                    return [{ delegateId: event.delegateId, name: event.name || "", method: event.method, checkedInAt: event.checkedInAt }, ...prev];
                });
                setMissing((prev) => prev.filter((d) => d.delegateId !== event.delegateId));
            } else {
                setMissing((prev) => {
                    if (prev.some((d) => d.delegateId === event.delegateId)) return prev;
                    return [...prev, { delegateId: event.delegateId, name: event.name || "" }];
                });
                setPresent((prev) => prev.filter((d) => d.delegateId !== event.delegateId));
            }
            setSummary((prev) => prev ? {
                ...prev,
                checkedIn: event.status === "present" ? prev.checkedIn + 1 : prev.checkedIn - 1,
                missing: event.status === "present" ? prev.missing - 1 : prev.missing + 1,
            } : prev);
        });
    }, [programmeId]);

    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 10000);
        return () => clearInterval(id);
    }, []);

    const handleProgrammeChange = (id) => {
        setProgrammeId(id);
        setShowPicker(false);
    };

    const handleToggleReady = async () => {
        if (!programmeId) return;
        const next = !ready;
        try {
            const r = await toggleReady(programmeId, { ready: next });
            setReady(r.ready);
        } catch (e) {
            setError(e.message);
        }
    };

    const currentProgramme = programmes.find((p) => p.id === programmeId);

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
                        className="bg-sky-600 text-white px-6 py-2 rounded-xl text-sm font-semibold"
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
                    <div className="flex items-center gap-2">
                        <button
                            className="dashboard-programme-btn"
                            onClick={() => setShowPicker((p) => !p)}
                        >
                            <span>{currentProgramme?.name || "Select programme"}</span>
                            <KeyboardArrowDown
                                className={`dashboard-chevron ${showPicker ? "dashboard-chevron-open" : ""}`}
                            />
                        </button>
                        <button
                            className="text-slate-400 hover:text-sky-600 transition-colors w-10 h-10 flex items-center justify-center"
                            onClick={() => navigate(`/summary/${programmeId}`)}
                            aria-label="View report"
                        >
                            <BarChartIcon sx={{ fontSize: 18 }} />
                        </button>
                        <button
                            className="text-slate-400 hover:text-slate-600 transition-colors w-10 h-10 flex items-center justify-center"
                            onClick={() => navigate("/programmes")}
                            aria-label="Manage programmes"
                        >
                            <SettingsIcon sx={{ fontSize: 18 }} />
                        </button>
                    </div>
                    {currentProgramme && (
                        <p className="dashboard-route">
                            {currentProgramme.startDate} – {currentProgramme.endDate}
                            <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                {currentProgramme.status}
                            </span>
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

            <div className="dashboard-counter-shell">
                <div className="dashboard-counter-card">
                    <GroupsIcon sx={{ fontSize: 20 }} className="dashboard-counter-icon" />
                    <span className="dashboard-counter-value">{checked}/{total}</span>
                    <span className="dashboard-counter-label">checked in</span>
                </div>
            </div>

            <div className="dashboard-sections">
                <section className="dashboard-section">
                    <h2 className="dashboard-section-heading dashboard-section-heading-missing">
                        {missing.length} missing
                    </h2>
                    {missing.length === 0 ? (
                        <p className="text-sm text-slate-400 px-1">All delegates checked in</p>
                    ) : (
                        <ul className="dashboard-card">
                            {missing.map((d) => (
                                <li key={d.delegateId} className="dashboard-row">
                                    <span className="dashboard-row-name">{d.name}</span>
                                    {d.notes && <span className="text-xs text-amber-500 mr-2">{d.notes}</span>}
                                    <button className="dashboard-call-btn" aria-label={`Call ${d.name}`}>
                                        <PhoneIcon sx={{ fontSize: 16 }} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {unidentified.length > 0 && (
                    <section className="dashboard-section">
                        <h2 className="dashboard-section-heading text-slate-500">
                            {unidentified.length} unidentified scans
                        </h2>
                        <ul className="dashboard-card">
                            {unidentified.map((d) => (
                                <li key={d.scanId} className="dashboard-row">
                                    <span className="text-xs text-slate-400">Scan at {new Date(d.scannedAt).toLocaleTimeString()}</span>
                                    <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">unverified</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <section className="dashboard-section">
                    <h2 className="dashboard-section-heading dashboard-section-heading-present">
                        {present.length} checked in
                    </h2>
                    {present.length === 0 ? (
                        <p className="text-sm text-slate-400 px-1">No one checked in yet</p>
                    ) : (
                        <ul className="dashboard-card">
                            {present.map((d) => (
                                <li key={d.delegateId} className="dashboard-row">
                                    <div className="dashboard-row-left">
                                        <div className="dashboard-avatar" />
                                        <span className="dashboard-row-name">{d.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">{timeAgo(d.checkedInAt)}</span>
                                        <span className={`dashboard-badge ${d.method === "auto" ? "dashboard-badge-auto" : "dashboard-badge-manual"}`}>
                                            {d.method}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <div className="dashboard-ready-shell">
                <button
                    className={`dashboard-ready-btn ${ready ? "dashboard-ready-btn-on" : ""}`}
                    onClick={handleToggleReady}
                >
                    <HowToRegIcon sx={{ fontSize: 20 }} />
                    <span>{ready ? "All accounted for" : "Ready to depart?"}</span>
                </button>
            </div>
        </main>
    );
}