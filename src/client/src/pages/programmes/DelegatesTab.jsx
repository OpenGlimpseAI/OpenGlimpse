import { useState, useEffect } from "react";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import { getDelegates, addDelegate, removeDelegate, getRoutes, getUsers } from "../../services/api";
import UserPicker from "./UserPicker";

export default function DelegatesTab({ programmeId }) {
  const [delegates, setDelegates] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddDelegate, setShowAddDelegate] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadDelegates = () => {
    setLoading(true);
    Promise.all([
      getDelegates(programmeId),
      getRoutes(programmeId),
    ])
      .then(([delegateList, routeList]) => {
        setDelegates(delegateList || []);
        setRoutes(routeList || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDelegates(); }, [programmeId]);

  const alreadyInProgramme = (userId) =>
    delegates.some((d) => d.userId === userId);

  const handleAddDelegate = async (userIds, routeId) => {
    if (!userIds?.length) return;
    try {
      await addDelegate(programmeId, { userIds, routeId: routeId || undefined });
      setShowAddDelegate(false);
      loadDelegates();
    } catch (e) { setError(e.message); }
  };

  const handleRemoveDelegate = async (delegateId) => {
    if (!confirm("Remove this delegate from the programme?")) return;
    try {
      await removeDelegate(programmeId, delegateId);
      loadDelegates();
    } catch (e) { setError(e.message); }
  };

  const openAddDelegate = async () => {
    setUsersLoading(true);
    setShowAddDelegate(true);
    try {
      const users = await getUsers();
      // Only participants can be delegates — staff accounts and the AI assistant are excluded
      setAllUsers((users || []).filter((u) => u.role !== 'staff'));
    } catch (e) { setError(e.message); }
    finally { setUsersLoading(false); }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Delegates
          {delegates.length > 0 && <span className="ml-1.5 text-slate-400 font-normal normal-case">({delegates.length})</span>}
        </h3>
        <button
          className="text-sky-600 text-xs font-semibold flex items-center gap-1 hover:text-sky-700"
          onClick={openAddDelegate}
        >
          <PersonAddIcon sx={{ fontSize: 14 }} /> Add
        </button>
      </div>

      {/* UserPicker */}
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

      {/* Delegate list */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
      ) : delegates.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-slate-400">No delegates assigned yet.</p>
          <p className="text-xs text-slate-300 mt-1">Add delegates above, then assign them to routes via the Routes tab.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {delegates.map((d) => (
            <div key={d.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
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
                      <span className="text-xs bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-medium">{d.routeName}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                className="text-slate-400 hover:text-red-600 transition-colors shrink-0"
                onClick={() => handleRemoveDelegate(d.id)}
                title="Remove from programme"
              >
                <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
