/**
 * Compatibility API layer.
 * Existing pages call `dealsApi.getAll(token)` — token now comes from the
 * auth store automatically and every call routes through the new
 * /api/v1 client (envelope-unwrapping, normalized errors).
 */
import { api, endpoints } from '../lib/api';

// Deals
export const dealsApi = {
  getAll: (_token, params = {}) => endpoints.deals.list(params),
  getOne: (_token, id) => endpoints.deals.get(id),
  create: (_token, data) => endpoints.deals.create(data),
  update: (_token, id, data) => endpoints.deals.update(id, data),
  move: (_token, id, data) => endpoints.deals.move(id, data),
  delete: (_token, id) => endpoints.deals.remove(id),
  addNote: (_token, id, content) => endpoints.deals.addNote(id, content),
  deleteNote: (_token, dealId, noteId) => endpoints.deals.deleteNote(dealId, noteId),
  timeline: (_token, id) => endpoints.deals.timeline(id),
};

// Brands
export const brandsApi = {
  getAll: (_token, params = {}) => endpoints.brands.list(params),
  getOne: (_token, id) => endpoints.brands.get(id),
  create: (_token, data) => endpoints.brands.create(data),
  update: (_token, id, data) => endpoints.brands.update(id, data),
  delete: (_token, id) => endpoints.brands.remove(id),
};

// Stats
export const statsApi = {
  getOverview: () => endpoints.stats.overview(),
  getRevenue: () => endpoints.stats.revenue(),
  getForecast: () => endpoints.stats.forecast(),
};

// Services
export const servicesApi = {
  getAll: () => endpoints.services.list(),
  getOne: (_token, id) => api.get(`/services/${id}`),
  create: (_token, data) => endpoints.services.create(data),
  update: (_token, id, data) => endpoints.services.update(id, data),
  delete: (_token, id) => endpoints.services.remove(id),
};

// Contacts
export const contactsApi = {
  getAll: (_token, params = {}) => endpoints.contacts.list(params),
  getOne: (_token, id) => endpoints.contacts.get(id),
  create: (_token, data) => endpoints.contacts.create(data),
  update: (_token, id, data) => endpoints.contacts.update(id, data),
  delete: (_token, id) => endpoints.contacts.remove(id),
};

// Invoices
export const invoicesApi = {
  getAll: (_token, params = {}) => endpoints.invoices.list(params),
  getOne: (_token, id) => endpoints.invoices.get(id),
  create: (_token, data) => endpoints.invoices.create(data),
  update: (_token, id, data) => endpoints.invoices.update(id, data),
  delete: (_token, id) => endpoints.invoices.remove(id),
  addPayment: (_token, id, data) => endpoints.invoices.addPayment(id, data),
};

// Notes
export const notesApi = {
  getAll: () => endpoints.notes.list(),
  create: (_token, data) => endpoints.notes.create(data),
  update: (_token, id, data) => endpoints.notes.update(id, data),
  delete: (_token, id) => endpoints.notes.remove(id),
};

// Tasks
export const tasksApi = {
  getAll: (_token, params = {}) => endpoints.tasks.list(params),
  create: (_token, data) => endpoints.tasks.create(data),
  update: (_token, id, data) => endpoints.tasks.update(id, data),
  setStatus: (_token, id, status) => endpoints.tasks.setStatus(id, status),
  delete: (_token, id) => endpoints.tasks.remove(id),
};

// Templates
export const templatesApi = {
  getAll: (_token, params = {}) => endpoints.templates.list(params),
  create: (_token, data) => endpoints.templates.create(data),
  update: (_token, id, data) => endpoints.templates.update(id, data),
  delete: (_token, id) => endpoints.templates.remove(id),
};

// Communications
export const communicationsApi = {
  getAll: (_token, params = {}) => endpoints.communications.list(params),
  create: (_token, data) => endpoints.communications.create(data),
  delete: (_token, id) => endpoints.communications.remove(id),
};

// Notifications
export const notificationsApi = {
  getAll: (_token, params = {}) => endpoints.notifications.list(params),
  unreadCount: () => endpoints.notifications.unreadCount(),
  markRead: (_token, id) => endpoints.notifications.markRead(id),
  markAllRead: () => endpoints.notifications.markAllRead(),
};

// Activity
export const activityApi = {
  getAll: (_token, params = {}) => endpoints.activity.list(params),
};

// Global search
export const searchApi = {
  query: (q) => endpoints.search(q),
};

// Settings & preferences
export const settingsApi = {
  get: () => endpoints.preferences.get(),
  update: (_token, data) => endpoints.preferences.update(data),
  exportData: () => endpoints.workspace.export(),
  restore: (data) => endpoints.workspace.restore(data),
};

// Preferences (new)
export const preferencesApi = {
  get: () => endpoints.preferences.get(),
  update: (data) => endpoints.preferences.update(data),
  listViews: () => endpoints.preferences.listViews(),
  createView: (data) => endpoints.preferences.createView(data),
  deleteView: (id) => endpoints.preferences.deleteView(id),
};

// Workspace (import/export/backup)
export const workspaceApi = {
  export: () => endpoints.workspace.export(),
  restore: (body) => endpoints.workspace.restore(body),
  importPreview: (body) => endpoints.workspace.importPreview(body),
  importCommit: (body) => endpoints.workspace.importCommit(body),
  csvUrl: endpoints.workspace.csvUrl,
};

// Health
export const healthApi = { check: () => endpoints.health() };
