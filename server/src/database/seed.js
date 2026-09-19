/**
 * Seed service — realistic demo workspace for evaluation plus clean starter
 * data for new registrations. Passwords are hashed with bcrypt; secrets are
 * never logged. Safe to run repeatedly (idempotent per user).
 */
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { run, get } = require('../database/db');

const DEMO_EMAIL = 'demo@collabio.app';
const DEMO_PASSWORD = 'demo-password-2026';

const d = (offset) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().slice(0, 10);
};

/** Default preferences row for a fresh user. */
async function ensurePreferences(userId) {
  const existing = await get('SELECT user_id FROM user_preferences WHERE user_id = ?', [userId]);
  if (!existing) {
    await run('INSERT INTO user_preferences (user_id, timezone, followup_rules) VALUES (?, ?, ?)', [
      userId,
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      JSON.stringify({ enabled: true, days: [3, 7, 14] }),
    ]);
  }
  const settings = await get('SELECT user_id FROM user_settings WHERE user_id = ?', [userId]);
  if (!settings) {
    await run('INSERT INTO user_settings (user_id) VALUES (?)', [userId]);
  }
}

/** Clean starter records for a brand-new signup (not "test/abc/123" junk). */
async function seedStarterData(userId) {
  await ensurePreferences(userId);
  const b = await run(
    'INSERT INTO brands (user_id, name, industry, contact_name, contact_email, relationship_status, logo_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, 'Your First Brand', 'Software & SaaS', null, null, 'prospect', '🏢']
  );
  await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, payment_terms, deadline, priority, probability)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, b.lastID, 'Your First Brand', 'Intro Call — Scope Sponsorship', 'YouTube', 'outreach', 500, 'net-30', d(14), 'medium', 10]
  );
  await run(
    `INSERT INTO tasks (user_id, title, description, due_date, priority, deal_id, brand_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, 'Draft outreach email to Your First Brand', 'Introduce your channel, audience stats and a rate-card link.', d(3), 'high', null, b.lastID, 'todo']
  );
}

/** Full demo workspace: 6 brands, 8 deals, invoices with payments, tasks, etc. */
async function seedDemoUserIfMissing() {
  const existing = await get('SELECT id FROM users WHERE email = ?', [DEMO_EMAIL]);
  if (existing) return existing.id;

  const password_hash = bcrypt.hashSync(DEMO_PASSWORD, env.bcryptRounds);
  const userRes = await run(
    'INSERT INTO users (username, email, password_hash, display_name, avatar_emoji) VALUES (?, ?, ?, ?, ?)',
    ['demo_creator', DEMO_EMAIL, password_hash, 'Alex Rivera', '🎬']
  );
  const userId = userRes.lastID;

  await run(
    `INSERT INTO user_settings (user_id, linkedin, gmail, instagram, youtube, bio, invoice_business_name, invoice_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, 'https://linkedin.com/in/alexrivera-tech', 'alex.rivera.creations@gmail.com',
      'https://instagram.com/alexrivera.tech', 'https://youtube.com/@AlexRiveraTech',
      'Senior Software Architect & Full-Stack Tech Creator (350K+ audience)',
      'Alex Rivera Media Studio LLC', '742 Evergreen Terrace, Suite 400, Austin, TX 78701']
  );
  await ensurePreferences(userId);

  const brand = async (name, industry, contact_name, contact_email, website, logo, status) =>
    (await run('INSERT INTO brands (user_id, name, industry, contact_name, contact_email, website, logo_emoji, relationship_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, industry, contact_name, contact_email, website, logo, status])).lastID;

  const bNotion = await brand('Notion', 'Productivity & SaaS', 'Sarah Lin', 'sarah.lin@notion.so', 'https://notion.so', '⚡', 'partner');
  const bSony = await brand('Sony Electronics', 'Audio & Creator Tech', 'Marcus Vance', 'm.vance@sony.com', 'https://sony.com', '🎧', 'partner');
  const bEpidemic = await brand('Epidemic Sound', 'Music & Licensing', 'Elena Rostova', 'elena@epidemicsound.com', 'https://epidemicsound.com', '🎵', 'negotiating');
  const bFigma = await brand('Figma', 'Design & UI/UX', 'David Kroll', 'dkroll@figma.com', 'https://figma.com', '🎨', 'contacted');
  const bSkillshare = await brand('Skillshare', 'EdTech', 'Amanda Cruz', 'amanda@skillshare.com', 'https://skillshare.com', '📚', 'prospect');
  const bNord = await brand('NordVPN', 'Cybersecurity', 'Liam Wright', 'liam@nordvpn.com', 'https://nordvpn.com', '🛡️', 'contacted');

  await run(
    `INSERT INTO contacts (user_id, name, company, email, phone, role, platform, source, status, preferred_channel, notes) VALUES
     (?, 'Sarah Lin', 'Notion', 'sarah.lin@notion.so', '+1 (415) 555-0192', 'Creator Partnerships Lead', 'Email', 'Inbound', 'partner', 'email', 'Prefers video draft links via Frame.io'),
     (?, 'Marcus Vance', 'Sony Electronics', 'm.vance@sony.com', '+1 (212) 555-0144', 'Head of Creator Programs', 'LinkedIn', 'Agency Referral', 'partner', 'linkedin', 'Runs the annual creator program for audio gear'),
     (?, 'Elena Rostova', 'Epidemic Sound', 'elena@epidemicsound.com', '+46 8 555 0123', 'Partnership Manager', 'Email', 'Event', 'active', 'email', 'Annual contract, renewed quarterly'),
     (?, 'David Kroll', 'Figma', 'dkroll@figma.com', '+1 (415) 555-8821', 'Developer Advocacy', 'Twitter', 'Outreach', 'active', 'dm', 'Interested in Figma-to-code tutorials')`,
    [userId, userId, userId, userId]
  );

  const deal = async (brandId, brandName, title, platform, status, value, deadlineOffset, priority, probability, deliverable) =>
    (await run(
      `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, payment_terms, deadline, priority, probability, deliverable, position, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [userId, brandId, brandName, title, platform, status, value, 'net-30', d(deadlineOffset), priority, probability, deliverable, userId, userId]
    )).lastID;

  const dNotion = await deal(bNotion, 'Notion', 'Notion for Developers — 4-Video Series', 'YouTube', 'invoiced', 4500, 12, 'high', 95, '4 dedicated videos + newsletter mention');
  const dSony = await deal(bSony, 'Sony Electronics', 'Sony FX30 Dedicated Review', 'YouTube', 'paid', 6000, -25, 'high', 100, 'Dedicated 12-min review video');
  const dEpidemic = await deal(bEpidemic, 'Epidemic Sound', 'Epidemic Sound Annual Integration', 'YouTube', 'contract_sent', 3800, 20, 'medium', 50, '12-month license integration in every upload');
  const dFigma = await deal(bFigma, 'Figma', 'Figma Config 2026 Recap', 'YouTube', 'published', 2500, 5, 'medium', 85, 'Recap video + LinkedIn carousel');
  const dSkill = await deal(bSkillshare, 'Skillshare', 'Course Collaboration Pilot', 'Newsletter', 'negotiating', 1900, 30, 'low', 30, 'Co-branded course module');
  const dNord1 = await deal(bNord, 'NordVPN', 'NordVPN Mid-roll Bundle (3 videos)', 'YouTube', 'active', 2700, 18, 'medium', 70, '3× 60s mid-roll integrations');
  await deal(bNotion, 'Notion', 'Notion Template Affiliate Push', 'Twitter', 'outreach', 800, 40, 'low', 10, 'Affiliate thread series');
  await deal(bFigma, 'Figma', 'Q3 Developer Tutorial Series', 'Blog', 'archived', 1200, -60, 'low', 0, 'Written tutorial series');

  // Invoices: one fully paid (with payments), one sent
  const inv1 = await run(
    `INSERT INTO invoices (user_id, deal_id, invoice_number, status, issue_date, due_date, line_items, subtotal, tax_rate, discount, total_amount, amount_paid, currency, sent_at, paid_at, notes)
     VALUES (?, ?, 'INV-2026-001', 'paid', ?, ?, ?, 6000, 0, 0, 6000, 6000, 'USD', ?, ?, 'Thanks for partnering with Alex Rivera Media Studio!')`,
    [userId, dSony, d(-25), d(5), JSON.stringify([{ description: 'Dedicated YouTube Video — Sony FX30 Review', amount: 6000 }]), d(-25), d(-5)]
  );
  await run(
    `INSERT INTO payments (user_id, invoice_id, amount, currency, method, reference, paid_at, notes)
     VALUES (?, ?, 6000, 'USD', 'bank_transfer', 'WIRE-88213-SNY', ?, 'Full payment received via ACH wire')`,
    [userId, inv1.lastID, d(-5)]
  );
  await run(
    `INSERT INTO invoices (user_id, deal_id, invoice_number, status, issue_date, due_date, line_items, subtotal, tax_rate, discount, total_amount, currency, sent_at, notes)
     VALUES (?, ?, 'INV-2026-002', 'sent', ?, ?, ?, 4500, 0, 200, 4300, 'USD', ?, 'Net-30 · ACH details in signature.')`,
    [userId, dNotion, d(-7), d(23), JSON.stringify([
      { description: 'Notion for Developers — 4-Video Series', amount: 4000 },
      { description: 'Newsletter mention bundle', amount: 500 },
    ]), d(-7)]
  );

  await run(
    `INSERT INTO tasks (user_id, deal_id, brand_id, title, description, due_date, priority, status) VALUES
     (?, ?, ?, 'Upload FX30 review video', 'Final cut due to Sony program manager.', ?, 'high', 'completed'),
     (?, ?, ?, 'Send INV-2026-002 reminder', 'Polite reminder if unpaid 3 days before due date.', ?, 'medium', 'todo'),
     (?, ?, ?, 'Collect Epidemic Sound contract signature', 'Contract sent — follow up with Elena.', ?, 'high', 'in_progress'),
     (?, ?, ?, 'Update 2026 media kit PDF', 'Add Q2 analytics and case studies.', ?, 'low', 'todo')`,
    [userId, dSony, bSony, d(-28), userId, dNotion, bNotion, d(10), userId, dEpidemic, bEpidemic, d(6), userId]
  );

  await run(
    `INSERT INTO communications (user_id, contact_id, brand_id, deal_id, channel, direction, summary, occurred_at) VALUES
     (?, ?, ?, ?, 'call', 'inbound', 'Sarah confirmed the 4-video scope and budget envelope.', ?),
     (?, ?, ?, ?, 'email', 'outbound', 'Sent Sony FX30 review draft v2 for approval.', ?),
     (?, ?, ?, ?, 'meeting', 'inbound', 'Quarterly renewal call with Elena — pricing agreed in principle.', ?),
     (?, ?, ?, ?, 'linkedin', 'outbound', 'Connection request + intro message to David re: Config recap.', ?)`,
    [userId, userId, bNotion, dNotion, d(-9), userId, userId, bSony, dSony, d(-20), userId, userId, bEpidemic, dEpidemic, d(-12), userId, userId, bFigma, dFigma, d(-4)]
  );

  await run(
    `INSERT INTO templates (user_id, name, category, subject, body) VALUES
     (?, 'Cold Outreach — First Touch', 'outreach', 'Partnership idea for {{brand}}',
      'Hi {{contact}},\n\nI run a developer-focused channel (350K+ subscribers) and have a campaign idea for {{brand}}: {{campaign}}.\n\nRelevant deliverables: {{deliverables}} at {{price}}, delivered by {{deadline}}.\n\nHappy to share audience analytics — would next Tuesday work for a quick call?'),
     (?, 'Payment Reminder — Net 30', 'payment_reminder', 'Invoice {{invoice}} — friendly reminder',
      'Hi {{contact}},\n\nJust a friendly reminder that invoice {{invoice}} ({{price}}) was due on {{deadline}}.\n\nIf payment has already been sent, please ignore this note. Otherwise, happy to resend details.'),
     (?, 'Proposal — Full Package', 'proposal', 'Proposal: {{brand}} × {{campaign}}',
      'Overview\n=======\n{{brand}} and I will collaborate on {{campaign}}.\n\nDeliverables\n=======\n{{deliverables}}\n\nInvestment\n=======\n{{price}} — payment terms net-30.\n\nTimeline\n=======\nDelivery by {{deadline}}.')`,
    [userId, userId, userId]
  );

  await run(
    `INSERT INTO quick_notes (user_id, title, content, color, is_pinned) VALUES
     (?, 'Sponsorship Rate Card 2026', 'Dedicated Video: $4,500\n60s Integrated Mid-roll: $2,200\nX Thread: $1,500\nNewsletter Banner: $900\nBundle Discount: 15% off for 3+ placements', 'purple', 1),
     (?, 'Brand Pitch Best Practices', '1. Always mention 68% audience retention.\n2. Provide 3 high-converting past video samples.\n3. Request 50% upfront for new brand relationships.', 'blue', 0)`,
    [userId, userId]
  );

  await run(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_label, created_at) VALUES
     (?, 'auth.login', 'auth', 'Demo seed login', datetime('now', '-1 day')),
     (?, 'deal.created', 'deal', 'Sony FX30 Dedicated Review', datetime('now', '-40 days')),
     (?, 'invoice.payment_recorded', 'invoice', 'INV-2026-001', datetime('now', '-5 days'))`,
    [userId, userId, userId]
  );

  console.log(`✅ Demo workspace seeded (${DEMO_EMAIL} / ${DEMO_PASSWORD})`);
  return userId;
}

module.exports = { seedDemoUserIfMissing, seedStarterData, ensurePreferences, DEMO_EMAIL, DEMO_PASSWORD };

