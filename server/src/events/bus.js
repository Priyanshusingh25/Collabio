/**
 * Global process-wide event bus for real-time broadcasting.
 * Services emit domain events; the websocket layer fans them out
 * to the authenticated sockets of the owning user.
 */
const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(0);

/** Domain event names — versioned so clients can evolve independently. */
const EVENTS = Object.freeze({
  DEAL_CREATED: 'deal:created',
  DEAL_UPDATED: 'deal:updated',
  DEAL_MOVED: 'deal:moved',
  DEAL_DELETED: 'deal:deleted',
  INVOICE_UPDATED: 'invoice:updated',
  PAYMENT_RECORDED: 'payment:recorded',
  TASK_UPDATED: 'task:updated',
  NOTIFICATION_CREATED: 'notification:created',
  ACTIVITY_LOGGED: 'activity:logged',
  CONTACT_UPDATED: 'contact:updated',
  BRAND_UPDATED: 'brand:updated',
  STATS_CHANGED: 'stats:changed',
  PRESENCE: 'presence',
});

function emit(eventName, payload) {
  bus.emit(eventName, { type: eventName, payload, seq: Date.now() });
}

module.exports = { bus, EVENTS, emit };
