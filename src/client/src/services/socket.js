import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD ? (import.meta.env.VITE_SOCKET_URL || '') : '';
let socket = null;
let currentProgrammeId = null;

export function getSocket() {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            randomizationFactor: 0.5,
            timeout: 10000,
        });

        socket.on('connect', () => {
            console.log('[socket] connected');
            if (currentProgrammeId) {
                socket.emit('join:programme', currentProgrammeId);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[socket] disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            console.warn('[socket] connect error:', err.message);
        });

        socket.on('reconnect_attempt', (attempt) => {
            console.log('[socket] reconnecting, attempt:', attempt);
        });
    }
    return socket;
}

export function joinProgramme(programmeId) {
    currentProgrammeId = programmeId;
    const s = getSocket();
    s.emit('join:programme', programmeId);
}

export function leaveProgramme(programmeId) {
    currentProgrammeId = null;
    const s = getSocket();
    s.emit('leave:programme', programmeId);
}

export function onAttendanceUpdated(callback) {
    const s = getSocket();
    s.on('attendance:updated', callback);
    return () => s.off('attendance:updated', callback);
}
