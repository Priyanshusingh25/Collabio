/**
 * Zod validation schemas — the single source of truth for API contracts.
 * The same shapes are mirrored on the client for instant form feedback.
 */
const { z } = require('zod');

// ---------- primitives ----------
const idParam = z.coerce.number().int().positive();
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date (YYYY-MM-DD)')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');
const optionalDate = dateString.nullish().or(z.literal('').transform(() => null));
const money = z.coerce.number().min(0, 'Amount cannot be negative').max(100_000_000, 'Amount is unreasonably large');
const percent = z.coerce.number().min(0, 'Cannot be negative').max(100, 'Cannot exceed 100');
const platformEnum = z.enum([
  'YouTube', 'Instagram', 'TikTok', 'Twitter', 'Newsletter', 'Podcast', 'LinkedIn', 'Blog', 'Twitch',
]);
const priorityEnum = z.enum(['high', 'medium', 'low']);
const currencyEnum = z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']);

const DEAL_STATUSES = ['outreach', 'negotiating', 'contract_sent', 'active', 'in_review', 'published', 'invoiced', 'paid', 'archived'];
const dealStatusEnum = z.enum(DEAL_STATUSES);

/** Allowed forward transitions; backwards transitions skip "published/invoiced" gates. */
const STAGE_FLOW = {
  outreach: ['negotiating', 'archived'],
  negotiating: ['contract_sent', 'outreach', 'archived'],
  contract_sent: ['active', 'negotiating', 'archived'],
  active: ['in_review', 'contract_sent', 'archived'],
  in_review: ['published', 'active', 'archived'],
  published: ['invoiced', 'in_review', 'archived'],
  invoiced: ['paid', 'archived'],
  paid: ['archived'],
  archived: ['outreach'],
};

const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(20).optional();

/**
 * Security: `z.string().url()` accepts dangerous schemes such as
 * `javascript:alert(1)` and `data:text/html,...`. Every URL that can end up
 * inside an href/src in the client must be restricted to http(s).
 */
const HTTP_URL_RE = /^https?:\/\/[^\s]+$/i;
function safeUrl(label = 'Must be a valid http(s) URL') {
  return z
    .string()
    .trim()
    .max(500, 'URL is too long')
    .refine((value) => {
      if (!HTTP_URL_RE.test(value)) return false;
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }, label);
}
/** http(s)-only URL that may be omitted, null or an empty string. */
const optionalUrl = (label) => safeUrl(label).nullish().or(z.literal('').transform(() => null));

const lineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(300),
  amount: money,
  quantity: z.coerce.number().int().min(1).max(1000).optional(),
});

// ---------- auth ----------
const registerSchema = z.object({
  username: z.string().trim().min(3, 'At least 3 characters').max(30).regex(/^[a-zA-Z0-9_.-]+$/, 'Letters, numbers, _ . - only'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Za-z]/, 'Must contain a letter')
    .regex(/[0-9]/, 'Must contain a number'),
  display_name: z.string().trim().max(60).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Za-z]/, 'Must contain a letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(60).optional(),
  avatar_emoji: z.string().trim().max(8).optional(),
});

// ---------- deals ----------
const dealBare = z.object({
  brand_id: z.coerce.number().int().positive().nullish(),
  brand_name: z.string().trim().min(1, 'Brand name is required').max(120),
  title: z.string().trim().min(1, 'Title is required').max(200),
  platform: platformEnum,
  status: dealStatusEnum,
  deal_value: money,
  currency: currencyEnum,
  payment_terms: z.string().trim().max(40),
  deliverable: z.string().trim().max(500).nullish(),
  deadline: optionalDate,
  publish_date: optionalDate,
  notes: z.string().max(5000).nullish(),
  priority: priorityEnum,
  contact_name: z.string().trim().max(120).nullish(),
  contact_email: z.string().trim().toLowerCase().email('Invalid email').nullish().or(z.literal('').transform(() => null)),
  contract_url: optionalUrl('Must be a valid http(s) URL'),
  probability: z.coerce.number().int().min(0).max(100).nullish(),
  tags: tagsSchema,
});

// NOTE: defaults live ONLY on the create schema. Update schemas are built from
// the bare shape so a partial update never silently resets omitted fields.
const dealCreateSchema = dealBare.extend({
  status: dealStatusEnum.default('outreach'),
  deal_value: money.default(0),
  currency: currencyEnum.default('USD'),
  payment_terms: z.string().trim().max(40).default('net-30'),
  priority: priorityEnum.default('medium'),
});

// Kanban ordering uses the dedicated /move endpoint; `position` is therefore
// optional here so a plain partial edit (title, value, deadline…) never fails.
const dealUpdateSchema = dealBare.partial().extend({
  position: z.coerce.number().int().min(0).max(100000).optional(),
});

