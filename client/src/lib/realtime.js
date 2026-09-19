/**
 * Realtime layer — authenticated WebSocket with reconnect + backoff,
 * degraded to polling via TanStack Query refetches when offline.
 */
import { useAuthStore } from '../stores/authStore';

const listeners = new Set();      // (event) => void
const statusListeners = new Set(); // ('live' | 'reconnecting' | 'offline') => void

let ws = null;
let retryAttempt = 0;
let reconnectTimer = null;
let status = 'offline';

function setStatus(next) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((fn) => fn(status));
}

export function onRealtimeStatus(fn) {
  statusListeners.add(fn);
  fn(status);
  return () => statusListeners.delete(fn);
}

export function onRealtimeEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function connect() {
  const token = useAuthStore.getState().token;
  if (!token || typeof window === 'undefined') return;

  if (window.navigator.onLine === false) {
    setStatus('offline');
    scheduleReconnect();
    return;
  }

  setStatus(retryAttempt === 0 ? 'reconnecting' : 'reconnecting');
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  try {
    ws = new WebSocket(`${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    retryAttempt = 0;
    setStatus('live');
  };

  ws.onmessage = (raw) => {
    try {
      const event = JSON.parse(raw.data);
      if (event.type === 'connection:established') return;
      listeners.forEach((fn) => fn(event));
    } catch { /* ignore malformed frames */ }
  };

  ws.onclose = (e) => {
    if (e?.code === 4001) {
      // token revoked/expired — do not hot-reconnect; auth layer handles re-login
      setStatus('offline');
      return;
    }
    scheduleReconnect();
  };
  ws.onerror = () => {
    try { ws.close(); } catch { /* noop */ }
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(retryAttempt, 5));
  retryAttempt += 1;
  setStatus('reconnecting');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

export function startRealtime() {
  if (!ws) connect();

  window.addEventListener('online', () => {
    if (!ws || ws.readyState > 1) { try { ws?.close(); } catch { /* noop */ } ws = null; }
    connect();
  });
  window.addEventListener('offline', () => setStatus('offline'));

  // Reconnect when the user signs in / switches account.
  useAuthStore.subscribe((state, prev) => {
    if (state.token !== prev.token) {
      if (ws) { try { ws.close(); } catch { /* noop */ } ws = null; }
      if (state.token) connect();
      else setStatus('offline');
    }
  });
}

export function getRealtimeStatus() {
  return status;
}
