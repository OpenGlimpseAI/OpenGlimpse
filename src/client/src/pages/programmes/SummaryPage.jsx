import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GroupsIcon from "@mui/icons-material/Groups";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import { getProgrammes, getAttendanceSummary, getRoutes } from "../../services/api";

function StatCard({ icon, label, value, iconClass }) {
    return (
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-white px-4 py-5 shadow-sm flex-1 min-w-[100px]">
            <span className={iconClass || "text-slate-400"}>{icon}</span>
            <span className="text-3xl font-semibold tracking-tight text-slate-900">{value}</span>
            <span className="text-xs font-medium text-slate-500">{label}</span>
        </div>
    );
}

function RouteBar({ route }) {
    const pct = route.total > 0 ? Math.round((route.checkedIn / route.total) * 100) : 0;
    return (
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-800">{route.routeName}</span>
                <span className="text-xs text-slate-500">{route.checkedIn}/{route.total} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
                <span className="text-xs text-emerald-600">{route.checkedIn} checked in</span>
                {route.missing > 0 && <span className="text-xs text-amber-600">{route.missing} missing</span>}
            </div>
        </div>
    );
}

export default function SummaryPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [programmeName, setProgrammeName] = useState("");
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            getAttendanceSummary(id),
            getProgrammes(),
            getRoutes(id),
        ])
            .then(([summ, progs, routeList]) => {
                setSummary(summ);
                setRoutes(routeList);
                const p = progs.find((x) => x.id === id);
                setProgrammeName(p?.name || "Programme");
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <main className="directory-page">
                <div className="directory-header">
                    <button className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => navigate("/dashboard")}>
                        <ArrowBackIcon sx={{ fontSize: 20 }} />
                    </button>
                    <h1 className="directory-title">Loading...</h1>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="directory-page">
                <div className="directory-header">
                    <button className="text-slate-500 hover:text-slate-700 transition-colors" onClick={() => navigate("/dashboard")}>
                        <ArrowBackIcon sx={{ fontSize: 20 }} />
                    </button>
                    <h1 className="directory-title text-red-500">{error}</h1>
                </div>
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
                        <h1 className="directory-title">Attendance Report</h1>
                        <p className="text-xs text-slate-500">{programmeName}</p>
                    </div>
                </div>
            </header>

            <div className="px-4 pb-6 sm:px-6 space-y-4">
                <div className="flex flex-wrap gap-3">
                    <StatCard icon={<GroupsIcon sx={{ fontSize: 20 }} />} label="Total" value={summary?.total ?? 0} iconClass="text-slate-400" />
                    <StatCard icon={<CheckCircleIcon sx={{ fontSize: 20 }} />} label="Checked In" value={summary?.checkedIn ?? 0} iconClass="text-emerald-500" />
                    <StatCard icon={<WarningAmberIcon sx={{ fontSize: 20 }} />} label="Missing" value={summary?.missing ?? 0} iconClass="text-amber-500" />
                    <StatCard icon={<QuestionMarkIcon sx={{ fontSize: 20 }} />} label="Unidentified" value={summary?.unidentified ?? 0} iconClass="text-slate-400" />
                </div>

                <section className="space-y-2">
                    <h2 className="text-sm font-semibold text-slate-700">By Route / Coach</h2>
                    {routes.length === 0 ? (
                        <p className="text-sm text-slate-400">No routes for this programme</p>
                    ) : (
                        <div className="space-y-2">
                            {routes.map((r) => (
                                <RouteBar key={r.routeId || r.id} route={r} />
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl bg-white px-4 py-4 shadow-sm border border-slate-100">
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Overall</h2>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${summary?.total > 0 ? Math.round((summary.checkedIn / summary.total) * 100) : 0}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-slate-500">
                        <span>{summary?.checkedIn ?? 0} checked in</span>
                        <span>{summary?.total ?? 0} total</span>
                    </div>
                </section>
            </div>
        </main>
    );
}