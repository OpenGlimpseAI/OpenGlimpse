import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
let socket = null;
let currentProgrammeId = null;

export function getSocket() {
    if (!socket) {
        socket = io(SOCKET_URL);

        socket.on('connect', () => {
            if (currentProgrammeId) {
                socket.emit('join:programme', currentProgrammeId);
            }
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
