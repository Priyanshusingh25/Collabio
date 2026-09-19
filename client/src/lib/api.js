/**
 * Unified API client.
 * - Injects the JWT from the auth store automatically
 * - Unwraps the {success, data, meta} envelope
 * - Normalizes errors (incl. per-field validation errors)
 * - Supports request cancellation via AbortSignal
 */
import { useAuthStore } from '../stores/authStore';

const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(message, { status, code, fields } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'REQUEST_FAILED';
    this.fields = fields;
  }
}

async function request(path, { method = 'GET', body, signal, raw = false } = {}) {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && token) {
    // Session expired/revoked — reset auth state and let the router redirect.
    useAuthStore.getState().clearSession();
  }

  if (raw) return res;

  let payload = null;
  try { payload = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    throw new ApiError(payload?.error?.message || `Request failed (${res.status})`, {
      status: res.status,
      code: payload?.error?.code,
      fields: payload?.error?.fields,
    });
  }
  return payload?.data ?? payload;
}

function qs(params) {
  const clean = Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: (path, signal) => request(path, { signal }),
  post: (path, body, signal) => request(path, { method: 'POST', body, signal }),
  put: (path, body, signal) => request(path, { method: 'PUT', body, signal }),
  del: (path, signal) => request(path, { method: 'DELETE', signal }),
  qs,
  raw: request,
};

// ---------- auth (pre-login; no token yet) ----------
export const authApi = {
  login: async (email, password) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    });
    const payload = await res.json();
    if (!res.ok) throw new ApiError(payload?.error?.message || 'Login failed', { status: res.status, code: payload?.error?.code, fields: payload?.error?.fields });
    return payload.data;
  },
  register: async (body) => {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const payload = await res.json();
    if (!res.ok) throw new ApiError(payload?.error?.message || 'Registration failed', { status: res.status, fields: payload?.error?.fields });
    return payload.data;
  },
  demo: async () => {
    const res = await fetch(`${BASE}/auth/demo`, { method: 'POST' });
    const payload = await res.json();
    if (!res.ok) throw new ApiError(payload?.error?.message || 'Demo login failed', { status: res.status });
    return payload.data;
  },
};

// ---------- domain endpoints ----------
export const endpoints = {
  deals: {
    list: (params, signal) => request(`/deals${qs(params)}`, { signal }),
    get: (id, signal) => request(`/deals/${id}`, { signal }),
    create: (body) => request('/deals', { method: 'POST', body }),
    update: (id, body) => request(`/deals/${id}`, { method: 'PUT', body }),
    move: (id, body) => request(`/deals/${id}/move`, { method: 'POST', body }),
    remove: (id) => request(`/deals/${id}`, { method: 'DELETE' }),
    health: (id) => request(`/deals/${id}/health`),
    timeline: (id) => request(`/deals/${id}/timeline`),
    addNote: (id, content) => request(`/deals/${id}/notes`, { method: 'POST', body: { content } }),
    deleteNote: (dealId, noteId) => request(`/deals/${dealId}/notes/${noteId}`, { method: 'DELETE' }),
    addAttachment: (id, body) => request(`/deals/${id}/attachments`, { method: 'POST', body }),
  },
  brands: {
    list: (params, signal) => request(`/brands${qs(params)}`, { signal }),
    get: (id, signal) => request(`/brands/${id}`, { signal }),
    create: (body) => request('/brands', { method: 'POST', body }),
    update: (id, body) => request(`/brands/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/brands/${id}`, { method: 'DELETE' }),
  },
  contacts: {
    list: (params, signal) => request(`/contacts${qs(params)}`, { signal }),
    get: (id, signal) => request(`/contacts/${id}`, { signal }),
    create: (body) => request('/contacts', { method: 'POST', body }),
    update: (id, body) => request(`/contacts/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
  },
  invoices: {
    list: (params, signal) => request(`/invoices${qs(params)}`, { signal }),
    get: (id, signal) => request(`/invoices/${id}`, { signal }),
    create: (body) => request('/invoices', { method: 'POST', body }),
    update: (id, body) => request(`/invoices/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
    addPayment: (id, body) => request(`/invoices/${id}/payments`, { method: 'POST', body }),
  },
  services: {
    list: (params, signal) => request(`/services${qs(params)}`, { signal }),
    create: (body) => request('/services', { method: 'POST', body }),
    update: (id, body) => request(`/services/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/services/${id}`, { method: 'DELETE' }),
  },
  notes: {
    list: (params, signal) => request(`/notes${qs(params)}`, { signal }),
    create: (body) => request('/notes', { method: 'POST', body }),
    update: (id, body) => request(`/notes/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (params, signal) => request(`/tasks${qs(params)}`, { signal }),
    create: (body) => request('/tasks', { method: 'POST', body }),
    update: (id, body) => request(`/tasks/${id}`, { method: 'PUT', body }),
    setStatus: (id, status) => request(`/tasks/${id}/status`, { method: 'POST', body: { status } }),
    remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  },
  communications: {
    list: (params, signal) => request(`/communications${qs(params)}`, { signal }),
    create: (body) => request('/communications', { method: 'POST', body }),
    remove: (id) => request(`/communications/${id}`, { method: 'DELETE' }),
  },
  templates: {
    list: (params, signal) => request(`/templates${qs(params)}`, { signal }),
    create: (body) => request('/templates', { method: 'POST', body }),
    update: (id, body) => request(`/templates/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
  },
  notifications: {
    list: (params, signal) => request(`/notifications${qs(params)}`, { signal }),
    unreadCount: () => request('/notifications/unread-count'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
  },
  activity: {
    list: (params, signal) => request(`/activity${qs(params)}`, { signal }),
  },
  search: (q, signal) => request(`/search${qs({ q })}`, { signal }),
  stats: {
    overview: (signal) => request('/stats/overview', { signal }),
    revenue: (signal) => request('/stats/revenue', { signal }),
    forecast: (signal) => request('/stats/forecast', { signal }),
  },
  preferences: {
    get: () => request('/preferences'),
    update: (body) => request('/preferences', { method: 'PUT', body }),
    listViews: () => request('/preferences/views'),
    createView: (body) => request('/preferences/views', { method: 'POST', body }),
    deleteView: (id) => request(`/preferences/views/${id}`, { method: 'DELETE' }),
  },
  workspace: {
    export: () => request('/workspace/export'),
    restore: (body) => request('/workspace/restore', { method: 'POST', body }),
    importPreview: (body) => request('/workspace/import/preview', { method: 'POST', body }),
    importCommit: (body) => request('/workspace/import/commit', { method: 'POST', body }),
    csvUrl: (entity) => `${BASE}/workspace/export/${entity}`,
  },
  health: () => fetch(`${BASE}/health`).then((r) => r.json()),
};
