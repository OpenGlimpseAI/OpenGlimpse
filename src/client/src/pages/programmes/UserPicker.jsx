import { useState } from "react";

export default function UserPicker({ users, alreadyAdded, onAdd, onCancel, routes }) {
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
