import { useState, useEffect } from "react";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { getAttendanceSummary } from "../../services/api";

function RouteSection({ route }) {
  const pct = route.total > 0 ? Math.round((route.checkedIn / route.total) * 100) : 0;
  return (
    <section className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">{route.routeName || route.name}</h3>
          {route.missing === 0 ? (
            <span className="text-xs font-semibold text-emerald-600">All checked in</span>
          ) : (
            <span className="text-xs font-semibold text-amber-600">{route.missing} missing</span>
          )}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="text-lg font-semibold text-slate-900">{route.total}</span>
            <span className="text-xs font-medium text-slate-500">Total</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2.5">
            <span className="text-lg font-semibold text-emerald-700">{route.checkedIn}</span>
            <span className="text-xs font-medium text-emerald-600">Checked In</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-amber-50 px-3 py-2.5">
            <span className="text-lg font-semibold text-amber-700">{route.missing}</span>
            <span className="text-xs font-medium text-amber-600">Missing</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-100 px-3 py-2.5">
            <span className="text-lg font-semibold text-slate-600">{route.unidentified}</span>
            <span className="text-xs font-medium text-slate-500">Unidentified</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 bg-emerald-400`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </section>
  );
}

export default function SummaryTab({ programmeId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!programmeId) return;
    setLoading(true);
    getAttendanceSummary(programmeId)
      .then((summ) => setSummary(summ))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [programmeId]);

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-8">Loading report...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500 text-center py-8">{error}</p>;
  }

  return (
    <div className="space-y-3 pt-2">
      {(summary?.byRoute ?? []).length > 0 ? (
        <div className="space-y-3">
          {(summary.byRoute).map((r) => (
            <RouteSection key={r.routeId} route={r} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-white px-3 py-4 shadow-sm">
            <span className="text-3xl font-semibold tracking-tight text-slate-900">{summary?.total ?? 0}</span>
            <span className="text-xs font-medium text-slate-500">Total</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-white px-3 py-4 shadow-sm">
            <span className="text-3xl font-semibold tracking-tight text-emerald-600">{summary?.checkedIn ?? 0}</span>
            <span className="text-xs font-medium text-emerald-600">Checked In</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-white px-3 py-4 shadow-sm">
            <span className="text-3xl font-semibold tracking-tight text-amber-600">{summary?.missing ?? 0}</span>
            <span className="text-xs font-medium text-amber-600">Missing</span>
          </div>
        </div>
      )}

      {summary?.unidentified > 0 && (
        <section className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Unidentified Scans</h3>
              <span className="text-xs font-semibold text-slate-500">{summary.unidentified} total</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {(summary.unidentifiedScans ?? []).map((s) => (
              <div key={s.scanId} className="px-4 py-3 flex items-center gap-2">
                <ScheduleIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                <span className="text-xs text-slate-500">
                  {new Date(s.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs text-slate-400 font-mono truncate">{s.scanId.slice(0, 8)}...</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