const dealMoveSchema = z.object({
  status: dealStatusEnum,
  position: z.coerce.number().int().min(0).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  status: z.string().trim().max(40).optional(),
  platform: platformEnum.optional(),
  priority: priorityEnum.optional(),
  search: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(40).optional(),
  sort: z.enum(['created_at', 'deadline', 'deal_value', 'title', 'updated_at']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  from: optionalDate,
  to: optionalDate,
});

/* __EXPORTS__ */

// ---------- brands ----------
const socialsSchema = z
  .object({
    linkedin: optionalUrl('Must be a valid http(s) URL'),
    instagram: z.string().trim().max(80).nullish(),
    twitter: z.string().trim().max(80).nullish(),
    youtube: z.string().trim().max(200).nullish(),
  })
  .partial();

const brandSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  company: z.string().trim().max(120).nullish(),
  industry: z.string().trim().max(120).nullish(),
  location: z.string().trim().max(120).nullish(),
  contact_name: z.string().trim().max(120).nullish(),
  contact_email: z.string().trim().toLowerCase().email('Invalid email').nullish().or(z.literal('').transform(() => null)),
  website: optionalUrl('Must be a valid http(s) URL'),
  relationship_status: z.enum(['prospect', 'contacted', 'negotiating', 'partner', 'past', 'blacklisted']).default('prospect'),
  notes: z.string().max(5000).nullish(),
  logo_emoji: z.string().trim().max(8).optional(),
  tags: tagsSchema,
  socials: socialsSchema.optional(),
  last_contact_at: optionalDate,
});

// ---------- contacts ----------
const contactBare = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  company: z.string().trim().max(120).nullish(),
  email: z.string().trim().toLowerCase().email('Invalid email').nullish().or(z.literal('').transform(() => null)),
  phone: z.string().trim().max(40).nullish(),
  role: z.string().trim().max(120).nullish(),
  linkedin: optionalUrl('Must be a valid http(s) URL'),
  instagram: z.string().trim().max(80).nullish(),
  preferred_channel: z.enum(['email', 'phone', 'dm', 'whatsapp', 'linkedin', 'other']),
  platform: z.string().trim().max(40).nullish(),
  source: z.string().trim().max(120).nullish(),
  status: z.enum(['lead', 'active', 'partner', 'past', 'unreachable']),
  notes: z.string().max(5000).nullish(),
  tags: tagsSchema,
});

const contactSchema = contactBare.extend({
  preferred_channel: z.enum(['email', 'phone', 'dm', 'whatsapp', 'linkedin', 'other']).default('email'),
  status: z.enum(['lead', 'active', 'partner', 'past', 'unreachable']).default('lead'),
});

// ---------- services ----------
const serviceBare = z.object({
  name: z.string().trim().min(1, 'Name is required').max(140),
  category: z.string().trim().max(80).nullish(),
  rate: money,
  rate_type: z.enum(['flat', 'per_video', 'per_post', 'hourly', 'cpm']),
  platforms: z.string().trim().max(200).nullish(),
  description: z.string().max(2000).nullish(),
  status: z.enum(['active', 'inactive']),
  turnaround_days: z.coerce.number().int().min(1).max(365),
  deliverables: z.array(z.string().trim().max(200)).max(20),
  revisions: z.coerce.number().int().min(0).max(20),
});

const serviceSchema = serviceBare.extend({
  rate_type: z.enum(['flat', 'per_video', 'per_post', 'hourly', 'cpm']).default('flat'),
  status: z.enum(['active', 'inactive']).default('active'),
});

// ---------- notes ----------
const noteSchema = z.object({
  title: z.string().trim().max(140).nullish(),
  content: z.string().min(1, 'Content is required').max(10000),
  color: z.enum(['blue', 'purple', 'green', 'orange', 'pink']).default('blue'),
  is_pinned: z.coerce.boolean().optional(),
});

module.exports.brandSchema = brandSchema;
module.exports.contactSchema = contactSchema;
module.exports.serviceSchema = serviceSchema;
module.exports.noteSchema = noteSchema;

// ---------- invoices ----------
const INVOICE_STATUSES = ['draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled'];
const invoiceStatusEnum = z.enum(INVOICE_STATUSES);
const invoiceBare = z.object({
  deal_id: z.coerce.number().int().positive().nullish(),
  contact_id: z.coerce.number().int().positive().nullish(),
  invoice_number: z.string().trim().max(40).nullish(),
  status: invoiceStatusEnum,
  issue_date: optionalDate,
  due_date: optionalDate,
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required').max(50),
  tax_rate: percent,
  discount: money,
  currency: currencyEnum,
  notes: z.string().max(2000).nullish(),
});

const invoiceCreateSchema = invoiceBare.extend({
  status: invoiceStatusEnum.default('draft'),
  tax_rate: percent.default(0),
  discount: money.default(0),
  currency: currencyEnum.default('USD'),
});

