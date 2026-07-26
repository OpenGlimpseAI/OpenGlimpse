import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProgrammes } from "../../services/api";
import GroupsIcon from "@mui/icons-material/Groups";
import SettingsIcon from "@mui/icons-material/Settings";
import CameraAltIcon from "@mui/icons-material/CameraAlt";

function getAuthUser() {
    const raw = localStorage.getItem('authUser');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export default function StaffLandingPage() {
    const navigate = useNavigate();
    const currentUser = getAuthUser();

    if (!currentUser) {
        navigate('/login');
        return null;
    }

    const [programmes, setProgrammes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProgrammes()
            .then(setProgrammes)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const activeProgrammes = programmes.filter(p => p.status === 'active');
    const totalDelegates = programmes.reduce((sum, p) => sum + (p.totalDelegates || 0), 0);
    const totalChecked = programmes.reduce((sum, p) => sum + (p.checkedIn || 0), 0);

    return (
        <main className="directory-page" style={{ minHeight: '100dvh' }}>
            <header className="directory-header">
                <h1 className="directory-title">Welcome, {currentUser.name}</h1>
            </header>

            <div className="px-4 pb-6 space-y-5">
                <p className="text-sm text-slate-500">Manage your programmes, check in delegates, and monitor attendance.</p>

                {!loading && programmes.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4 text-center">
                            <p className="text-3xl font-semibold text-slate-900">{activeProgrammes.length}</p>
                            <p className="text-xs text-slate-500 mt-1">Active programmes</p>
                        </div>
                        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-4 text-center">
                            <p className="text-3xl font-semibold text-slate-900">{totalChecked}/{totalDelegates}</p>
                            <p className="text-xs text-slate-500 mt-1">Total check-ins</p>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 text-center">
                            <p className="text-xs text-slate-400">Loading...</p>
                        </div>
                        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 text-center">
                            <p className="text-xs text-slate-400">Loading...</p>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Actions</p>
                    <button className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 text-left hover:bg-slate-50 transition-colors" onClick={() => navigate("/dashboard")}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600"><GroupsIcon sx={{ fontSize: 20 }} /></div>
                        <div><p className="text-sm font-medium text-slate-800">Dashboard</p><p className="text-xs text-slate-400">View live attendance</p></div>
                    </button>
                    <button className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 text-left hover:bg-slate-50 transition-colors" onClick={() => navigate("/programmes")}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><SettingsIcon sx={{ fontSize: 20 }} /></div>
                        <div><p className="text-sm font-medium text-slate-800">Manage Programmes</p><p className="text-xs text-slate-400">Create and edit programmes</p></div>
                    </button>
                    <button className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 text-left hover:bg-slate-50 transition-colors" onClick={() => navigate("/camera")}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600"><CameraAltIcon sx={{ fontSize: 20 }} /></div>
                        <div><p className="text-sm font-medium text-slate-800">Camera</p><p className="text-xs text-slate-400">Face recognition & QR check-in</p></div>
                    </button>
                </div>
            </div>
        </main>
    );
}
