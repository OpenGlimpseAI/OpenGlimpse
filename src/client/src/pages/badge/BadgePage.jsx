import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';

function getAuthUser() {
    const raw = localStorage.getItem('authUser');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function BadgePage() {
    const navigate = useNavigate();
    const currentUser = getAuthUser();

    if (!currentUser) {
        navigate('/login');
        return null;
    }

    return (
        <main className="directory-page" style={{ minHeight: '100dvh' }}>
            <header className="directory-header">
                <h1 className="directory-title">Welcome, {currentUser.name}</h1>
            </header>

            <div className="px-4 pb-6 space-y-4">
                <p className="text-sm text-slate-500">Your digital badge for check-in. Show the QR code below to staff at any checkpoint.</p>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center gap-4 w-full max-w-[320px] mx-auto">
                    <div className="bg-white rounded-xl p-2" style={{ boxShadow: '0 0 0 2px #e2e8f0' }}>
                        <QRCodeCanvas
                            value={currentUser.id}
                            size={200}
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                            level="M"
                        />
                    </div>

                    <div className="text-center">
                        <p className="text-base font-semibold text-slate-800">{currentUser.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
                    </div>

                    <div className="bg-slate-50 rounded-lg px-3 py-2 w-full text-center">
                        <p className="text-[10px] text-slate-400 font-mono break-all select-all">
                            {currentUser.id}
                        </p>
                    </div>
                </div>

                <p className="text-xs text-slate-400 text-center max-w-[280px] mx-auto">
                    Show this QR code to staff to check in. The code encodes your account UUID.
                </p>
            </div>
        </main>
    );
}
