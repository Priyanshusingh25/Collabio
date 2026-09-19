/* Smoke test against a running server (used during development verification). */
const BASE = process.env.BASE || 'http://localhost:3777';

let token = '';
let failures = 0;

async function call(method, path, body, expect = 200) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  const okStatus = Array.isArray(expect) ? expect.includes(res.status) : res.status === expect;
  if (!okStatus) {
    failures += 1;
    console.error(`FAIL ${method} ${path} -> ${res.status} (expected ${expect})`, JSON.stringify(data).slice(0, 300));
  } else {
    console.log(`ok   ${method} ${path} -> ${res.status}`);
  }
  return data;
}

function assert(cond, label) {
  if (!cond) { failures += 1; console.error('ASSERT FAIL:', label); } else console.log('assert ok:', label);
}

(async () => {
  // Health
  await call('GET', '/api/v1/health');
  await call('GET', '/api/v1/health/database');

  // Unauthorized access rejected
  await call('GET', '/api/v1/deals', undefined, 401);

  // Demo login
  const login = await call('POST', '/api/v1/auth/demo', {}, 200);
  token = login?.data?.token;
  assert(token, 'demo token issued');

  // Envelope shape
  const deals = await call('GET', '/api/v1/deals');
  assert(deals?.success === true && Array.isArray(deals?.data), 'deals list envelope');
  const seededDeals = deals.data;
  assert(seededDeals.length >= 5, `seeded deals present (${seededDeals.length})`);

  // Create deal
  const created = await call('POST', '/api/v1/deals', {
    brand_name: 'Linear', title: 'Changelog Sponsorship', platform: 'Newsletter',
    deal_value: 1200, deadline: '2026-10-30', priority: 'high',
  }, 201);
  assert(created?.data?.id, 'deal created');

  // Validation: negative value rejected
  await call('POST', '/api/v1/deals', { brand_name: 'X', title: 'Y', platform: 'YouTube', deal_value: -5 }, 400);

  // Invalid stage transition rejected
  await call('POST', `/api/v1/deals/${created.data.id}/move`, { status: 'paid' }, 400);
  const moved = await call('POST', `/api/v1/deals/${created.data.id}/move`, { status: 'negotiating' });
  assert(moved?.data?.status === 'negotiating' && moved?.data?.probability === 30, 'stage transition applied with default probability');

  // Health score
  const health = await call('GET', `/api/v1/deals/${created.data.id}/health`);
  assert(health?.data?.score !== undefined && ['Healthy', 'Attention', 'At Risk'].includes(health.data.label), 'health score computed');

  // Timeline + notes
  await call('POST', `/api/v1/deals/${created.data.id}/notes`, { content: 'Sent follow-up email' }, 201);
  const timeline = await call('GET', `/api/v1/deals/${created.data.id}/timeline`);
  assert(Array.isArray(timeline?.data) && timeline.data.length >= 2, 'timeline contains activity + note');

  // Brand + contact + duplicate prevention
  await call('POST', '/api/v1/brands', { name: 'Vercel', industry: 'DevTools' }, 201);
  await call('POST', '/api/v1/contacts', { name: 'Ada Lovelace', email: 'ada@vercel.com', preferred_channel: 'email', status: 'lead' }, 201);
  await call('POST', '/api/v1/contacts', { name: 'Ada 2', email: 'ada@vercel.com', preferred_channel: 'email', status: 'lead' }, 400);

  // Invoice lifecycle
  const invoice = await call('POST', '/api/v1/invoices', {
    deal_id: created.data.id, issue_date: '2026-09-01', due_date: '2026-10-01',
    line_items: [{ description: 'Newsletter sponsorship', amount: 1200 }], tax_rate: 10, discount: 100,
  }, 201);
  assert(invoice?.data?.total_amount === 1210 && invoice?.data?.invoice_number?.startsWith('INV-'), `totals computed server-side (${invoice?.data?.total_amount}, #${invoice?.data?.invoice_number})`);

  // Payment > total rejected
  await call('POST', `/api/v1/invoices/${invoice.data.id}/payments`, { amount: 99999 }, 400);
  // Send then partial payment
  await call('PUT', `/api/v1/invoices/${invoice.data.id}`, { status: 'sent' });
  const pay = await call('POST', `/api/v1/invoices/${invoice.data.id}/payments`, { amount: 500, method: 'paypal' }, 201);
  assert(pay?.data?.invoice?.status === 'partially_paid' && pay?.data?.invoice?.amount_paid === 500, 'partial payment updates invoice');
  const pay2 = await call('POST', `/api/v1/invoices/${invoice.data.id}/payments`, { amount: 710, method: 'paypal' }, 201);
  assert(pay2?.data?.invoice?.status === 'paid', 'full payment flips invoice to paid');
  const dealAfterPay = await call('GET', `/api/v1/deals/${created.data.id}`);
  assert(dealAfterPay?.data?.status === 'paid', 'deal auto-moved to paid after invoice settled');

  // Tasks
  const task = await call('POST', '/api/v1/tasks', { title: 'Prepare proposal', due_date: '2026-09-30', deal_id: created.data.id }, 201);
  await call('POST', `/api/v1/tasks/${task.data.id}/status`, { status: 'completed' });
  await call('POST', '/api/v1/tasks', { title: '', due_date: '2026-09-30' }, 400);

  // Search
  const search = await call('GET', '/api/v1/search?q=Notion');
  assert(search?.data?.brands?.length >= 1 || search?.data?.deals?.length >= 1, 'global search returns categorized results');

  // Stats + revenue + forecast
  const overview = await call('GET', '/api/v1/stats/overview');
  assert(typeof overview?.data?.totalEarned === 'number' && overview.data.totalEarned > 0, `overview revenue (${overview?.data?.totalEarned})`);
  const revenue = await call('GET', '/api/v1/stats/revenue');
  assert(Array.isArray(revenue?.data?.monthly), 'revenue analytics monthly series');
  const forecast = await call('GET', '/api/v1/stats/forecast');
  assert(forecast?.data?.estimate_only === true, 'forecast marked as estimate');

  // Notifications
  const notifs = await call('GET', '/api/v1/notifications');
  assert(notifs?.data?.length >= 1, 'payment notification created');

  // Templates + communications
  await call('POST', '/api/v1/templates', { name: 'Test T', category: 'outreach', body: 'Hi {{brand}}' }, 201);
  const comm = await call('POST', '/api/v1/communications', { channel: 'call', summary: 'Intro call with Ada', deal_id: created.data.id }, 201);
  assert(comm?.data?.id, 'communication logged');

  // Preferences
  await call('PUT', '/api/v1/preferences', { theme: 'dark', currency: 'EUR', density: 'compact' });
  const prefs = await call('GET', '/api/v1/preferences');
  assert(prefs?.data?.currency === 'EUR', 'preferences persisted');

  // CSV export + import preview/commit
  const csvRes = await fetch(`${BASE}/api/v1/workspace/export/contacts`, { headers: { Authorization: `Bearer ${token}` } });
  const csv = await csvRes.text();
  assert(csv.toLowerCase().includes('name') && csv.toLowerCase().includes('email'), 'CSV export');
  const preview = await call('POST', '/api/v1/workspace/import/preview', {
    entity: 'contacts',
    csv: 'name,email,company,preferred_channel,status\nGrace Hopper,grace@navy.mil,US Navy,email,lead\n,missing-name,Dup Co,email,lead\nAda Lovelace,ada@vercel.com,Vercel,email,lead\n',
  });
  assert(preview?.data?.valid === 1 && preview?.data?.invalid?.length === 1 && preview?.data?.duplicates?.length === 1, `import preview valid=${preview?.data?.valid} invalid=${preview?.data?.invalid?.length} dupes=${preview?.data?.duplicates?.length}`);
  const committed = await call('POST', '/api/v1/workspace/import/commit', { entity: 'contacts', validated_rows: preview.data.validated_rows });
  assert(committed?.data?.inserted === 1, 'transactional import committed');

  // Workspace backup export + restore (merge)
  const backup = await call('GET', '/api/v1/workspace/export');
  assert(backup?.data?.data?.deals?.length >= 5, 'backup export includes deals');
  const restore = await call('POST', '/api/v1/workspace/restore', {
    mode: 'merge',
    data: { contacts: [{ name: 'Backup Contact', email: 'backup@example.com', status: 'lead' }] },
  });
  assert(restore?.data?.summary?.restored?.contacts === 1, 'restore merged 1 contact');

  // Logout invalidates token
  await call('POST', '/api/v1/auth/logout', {});
  await call('GET', '/api/v1/deals', undefined, 401);

  console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => { console.error('SMOKE CRASH', err); process.exit(1); });
