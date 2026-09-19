/**
 * WebSocket layer — authenticated, per-user realtime event fan-out.
 *
 * - Auth: `?token=<JWT>` on the upgrade request, verified against the same
 *   secret + token_version as HTTP auth (logout kills sockets too).
 * - Transport: `ws` on the same HTTP server (no extra port).
 * - Reliability: ping/pong heartbeats, client-driven reconnect with backoff.
 * - Delivery: events are emitted on the process bus and forwarded to the
 *   sockets of the owning user with `{type, payload, seq}` envelopes.
 */
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { URL } = require('url');
const env = require('../config/env');
const { get } = require('../database/db');
const { bus } = require('../events/bus');
const logger = require('../utils/logger');

const HEARTBEAT_MS = 30_000;

const userSockets = new Map(); // userId -> Set<ws>
let wss = null;

async function authenticate(token) {
  try {
    const payload = jwt.verify(token, env.jwt.secret);
    const user = await get('SELECT id, token_version, display_name FROM users WHERE id = ?', [payload.userId]);
    if (!user || (user.token_version ?? 0) !== (payload.ver ?? 0)) return null;
    return user;
  } catch {
    return null;
  }
}

function broadcastToUser(userId, message) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(JSON.stringify(message)); } catch { /* socket dying; heartbeat cleans up */ }
    }
  }
}

/** Broadcast every bus event to the user who owns it. */
function wireBus() {
  for (const eventName of [
    'deal:created', 'deal:updated', 'deal:moved', 'deal:deleted',
    'invoice:updated', 'payment:recorded', 'task:updated',
    'notification:created', 'activity:logged', 'contact:updated',
    'brand:updated', 'stats:changed',
  ]) {
    bus.on(eventName, (event) => {
      if (event?.payload?.userId) {
        broadcastToUser(event.payload.userId, { type: event.type, payload: event.payload, seq: event.seq });
      }
    });
  }
}

function initWebsocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const user = await authenticate(url.searchParams.get('token'));
    if (!user) {
      ws.close(4001, 'unauthorized');
      return;
    }

    ws.userId = user.id;
    ws.isAlive = true;
    if (!userSockets.has(user.id)) userSockets.set(user.id, new Set());
    userSockets.get(user.id).add(ws);

    ws.send(JSON.stringify({ type: 'connection:established', payload: { userId: user.id }, seq: Date.now() }));

    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (raw) => {
      // Client → server messages are limited to presence pings.
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'presence:ping') ws.send(JSON.stringify({ type: 'presence:pong', seq: Date.now() }));
      } catch { /* ignore malformed frames */ }
    });
    ws.on('close', () => {
      const sockets = userSockets.get(ws.userId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) userSockets.delete(ws.userId);
      }
    });
    ws.on('error', () => { /* handled by close */ });
  });

  const heartbeat = setInterval(() => {
    for (const sockets of userSockets.values()) {
      for (const ws of sockets) {
        if (!ws.isAlive) { ws.terminate(); continue; }
        ws.isAlive = false;
        try { ws.ping(); } catch { /* ignore */ }
      }
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  wireBus();
  logger.info('websocket:listening', { path: '/ws' });
  return wss;
}

/** Connection count per user — used by the presence indicator. */
function isUserOnline(userId) {
  const sockets = userSockets.get(userId);
  return Boolean(sockets && sockets.size > 0);
}

module.exports = { initWebsocket, broadcastToUser, isUserOnline };
