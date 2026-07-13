const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

// Programmes
export const getProgrammes = () => request('GET', '/programmes');
export const createProgramme = (data) => request('POST', '/programmes', data);
export const updateProgramme = (id, data) => request('PUT', `/programmes/${id}`, data);
export const deleteProgramme = (id) => request('DELETE', `/programmes/${id}`);

// Routes
export const getRoutes = (id) => request('GET', `/programmes/${id}/routes`);
export const addRoute = (id, data) => request('POST', `/programmes/${id}/routes`, data);
export const updateRoute = (id, routeId, data) => request('PUT', `/programmes/${id}/routes/${routeId}`, data);
export const deleteRoute = (id, routeId) => request('DELETE', `/programmes/${id}/routes/${routeId}`);

// Delegates (within programme)
export const getDelegates = (id) => request('GET', `/programmes/${id}/delegates`);
export const addDelegate = (id, data) => request('POST', `/programmes/${id}/delegates`, data);
export const removeDelegate = (id, delegateId) => request('DELETE', `/programmes/${id}/delegates/${delegateId}`);

// Attendance
export const getAttendance = (id) => request('GET', `/programmes/${id}/attendance`);
export const getAttendanceSummary = (id) => request('GET', `/programmes/${id}/attendance/summary`);
export const markAttendance = (id, delegateId, data) => request('PUT', `/programmes/${id}/attendance/${delegateId}`, data);

// Ready to depart
export const getReadyStatus = (id) => request('GET', `/programmes/${id}/ready-to-depart`);
export const toggleReady = (id, data) => request('PUT', `/programmes/${id}/ready-to-depart`, data);
