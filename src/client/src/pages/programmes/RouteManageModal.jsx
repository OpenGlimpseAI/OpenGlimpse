import { useState, useEffect, useMemo } from "react";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { setDelegateRoutes } from "../../services/api";

export default function RouteManageModal({ route, allDelegates, programmeId, onClose, onSaved }) {
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
                    <button className="flex-1 bg-sky-gradient text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : `Save (${selectedIds.length})`}
                    </button>
                    <button className="px-6 bg-slate-100 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors active:bg-slate-300" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
