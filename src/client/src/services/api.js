const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (res.status === 204) return null;
    const text = await res.text();
    if (!text) {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return null;
    }
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
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

// Batch attendance
export const markAttendanceBatch = (id, records) => request('POST', `/programmes/${id}/attendance`, { records });

// Face recognition
export const recognizeFaces = (id, image) => request('POST', `/programmes/${id}/recognize`, { image });

// Ready to depart
export const getReadyStatus = (id) => request('GET', `/programmes/${id}/ready-to-depart`);
export const toggleReady = (id, data) => request('PUT', `/programmes/${id}/ready-to-depart`, data);

// Auth
export const authLogin = (data) => request('POST', '/api/auth/login', data);
export const updateUserProfile = (data, token) => requestWithAuth('PATCH', '/api/auth', data, token);
export const deleteUserAccount = (data, token) => requestWithAuth('DELETE', '/api/auth', data, token);
export const getAllUsers = (token) => requestWithAuth('GET', '/api/auth/all', undefined, token);
export const createUserAccount = (data, token) => requestWithAuth('POST', '/api/auth', data, token);

async function requestWithAuth(method, path, body, token) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (res.status === 204) return null;
    const text = await res.text();
    if (!text) {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return null;
    }
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
}
