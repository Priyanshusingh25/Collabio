/**
 * Unit tests — Zod validation schemas (the API contract source of truth).
 * Run: node --test server/tests/unit/validators.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  registerSchema, loginSchema, changePasswordSchema,
  dealCreateSchema, dealUpdateSchema, dealMoveSchema,
  invoiceCreateSchema, invoiceUpdateSchema, paymentSchema,
  contactSchema, brandSchema, taskSchema, serviceSchema,
  communicationSchema, templateSchema, preferencesSchema,
  listQuerySchema, STAGE_FLOW, DEAL_STATUSES, INVOICE_STATUSES,
} = require('../../src/validators/schemas');

// --------------------------------------------------------------------- auth

test('registerSchema normalizes the email and keeps the username', () => {
  const out = registerSchema.parse({
    username: 'creator_one', email: '  Creator@Example.COM ', password: 'sup3rSecret',
  });
  assert.equal(out.email, 'creator@example.com');
  assert.equal(out.username, 'creator_one');
});

test('registerSchema rejects weak passwords', () => {
  const base = { username: 'creator', email: 'a@b.com' };
  assert.equal(registerSchema.safeParse({ ...base, password: 'short1' }).success, false, 'too short');
  assert.equal(registerSchema.safeParse({ ...base, password: 'onlyletters' }).success, false, 'no digit');
  assert.equal(registerSchema.safeParse({ ...base, password: '12345678' }).success, false, 'no letter');
  assert.equal(registerSchema.safeParse({ ...base, password: 'goodPass1' }).success, true);
});

test('registerSchema rejects invalid usernames and emails', () => {
  assert.equal(registerSchema.safeParse({ username: 'a', email: 'a@b.com', password: 'goodPass1' }).success, false);
  assert.equal(registerSchema.safeParse({ username: 'bad user!', email: 'a@b.com', password: 'goodPass1' }).success, false);
  assert.equal(registerSchema.safeParse({ username: 'good_user', email: 'not-an-email', password: 'goodPass1' }).success, false);
});

test('loginSchema requires an email and a password', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success, true);
});

test('changePasswordSchema enforces the same strength rules as registration', () => {
  assert.equal(changePasswordSchema.safeParse({ current_password: 'old', new_password: 'weak' }).success, false);
  assert.equal(changePasswordSchema.safeParse({ current_password: 'old', new_password: 'strongPass9' }).success, true);
});

// -------------------------------------------------------------------- deals

test('dealCreateSchema coerces money and applies documented defaults', () => {
  const base = { title: 'Reel collab', brand_name: 'GlowLab', platform: 'Instagram' };
  const ok = dealCreateSchema.parse({ ...base, deal_value: '4500' });
  assert.equal(ok.deal_value, 4500);
  assert.equal(ok.status, 'outreach', 'defaults to the first pipeline stage');
  assert.equal(ok.currency, 'USD');
  assert.equal(dealCreateSchema.safeParse({ ...base, deal_value: -10 }).success, false);
  assert.equal(dealCreateSchema.safeParse({ ...base, title: '' }).success, false);
  assert.equal(dealCreateSchema.safeParse({ ...base, brand_name: '' }).success, false);
});

test('dealCreateSchema enforces the platform enum and probability range', () => {
  const base = { title: 'X', brand_name: 'B', platform: 'YouTube' };
  assert.equal(dealCreateSchema.safeParse({ ...base, platform: 'MySpace' }).success, false);
  assert.equal(dealCreateSchema.safeParse({ ...base, probability: 140 }).success, false);
  assert.equal(dealCreateSchema.safeParse({ ...base, probability: 65 }).success, true);
});

test('dealCreateSchema validates the deadline format', () => {
  const base = { title: 'X', brand_name: 'B', platform: 'Blog' };
  assert.equal(dealCreateSchema.safeParse({ ...base, deadline: '12/25/2026' }).success, false);
  assert.equal(dealCreateSchema.safeParse({ ...base, deadline: 'tomorrow' }).success, false);
  assert.equal(dealCreateSchema.safeParse({ ...base, deadline: '2026-12-25' }).success, true);
  assert.equal(dealCreateSchema.safeParse({ ...base, deadline: '' }).success, true, 'empty string clears the date');
});

test('dealCreateSchema rejects unsafe contract URLs', () => {
  const base = { title: 'X', brand_name: 'B', platform: 'Blog' };
  assert.equal(dealCreateSchema.safeParse({ ...base, contract_url: 'javascript:alert(1)' }).success, false);
  assert.equal(dealCreateSchema.safeParse({ ...base, contract_url: 'https://cdn.example.com/c.pdf' }).success, true);
});

test('dealUpdateSchema accepts partial patches without applying create defaults', () => {
  const parsed = dealUpdateSchema.parse({ priority: 'high' });
  assert.deepEqual(parsed, { priority: 'high' });
  assert.equal(dealUpdateSchema.safeParse({}).success, true);
  assert.equal(dealUpdateSchema.safeParse({ priority: 'urgent' }).success, false);
});

test('dealMoveSchema only accepts known stages', () => {
  assert.equal(dealMoveSchema.safeParse({ status: 'published' }).success, true);
  assert.equal(dealMoveSchema.safeParse({ status: 'teleported' }).success, false);
  for (const stage of DEAL_STATUSES) {
    assert.equal(dealMoveSchema.safeParse({ status: stage }).success, true, `stage ${stage} should be valid`);
  }
});

test('STAGE_FLOW models the documented pipeline order', () => {
  const happyPath = ['negotiating', 'contract_sent', 'active', 'in_review', 'published', 'invoiced', 'paid', 'archived'];
  let from = 'outreach';
  for (const next of happyPath) {
    assert.ok((STAGE_FLOW[from] || []).includes(next), `${from} -> ${next} must be allowed`);
    from = next;
  }
});

test('STAGE_FLOW blocks illegal jumps and terminal rewinds', () => {
  assert.equal(STAGE_FLOW.outreach.includes('paid'), false, 'cannot skip the whole pipeline');
  assert.equal(STAGE_FLOW.paid.includes('published'), false, 'cannot un-pay a deal');
  assert.deepEqual(STAGE_FLOW.paid, ['archived']);
  assert.equal(STAGE_FLOW.invoiced.includes('paid'), true);
});

test('listQuerySchema coerces pagination and caps the page size', () => {
  const out = listQuerySchema.parse({ page: '2', limit: '25' });
  assert.equal(out.page, 2);
  assert.equal(out.limit, 25);
  assert.equal(listQuerySchema.safeParse({ limit: 100000 }).success, false);
  assert.equal(listQuerySchema.safeParse({ page: 0 }).success, false);
  assert.equal(listQuerySchema.safeParse({ sort: 'password' }).success, false, 'sort must be an allow-list');
  assert.equal(listQuerySchema.safeParse({ sort: 'created_at', order: 'desc' }).success, true);
});

// ----------------------------------------------------------------- invoices

test('invoiceCreateSchema validates line items, tax and discount', () => {
  const parsed = invoiceCreateSchema.parse({
    line_items: [{ description: 'Reel integration', amount: '1200', quantity: '2' }],
    tax_rate: '18', discount: '100',
  });
  assert.equal(parsed.line_items[0].amount, 1200);
  assert.equal(parsed.line_items[0].quantity, 2);
  assert.equal(parsed.tax_rate, 18);
  assert.equal(parsed.discount, 100);
  assert.equal(parsed.status, 'draft', 'new invoices start as drafts');
});

test('invoiceCreateSchema requires at least one line item', () => {
  assert.equal(invoiceCreateSchema.safeParse({ line_items: [] }).success, false);
  assert.equal(invoiceCreateSchema.safeParse({}).success, false);
});

test('invoiceCreateSchema rejects bad dates, tax rates and amounts', () => {
  const items = [{ description: 'x', amount: 10 }];
  assert.equal(invoiceCreateSchema.safeParse({ line_items: items, tax_rate: 250 }).success, false);
  assert.equal(invoiceCreateSchema.safeParse({ line_items: items, discount: -5 }).success, false);
  assert.equal(invoiceCreateSchema.safeParse({ line_items: [{ description: 'x', amount: -1 }] }).success, false);
  assert.equal(invoiceCreateSchema.safeParse({ line_items: items, issue_date: 'tomorrow' }).success, false);
  assert.equal(invoiceCreateSchema.safeParse({ line_items: items, invoice_number: 'a'.repeat(80) }).success, false);
});

test('paymentSchema rejects non-positive amounts and unknown methods', () => {
  assert.equal(paymentSchema.safeParse({ amount: 0 }).success, false);
  assert.equal(paymentSchema.safeParse({ amount: -100 }).success, false);
  assert.equal(paymentSchema.safeParse({ amount: 500 }).success, true);
  assert.equal(paymentSchema.safeParse({ amount: 500, method: 'crypto-magic' }).success, false);
  assert.equal(paymentSchema.safeParse({ amount: 500, method: 'stripe' }).success, true);
});

test('invoiceUpdateSchema limits status to the lifecycle enum', () => {
  for (const status of INVOICE_STATUSES) {
    assert.equal(invoiceUpdateSchema.safeParse({ status }).success, true, `invoice status ${status}`);
  }
  assert.equal(invoiceUpdateSchema.safeParse({ status: 'refunded' }).success, false);
});

// ------------------------------------------------------- brands & contacts

test('contactSchema validates email/URL shapes and defaults the status', () => {
  const ok = contactSchema.parse({ name: 'Ada Lovelace', email: 'ada@example.com' });
  assert.equal(ok.status, 'lead');
  assert.equal(contactSchema.safeParse({ name: 'Ada', email: 'nope' }).success, false);
  assert.equal(contactSchema.safeParse({ name: '' }).success, false);
  assert.equal(contactSchema.safeParse({ name: 'Ada', linkedin: 'not a url' }).success, false);
  assert.equal(contactSchema.safeParse({ name: 'Ada', linkedin: 'https://linkedin.com/in/ada' }).success, true);
});

test('brandSchema requires a company name and safe URLs', () => {
  const ok = brandSchema.parse({ name: 'GlowLab' });
  assert.equal(ok.relationship_status, 'prospect');
  assert.equal(brandSchema.safeParse({ name: '' }).success, false);
  assert.equal(brandSchema.safeParse({ name: 'GlowLab', website: 'javascript:alert(1)' }).success, false);
  assert.equal(brandSchema.safeParse({ name: 'GlowLab', website: 'https://glowlab.io' }).success, true);
});