const invoiceUpdateSchema = invoiceBare.partial();

const paymentSchema = z.object({
  amount: money.refine((v) => v > 0, 'Payment amount must be greater than zero'),
  method: z.enum(['bank_transfer', 'paypal', 'stripe', 'wise', 'crypto', 'cash', 'other']).default('bank_transfer'),
  reference: z.string().trim().max(120).nullish(),
  paid_at: optionalDate,
  notes: z.string().max(1000).nullish(),
});

// ---------- tasks ----------
const taskBare = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(5000).nullish(),
  due_date: optionalDate,
  priority: priorityEnum,
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']),
  deal_id: z.coerce.number().int().positive().nullish(),
  brand_id: z.coerce.number().int().positive().nullish(),
  contact_id: z.coerce.number().int().positive().nullish(),
  assignee: z.string().trim().max(120).nullish(),
  reminder_at: z.string().trim().max(40).nullish(),
  tags: tagsSchema,
});

const taskSchema = taskBare.extend({
  priority: priorityEnum.default('medium'),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).default('todo'),
});

// ---------- communications ----------
const communicationSchema = z.object({
  channel: z.enum(['email', 'call', 'meeting', 'dm', 'whatsapp', 'linkedin', 'other']),
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
  summary: z.string().trim().min(1, 'Summary is required').max(2000),
  occurred_at: optionalDate,
  contact_id: z.coerce.number().int().positive().nullish(),
  brand_id: z.coerce.number().int().positive().nullish(),
  deal_id: z.coerce.number().int().positive().nullish(),
});

// ---------- templates ----------
const templateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(140),
  category: z.enum(['outreach', 'follow_up', 'negotiation', 'proposal', 'invoice_note', 'payment_reminder']).default('outreach'),
  subject: z.string().trim().max(200).nullish(),
  body: z.string().trim().min(1, 'Body is required').max(20000),
});

// ---------- preferences ----------
const preferencesSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  currency: currencyEnum.optional(),
  timezone: z.string().trim().max(64).optional(),
  date_format: z.enum(['us', 'eu', 'iso']).optional(),
  density: z.enum(['compact', 'comfortable']).optional(),
  dashboard_layout: z.array(z.string().max(40)).max(20).optional(),
  default_pipeline_view: z.enum(['kanban', 'table']).optional(),
  notification_prefs: z
    .object({
      deal: z.boolean().optional(),
      invoice: z.boolean().optional(),
      payment: z.boolean().optional(),
      task: z.boolean().optional(),
      deadline: z.boolean().optional(),
      follow_up: z.boolean().optional(),
      system: z.boolean().optional(),
    })
    .optional(),
  followup_rules: z
    .object({
      enabled: z.boolean().optional(),
      days: z.array(z.coerce.number().int().min(1).max(90)).max(5).optional(),
    })
    .optional(),
});

// ---------- workspace ----------
const restoreSchema = z.object({
  mode: z.enum(['merge', 'replace']).default('merge'),
  data: z.object({
    deals: z.array(z.record(z.any())).optional(),
    brands: z.array(z.record(z.any())).optional(),
    contacts: z.array(z.record(z.any())).optional(),
    services: z.array(z.record(z.any())).optional(),
    invoices: z.array(z.record(z.any())).optional(),
    notes: z.array(z.record(z.any())).optional(),
    tasks: z.array(z.record(z.any())).optional(),
  }),
});

const importRowsSchema = z.object({
  entity: z.enum(['deals', 'contacts']),
  rows: z.array(z.record(z.any())).min(1, 'No rows to import').max(5000),
});

module.exports.invoiceCreateSchema = invoiceCreateSchema;
module.exports.invoiceUpdateSchema = invoiceUpdateSchema;
module.exports.paymentSchema = paymentSchema;
module.exports.taskSchema = taskSchema;
module.exports.communicationSchema = communicationSchema;
module.exports.templateSchema = templateSchema;
module.exports.preferencesSchema = preferencesSchema;
module.exports.restoreSchema = restoreSchema;
module.exports.importRowsSchema = importRowsSchema;
module.exports.INVOICE_STATUSES = INVOICE_STATUSES;

// Full export list (declared last so every schema above is initialized).
Object.assign(module.exports, {
  idParam,
  DEAL_STATUSES,
  STAGE_FLOW,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  profileSchema,
  dealCreateSchema,
  dealUpdateSchema,
  dealMoveSchema,
  listQuerySchema,
  dealBare,
  contactBare,
  contactSchema,
  taskBare,
  taskSchema,
  serviceBare,
  serviceSchema,
  invoiceBare,
  invoiceCreateSchema,
  invoiceUpdateSchema,
  brandSchema,
  noteSchema,
  communicationSchema,
  templateSchema,
  preferencesSchema,
  restoreSchema,
  importRowsSchema,
  tagsSchema,
});
