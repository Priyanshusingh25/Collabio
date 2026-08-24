const API = '/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function request(url, options = {}, token) {
  const r = await fetch(url, { ...options, headers: { ...authHeaders(token), ...options.headers } });
  if (r.status === 204) return null;
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Deals
export const dealsApi = {
  getAll: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`${API}/deals${qs ? '?' + qs : ''}`, {}, token);
  },
  getOne: (token, id) => request(`${API}/deals/${id}`, {}, token),
  create: (token, data) => request(`${API}/deals`, { method: 'POST', body: JSON.stringify(data) }, token),
  update: (token, id, data) => request(`${API}/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  delete: (token, id) => request(`${API}/deals/${id}`, { method: 'DELETE' }, token),
  addNote: (token, id, content) => request(`${API}/deals/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }, token),
  deleteNote: (token, dealId, noteId) => request(`${API}/deals/${dealId}/notes/${noteId}`, { method: 'DELETE' }, token),
};

// Brands
export const brandsApi = {
  getAll: (token) => request(`${API}/brands`, {}, token),
  getOne: (token, id) => request(`${API}/brands/${id}`, {}, token),
  create: (token, data) => request(`${API}/brands`, { method: 'POST', body: JSON.stringify(data) }, token),
  update: (token, id, data) => request(`${API}/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  delete: (token, id) => request(`${API}/brands/${id}`, { method: 'DELETE' }, token),
};

// Stats
export const statsApi = {
  getOverview: (token) => request(`${API}/stats/overview`, {}, token),
};

// Services
export const servicesApi = {
  getAll: (token) => request(`${API}/services`, {}, token),
  getOne: (token, id) => request(`${API}/services/${id}`, {}, token),
  create: (token, data) => request(`${API}/services`, { method: 'POST', body: JSON.stringify(data) }, token),
  update: (token, id, data) => request(`${API}/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  delete: (token, id) => request(`${API}/services/${id}`, { method: 'DELETE' }, token),
};

// Contacts
export const contactsApi = {
  getAll: (token) => request(`${API}/contacts`, {}, token),
  getOne: (token, id) => request(`${API}/contacts/${id}`, {}, token),
  create: (token, data) => request(`${API}/contacts`, { method: 'POST', body: JSON.stringify(data) }, token),
  update: (token, id, data) => request(`${API}/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  delete: (token, id) => request(`${API}/contacts/${id}`, { method: 'DELETE' }, token),
};

// Invoices
export const invoicesApi = {
  getAll: (token) => request(`${API}/invoices`, {}, token),
  getOne: (token, id) => request(`${API}/invoices/${id}`, {}, token),
  create: (token, data) => request(`${API}/invoices`, { method: 'POST', body: JSON.stringify(data) }, token),
  update: (token, id, data) => request(`${API}/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  delete: (token, id) => request(`${API}/invoices/${id}`, { method: 'DELETE' }, token),
};

// Notes
export const notesApi = {
  getAll: (token) => request(`${API}/notes`, {}, token),
  create: (token, data) => request(`${API}/notes`, { method: 'POST', body: JSON.stringify(data) }, token),
  update: (token, id, data) => request(`${API}/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  delete: (token, id) => request(`${API}/notes/${id}`, { method: 'DELETE' }, token),
};

// Settings
export const settingsApi = {
  get: (token) => request(`${API}/settings`, {}, token),
  update: (token, data) => request(`${API}/settings`, { method: 'PUT', body: JSON.stringify(data) }, token),
};

