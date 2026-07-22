const API_BASE = import.meta.env.VITE_API_URL || '';

import { db } from '../db/localDB';
//routes to sync
const SYNC_PREFIXES = ['/programmes', '/delegates', '/api/auth', '/api/user'];
//prevents auth login from being queued for sync
const NEVER_QUEUE = ['/api/auth/login'];

function isSynced(path) {
  //check if path is in NEVER_QUEUE
  if (NEVER_QUEUE.some(p => path.startsWith(p))) return false;
  return SYNC_PREFIXES.some(p => path.startsWith(p));
}

//handle requests from client
async function request(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  //check for token
  if (token) {
    opts.headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
//client action if online
  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      if (res.status === 204) {
        return null;
      }
      const text = await res.text();
      if (!text) {
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        return null;
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      if (method === 'GET' && data !== null && isSynced(path)) {
        await db.requestCache.put({
          path: path.split('?')[0],
          data
        });
      }
      return data;
      //if client is offline
    } catch (err) {
      //(unlikely case here) if sync path does not exist(ie does not support offline sync)
      if (!isSynced(path)) {
        throw err;
      }
    }
  }
//check if cached data exists
  if (!isSynced(path)) {
    throw new Error('Network required');
  }
//handle get requests
  if (method === 'GET') {
    const cached = await db.requestCache.get(path.split('?')[0]);
    if (!cached) {
      throw new Error('Not available offline');
    }
    return cached.data;
  }
//write changes to offline db
  const pc = await db.pendingChanges.get('current') || {
    id: 'current',
    ops: [],
    timestamp: 0
  };
  //push token if available
  pc.ops.push({ method, path, body: body || null, token: token || null });
  pc.timestamp = Date.now();
  await db.pendingChanges.put(pc);

  if (method === 'DELETE') {
    return null;
  }
  return body
    ? { ...body, id: body.id || 'pending' }
    : { id: 'pending' };
}

// Programmes
export const getProgrammes = () => request('GET', '/programmes');
export const createProgramme = (data) => request('POST', '/programmes', data);
export const updateProgramme = (id, data) => request('PUT', `/programmes/${id}`, data);
export const deleteProgramme = (id) => request('DELETE', `/programmes/${id}`);

// Routes
export const getRoutes = (id, archived) => {
  const qs = archived ? "?archived=true" : "";
  return request('GET', `/programmes/${id}/routes${qs}`);
};
export const addRoute = (id, data) => request('POST', `/programmes/${id}/routes`, data);
export const getRoute = (id, routeId) => request('GET', `/programmes/${id}/routes/${routeId}`);
export const updateRoute = (id, routeId, data) => request('PUT', `/programmes/${id}/routes/${routeId}`, data);
export const deleteRoute = (id, routeId) => request('DELETE', `/programmes/${id}/routes/${routeId}`);
export const archiveRoute = (id, routeId) => request('PUT', `/programmes/${id}/routes/${routeId}/archive`);
export const restoreRoute = (id, routeId) => request('PUT', `/programmes/${id}/routes/${routeId}/restore`);

// Delegates (within programme)
export const getDelegates = (id) => request('GET', `/programmes/${id}/delegates`);
export const addDelegate = (id, data) => request('POST', `/programmes/${id}/delegates`, data);
export const removeDelegate = (id, delegateId) => request('DELETE', `/programmes/${id}/delegates/${delegateId}`);

// Route members (multi-route)
export const setDelegateRoutes = (id, delegateId, routeIds) => request('PUT', `/programmes/${id}/delegates/${delegateId}/routes`, { routeIds });
export const getDelegateRoutes = (id, delegateId) => request('GET', `/programmes/${id}/delegates/${delegateId}/routes`);

// Attendance
export const getAttendance = (id) => request('GET', `/programmes/${id}/attendance`);
export const getAttendanceSummary = (id) => request('GET', `/programmes/${id}/attendance/summary`);
export const markAttendance = (id, delegateId, data) => request('PUT', `/programmes/${id}/attendance/${delegateId}`, data);

// Ready to depart (per-route)
export const getReadyStatus = (id, routeId) => request('GET', `/programmes/${id}/routes/${routeId}/ready-to-depart`);
export const toggleReady = (id, routeId, data) => request('PUT', `/programmes/${id}/routes/${routeId}/ready-to-depart`, data);

// Batch attendance
export const markAttendanceBatch = (id, records) => request('POST', `/programmes/${id}/attendance`, { records });

// Face recognition
export const recognizeFaces = (id, image) => request('POST', `/programmes/${id}/recognize`, { image });

// QR badge lookup
export const lookupByBadge = (id, badge) => request('POST', `/programmes/${id}/scan-qr`, { badge });
export const lookupBadges = (id, badges) => request('POST', `/programmes/${id}/scan-qr`, { badges });

// Users
export const getUsers = () => request('GET', '/users');

// Face
export const uploadUserFace = (userId, image, token) => requestWithAuth('PATCH', `/api/user/${userId}/face/default`, { image }, token);

// Auth
export const authLogin = (data) => request('POST', '/api/auth/login', data);
export const updateUserProfile = (data, token) => requestWithAuth('PATCH', '/api/auth', data, token);
export const deleteUserAccount = (data, token) => requestWithAuth('DELETE', '/api/auth', data, token);
export const getAllUsers = (token) => requestWithAuth('GET', '/api/auth/all', undefined, token);
export const createUserAccount = (data, token) => requestWithAuth('POST', '/api/auth', data, token);
//add token to auth request
async function requestWithAuth(method, path, body, token) {
  return request(method, path, body, token);
}
