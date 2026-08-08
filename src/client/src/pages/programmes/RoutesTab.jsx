import { useState, useEffect } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PeopleIcon from "@mui/icons-material/People";
import { getRoutes, addRoute, updateRoute, deleteRoute, getDelegates } from "../../services/api";
import RouteManageModal from "./RouteManageModal";
import Toast from "../../components/shared/Toast";
import ConfirmModal from "../../components/shared/ConfirmModal";

export default function RoutesTab({ programmeId }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newRouteName, setNewRouteName] = useState("");
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [editingRouteName, setEditingRouteName] = useState("");
  const [delegates, setDelegates] = useState([]);
  const [manageRoute, setManageRoute] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRoutes = () => {
    setLoading(true);
    Promise.all([
      getRoutes(programmeId),
      getDelegates(programmeId),
    ])
      .then(([routeList, delegateList]) => {
        setRoutes(routeList || []);
        setDelegates(delegateList || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRoutes(); }, [programmeId]);

  const delegateCountForRoute = (routeId) =>
    delegates.filter((d) => d.routeIds?.includes(routeId)).length;

  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (!newRouteName.trim()) return;
    try {
      await addRoute(programmeId, { name: newRouteName.trim() });
      setNewRouteName("");
      loadRoutes();
      setToast("Route added");
    } catch (e) { setError(e.message); }
  };

  const handleUpdateRoute = async (routeId) => {
    if (!editingRouteName.trim()) return;
    try {
      await updateRoute(programmeId, routeId, { name: editingRouteName.trim() });
      setEditingRouteId(null);
      loadRoutes();
    } catch (e) { setError(e.message); }
  };

  const handleDeleteRoute = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRoute(programmeId, deleteTarget);
      setDeleteTarget(null);
      loadRoutes();
      setToast("Route deleted");
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Add route form */}
      <form className="flex items-center gap-2" onSubmit={handleAddRoute}>
        <input
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
          placeholder="New route name..."
          value={newRouteName}
          onChange={(e) => setNewRouteName(e.target.value)}
          style={{ fontSize: "16px" }}
        />
        <button
          type="submit"
          className="bg-sky-gradient text-white rounded-xl px-4 py-2 text-xs font-semibold shrink-0"
        >
          Add
        </button>
      </form>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Route"
          message="Delete this route? Delegates will keep their other routes."
          onConfirm={handleDeleteRoute}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading routes...</p>
      ) : routes.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No routes yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {routes.map((r) => (
            <div key={r.id} className="flex items-center bg-white rounded-xl px-4 py-3 border border-slate-100 gap-2">
              {editingRouteId === r.id ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-400"
                    value={editingRouteName}
                    onChange={(e) => setEditingRouteName(e.target.value)}
                    autoFocus
                  />
                  <button className="text-sm text-sky-600 font-semibold shrink-0" onClick={() => handleUpdateRoute(r.id)}>Save</button>
                  <button className="text-sm text-slate-500 shrink-0" onClick={() => setEditingRouteId(null)}>Cancel</button>
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
                    <button
                      className="text-xs bg-sky-gradient text-white rounded-lg px-3 py-1.5 font-semibold"
                      onClick={() => setManageRoute(r)}
                    >
                      Assign
                    </button>
                    <button
                      className="text-slate-400 hover:text-sky-600 w-9 h-9 flex items-center justify-center rounded-lg"
                      onClick={() => { setEditingRouteId(r.id); setEditingRouteName(r.name); }}
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </button>
                    <button
                      className="text-slate-400 hover:text-red-600 w-9 h-9 flex items-center justify-center rounded-lg"
                      onClick={() => setDeleteTarget(r.id)}
                    >
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {manageRoute && (
        <RouteManageModal
          route={manageRoute}
          allDelegates={delegates}
          programmeId={programmeId}
          onClose={() => setManageRoute(null)}
          onSaved={loadRoutes}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
