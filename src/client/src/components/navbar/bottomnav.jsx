import { Link, useLocation } from "react-router-dom";

import {
    MessagesSquare,
    LayoutDashboard,
    ScanFace,
    QrCode,
    CircleUserRound,
} from 'lucide-react';

import { useConnectivity } from '../../hooks/useConnectivity';

function getAuthUser() {
    const raw = localStorage.getItem('authUser');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function isActive(pathname, to) {
    if (to === '/chat') return pathname.startsWith('/chat');
    if (to === '/dashboard') return pathname.startsWith('/dashboard');
    if (to === '/profile') return pathname.startsWith('/profile');
    return pathname === to;
}

export default function FloatingNavbar() {
    const currentUser = getAuthUser();
    const isStaff = currentUser?.role === 'staff';
    const { isOnline } = useConnectivity();
    const { pathname } = useLocation();

    const iconProps = { size: 22, strokeWidth: 2 };

    return (
        <nav className="floatnav">
            <div className="floatnav-pill">
                <Link
                    className={isActive(pathname, '/chat') ? 'floatnav-item floatnav-item-active' : 'floatnav-item'}
                    to="/chat"
                >
                    <span className="floatnav-icon">
                        <MessagesSquare {...iconProps} />
                        {!isOnline && <span className="floatnav-dot" />}
                    </span>

                </Link>

                {isStaff && (
                    <Link
                        className={isActive(pathname, '/dashboard') ? 'floatnav-item floatnav-item-active' : 'floatnav-item'}
                        to="/dashboard"
                    >
                        <span className="floatnav-icon">
                            <LayoutDashboard {...iconProps} />
                        </span>

                    </Link>
                )}

                {isStaff && (
                    <Link
                        className={isActive(pathname, '/camera') ? 'floatnav-item floatnav-item-active' : 'floatnav-item'}
                        to="/camera"
                    >
                        <span className="floatnav-icon">
                            <ScanFace {...iconProps} />
                        </span>

                    </Link>
                )}

                {!isStaff && (
                    <Link
                        className={isActive(pathname, '/badge') ? 'floatnav-item floatnav-item-active' : 'floatnav-item'}
                        to="/badge"
                    >
                        <span className="floatnav-icon">
                            <QrCode {...iconProps} />
                        </span>

                    </Link>
                )}

                <Link
                    className={isActive(pathname, '/profile') ? 'floatnav-item floatnav-item-active' : 'floatnav-item'}
                    to="/profile"
                >
                    <span className="floatnav-icon">
                        <CircleUserRound {...iconProps} />
                    </span>

                </Link>
            </div>
        </nav>
    );
}
