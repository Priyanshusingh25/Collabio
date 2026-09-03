const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'collabio.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('DB open error:', err);
  else console.log('✅ Database opened at:', DB_PATH);
});

// Promisify helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function seedDemoUserIfMissing() {
  const demoEmail = 'demo@collabio.app';
  const existing = await get('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (existing) {
    return existing.id;
  }

  console.log('🌱 Seeding rich demo creator data for demo@collabio.app...');
  const password_hash = bcrypt.hashSync('creator123', 10);
  const userRes = await run(
    `INSERT INTO users (username, email, password_hash, display_name, avatar_emoji)
     VALUES (?, ?, ?, ?, ?)`,
    ['demo_creator', demoEmail, password_hash, 'Alex Rivera', '🎬']
  );
  const userId = userRes.lastID;

  // Settings
  await run(
    `INSERT INTO user_settings (user_id, linkedin, gmail, instagram, github, youtube, bio, invoice_business_name, invoice_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      'https://linkedin.com/in/alexrivera-tech',
      'alex.rivera.creations@gmail.com',
      'https://instagram.com/alexrivera.tech',
      'https://github.com/alexrivera-dev',
      'https://youtube.com/@AlexRiveraTech',
      'Senior Software Architect & Full-Stack Tech Creator (350K+ Audience)',
      'Alex Rivera Media Studio LLC',
      '742 Evergreen Terrace, Suite 400, Austin, TX 78701'
    ]
  );

  // Brands
  const bNotion = await run('INSERT INTO brands (user_id, name, industry, contact_name, contact_email, website, logo_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, 'Notion', 'Productivity & SaaS', 'Sarah Lin', 'sarah.lin@notion.so', 'https://notion.so', '⚡']);
  const bSony = await run('INSERT INTO brands (user_id, name, industry, contact_name, contact_email, website, logo_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, 'Sony Electronics', 'Audio & Creator Tech', 'Marcus Vance', 'm.vance@sony.com', 'https://sony.com', '🎧']);
  const bEpidemic = await run('INSERT INTO brands (user_id, name, industry, contact_name, contact_email, website, logo_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, 'Epidemic Sound', 'Music & Licensing', 'Elena Rostova', 'elena@epidemicsound.com', 'https://epidemicsound.com', '🎵']);
  const bFigma = await run('INSERT INTO brands (user_id, name, industry, contact_name, contact_email, website, logo_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, 'Figma', 'Design & UI/UX', 'David Kroll', 'dkroll@figma.com', 'https://figma.com', '🎨']);
  const bSkillshare = await run('INSERT INTO brands (user_id, name, industry, contact_name, contact_email, website, logo_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, 'Skillshare', 'EdTech & Learning', 'Amanda Cruz', 'amanda@skillshare.com', 'https://skillshare.com', '📚']);
  const bNord = await run('INSERT INTO brands (user_id, name, industry, contact_name, contact_email, website, logo_emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, 'NordVPN', 'Cybersecurity', 'Liam Wright', 'liam@nordvpn.com', 'https://nordvpn.com', '🛡️']);

  // Contacts
  await run(
    `INSERT INTO contacts (user_id, name, company, email, phone, platform, source, status, notes) VALUES
     (?, 'Sarah Lin', 'Notion', 'sarah.lin@notion.so', '+1 (415) 555-0192', 'Email', 'Inbound', 'active', 'Prefers video draft links via Frame.io'),
     (?, 'Marcus Vance', 'Sony Electronics', 'm.vance@sony.com', '+1 (212) 555-0144', 'LinkedIn', 'Agency Referral', 'partner', 'Manages annual creator program for audio gear'),
     (?, 'Elena Rostova', 'Epidemic Sound', 'elena@epidemicsound.com', '+46 8 555 0123', 'Email', 'Event', 'active', 'Annual contract renewed quarterly'),
     (?, 'David Kroll', 'Figma', 'dkroll@figma.com', '+1 (415) 555-8821', 'Twitter', 'Outreach', 'active', 'Interested in Figma to Code tutorials')`,
    [userId, userId, userId, userId]
  );

  // Helper date offset
  const d = (offsetDays) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + offsetDays);
    return dt.toISOString().split('T')[0];
  };

  // Deals across stages
  const d1 = await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency, payment_terms, deliverable, deadline, priority, contact_name, contact_email, position)
     VALUES (?, ?, 'Notion', 'Notion AI 2.0 Productivity Workflow', 'YouTube', 'outreach', 4500, 'USD', 'net-30', 'Dedicated 10-minute video + template share', ?, 'medium', 'Sarah Lin', 'sarah.lin@notion.so', 0)`,
    [userId, bNotion.lastID, d(18)]
  );

  const d2 = await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency, payment_terms, deliverable, deadline, priority, contact_name, contact_email, position)
     VALUES (?, ?, 'Sony Electronics', 'WH-1000XM6 Headphones Studio Deep Dive', 'YouTube', 'negotiating', 7500, 'USD', 'net-30', '60s Integrated Mid-roll + Instagram Reel', ?, 'high', 'Marcus Vance', 'm.vance@sony.com', 0)`,
    [userId, bSony.lastID, d(12)]
  );

  const d3 = await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency, payment_terms, deliverable, deadline, priority, contact_name, contact_email, position)
     VALUES (?, ?, 'Figma', 'Figma to Code Interactive Workshop', 'YouTube', 'contract_sent', 3200, 'USD', 'net-15', 'Full walkthrough + X/Twitter breakdown thread', ?, 'high', 'David Kroll', 'dkroll@figma.com', 0)`,
    [userId, bFigma.lastID, d(9)]
  );

  const d4 = await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency, payment_terms, deliverable, deadline, priority, contact_name, contact_email, position)
     VALUES (?, ?, 'Epidemic Sound', 'Creator Soundtracks Integration Q3', 'YouTube', 'in_progress', 5000, 'USD', 'net-30', '90s Dedicated segment + affiliate pin', ?, 'medium', 'Elena Rostova', 'elena@epidemicsound.com', 0)`,
    [userId, bEpidemic.lastID, d(6)]
  );

  const d5 = await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency, payment_terms, deliverable, deadline, priority, contact_name, contact_email, position)
     VALUES (?, ?, 'Skillshare', 'Full-Stack Web Dev Masterclass Promo', 'YouTube', 'in_review', 2800, 'USD', 'net-30', 'Dedicated intro + pinned link', ?, 'low', 'Amanda Cruz', 'amanda@skillshare.com', 0)`,
    [userId, bSkillshare.lastID, d(3)]
  );

  const d6 = await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency, payment_terms, deliverable, deadline, priority, contact_name, contact_email, position)
     VALUES (?, ?, 'NordVPN', 'Cybersecurity Best Practices for Developers', 'YouTube', 'published', 3500, 'USD', 'net-30', '60s Mid-roll integration', ?, 'high', 'Liam Wright', 'liam@nordvpn.com', 0)`,
    [userId, bNord.lastID, d(-2)]
  );

  const d7 = await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency, payment_terms, deliverable, deadline, priority, contact_name, contact_email, position)
     VALUES (?, ?, 'Figma', 'Config 2026 Developer Edition Recap', 'YouTube', 'invoiced', 2500, 'USD', 'net-30', 'Video sponsorship + LinkedIn carousel', ?, 'medium', 'David Kroll', 'dkroll@figma.com', 0)`,
    [userId, bFigma.lastID, d(-7)]
  );

  const d8 = await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency, payment_terms, deliverable, deadline, priority, contact_name, contact_email, paid_at, position)
     VALUES (?, ?, 'Sony Electronics', 'Sony FX30 Cinema Camera Creator Setup', 'YouTube', 'paid', 6000, 'USD', 'net-30', 'Full dedicated showcase', ?, 'high', 'Marcus Vance', 'm.vance@sony.com', ?, 0)`,
    [userId, bSony.lastID, d(-20), d(-5)]
  );

  // Deal Notes
  await run(
    `INSERT INTO deal_notes (deal_id, user_id, content) VALUES
     (?, ?, 'Agency approved script draft with minor wording tweak on active noise cancellation.'),
     (?, ?, 'DocuSign link signed by talent team, awaiting final counter-signature from Figma legal.')`,
    [d2.lastID, userId, d3.lastID, userId]
  );

  // Services
  await run(
    `INSERT INTO services (user_id, name, category, rate, rate_type, platforms, description, status) VALUES
     (?, 'Dedicated YouTube Video', 'Video', 4500, 'flat', 'YouTube', 'Full dedicated 8-12 min technical tutorial or review with affiliate link & pinned comment', 'active'),
     (?, '60s Integrated Sponsorship', 'Video', 2200, 'flat', 'YouTube, TikTok', 'Seamless organic mid-roll brand placement within high-retention tutorial', 'active'),
     (?, 'Technical X/Twitter Thread + Newsletter', 'Social', 1500, 'flat', 'Twitter, Newsletter', 'Multi-tweet breakdown with visuals sent to 45k weekly newsletter subscribers', 'active'),
     (?, 'Instagram Reel + Story Set', 'Short-form', 1800, 'flat', 'Instagram', 'Vertical 9:16 high-production showcase testing product in real developer setup', 'active')`,
    [userId, userId, userId, userId]
  );

  // Invoices
  const sampleItems1 = JSON.stringify([
    { description: 'Dedicated YouTube Video Integration (Sony FX30)', amount: 6000 }
  ]);
  const sampleItems2 = JSON.stringify([
    { description: 'Figma Config 2026 Developer Recap Video', amount: 2000 },
    { description: 'LinkedIn Visual Carousel Post', amount: 500 }
  ]);

  await run(
    `INSERT INTO invoices (user_id, deal_id, invoice_number, status, issue_date, due_date, line_items, total_amount, currency, notes) VALUES
     (?, ?, 'INV-2026-001', 'paid', ?, ?, ?, 6000, 'USD', 'Thank you for partnering with Alex Rivera Media Studio!'),
     (?, ?, 'INV-2026-002', 'sent', ?, ?, ?, 2500, 'USD', 'Payment due within 30 days via ACH wire transfer.')`,
    [userId, d8.lastID, d(-25), d(-5), sampleItems1, userId, d7.lastID, d(-7), d(23), sampleItems2]
  );

  // Quick Notes
  await run(
    `INSERT INTO quick_notes (user_id, title, content, color, is_pinned) VALUES
     (?, 'Sponsorship Rate Card 2026', 'Dedicated Video: $4,500\n60s Integrated Mid-roll: $2,200\nX Thread: $1,500\nNewsletter Banner: $900\nBundle Discount: 15% off for 3+ placements', 'purple', 1),
     (?, 'Brand Pitch Best Practices', '1. Always mention 68% audience retention.\n2. Provide 3 high-converting past video samples.\n3. Request 50% upfront for new brand relationships.', 'blue', 0),
     (?, 'Media Kit Links & Deliverables', 'High-res headshots, analytics deck PDF, and past CTR case studies are hosted on Google Drive / Notion press kit.', 'green', 0)`,
    [userId, userId, userId]
  );

  console.log('✅ Demo account seeded successfully (demo@collabio.app / creator123)');
  return userId;
}

async function initializeDatabase() {
  await run('PRAGMA foreign_keys = ON');
  await run('PRAGMA journal_mode = WAL');

  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    avatar_emoji TEXT DEFAULT '🎬',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    industry TEXT,
    contact_name TEXT,
    contact_email TEXT,
    website TEXT,
    notes TEXT,
    logo_emoji TEXT DEFAULT '🏢',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    brand_id INTEGER,
    brand_name TEXT NOT NULL,
    title TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'outreach',
    deal_value REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    payment_terms TEXT DEFAULT 'net-30',
    deliverable TEXT,
    deadline TEXT,
    publish_date TEXT,
    notes TEXT,
    priority TEXT DEFAULT 'medium',
    contact_name TEXT,
    contact_email TEXT,
    contract_url TEXT,
    invoice_number TEXT,
    paid_at TEXT,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS deal_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    remind_at TEXT NOT NULL,
    is_done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    rate REAL,
    rate_type TEXT,
    platforms TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    platform TEXT,
    source TEXT,
    status TEXT DEFAULT 'lead',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    deal_id INTEGER,
    contact_id INTEGER,
    invoice_number TEXT,
    status TEXT DEFAULT 'draft',
    issue_date TEXT,
    due_date TEXT,
    line_items TEXT,
    total_amount REAL,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS quick_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    content TEXT,
    color TEXT DEFAULT 'blue',
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    linkedin TEXT,
    gmail TEXT,
    instagram TEXT,
    github TEXT,
    youtube TEXT,
    bio TEXT,
    invoice_business_name TEXT,
    invoice_address TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Ensure default demo user exists for immediate evaluation
  await seedDemoUserIfMissing();

  console.log('✅ All tables and initial seed data ready');
}

module.exports = { db, run, get, all, initializeDatabase, seedDemoUserIfMissing };
