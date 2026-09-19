/**
 * Unit tests — invoice money math and lifecycle rules.
 * The server must be the sole authority on totals: a client can never
 * dictate an invoice total, and payments can never exceed the amount due.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeTotals, TRANSITIONS } = require('../../src/services/invoiceService');

test('computeTotals sums line items with quantity', () => {
  const t = computeTotals([{ description: 'Reel', amount: 1200, quantity: 2 }], 0, 0);
  assert.equal(t.subtotal, 2400);
  assert.equal(t.tax, 0);
  assert.equal(t.total, 2400);
});

test('computeTotals applies discount BEFORE tax', () => {
  const t = computeTotals([{ description: 'Reel', amount: 1000 }], 10, 100);
  assert.equal(t.subtotal, 1000);
  // (1000 - 100) * 10% = 90 tax -> 990 total
  assert.equal(t.tax, 90);
  assert.equal(t.total, 990);
});

test('computeTotals never returns a negative total', () => {
  const t = computeTotals([{ description: 'Small', amount: 50 }], 5, 500);
  assert.equal(t.subtotal, 50);
  assert.ok(t.total >= 0, 'total must never go negative');
});

test('computeTotals rounds to cents (no floating-point drift)', () => {
  const t = computeTotals([{ description: 'x', amount: 0.1 }, { description: 'y', amount: 0.2 }], 0, 0);
  assert.equal(t.subtotal, 0.3);
  assert.equal(String(t.total).includes('00000000004'), false);
});

test('computeTotals handles an empty invoice', () => {
  const t = computeTotals([], 18, 0);
  assert.deepEqual(t, { subtotal: 0, tax: 0, total: 0 });
});

test('computeTotals ignores missing quantities and coerces strings', () => {
  const t = computeTotals([{ description: 'Bonus', amount: '250' }], 0, 0);
  assert.equal(t.subtotal, 250);
});

test('paid and cancelled are terminal invoice states', () => {
  assert.deepEqual(TRANSITIONS.paid, []);
  assert.deepEqual(TRANSITIONS.cancelled, []);
});

test('invoice lifecycle allows the documented progression', () => {
  assert.ok(TRANSITIONS.draft.includes('sent'));
  assert.ok(TRANSITIONS.sent.includes('partially_paid'));
  assert.ok(TRANSITIONS.sent.includes('paid'));
  assert.ok(TRANSITIONS.partially_paid.includes('paid'));
  assert.ok(TRANSITIONS.overdue.includes('paid'));
});

test('a draft invoice cannot jump straight to paid', () => {
  assert.equal(TRANSITIONS.draft.includes('paid'), false);
});

test('an invoice cannot be un-cancelled or un-paid', () => {
  assert.equal(TRANSITIONS.cancelled.includes('sent'), false);
  assert.equal(TRANSITIONS.paid.includes('overdue'), false);
});