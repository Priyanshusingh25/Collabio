// Status helpers — muted professional palette
export const STATUSES = [
  { key: 'outreach', label: 'Outreach', color: '#175cd3', emoji: '' },
  { key: 'negotiating', label: 'Negotiating', color: '#b54708', emoji: '' },
  { key: 'contract_sent', label: 'Contract Sent', color: '#5925dc', emoji: '' },
  { key: 'active', label: 'Active', color: '#027a48', emoji: '' },
  { key: 'invoiced', label: 'Invoiced', color: '#b54708', emoji: '' },
  { key: 'paid', label: 'Paid', color: '#067647', emoji: '' },
  { key: 'archived', label: 'Archived', color: '#667085', emoji: '' },
];

export const PLATFORMS = [
  { key: 'YouTube', label: 'YouTube', emoji: '', color: '#667085' },
  { key: 'Instagram', label: 'Instagram', emoji: '', color: '#667085' },
  { key: 'TikTok', label: 'TikTok', emoji: '', color: '#667085' },
  { key: 'Twitter', label: 'Twitter / X', emoji: '', color: '#667085' },
  { key: 'Newsletter', label: 'Newsletter', emoji: '', color: '#667085' },
  { key: 'Podcast', label: 'Podcast', emoji: '', color: '#667085' },
  { key: 'LinkedIn', label: 'LinkedIn', emoji: '', color: '#667085' },
  { key: 'Blog', label: 'Blog', emoji: '', color: '#667085' },
  { key: 'Twitch', label: 'Twitch', emoji: '', color: '#667085' },
];

export const PRIORITIES = [
  { key: 'high', label: 'High', color: '#ef4444' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'low', label: 'Low', color: '#6b7280' },
];

export const PAYMENT_TERMS = [
  'upfront', 'net-15', 'net-30', 'net-45', 'net-60', 'on-delivery', 'milestone',
];

export function getStatus(key) {
  return STATUSES.find(s => s.key === key) || { key, label: key, color: '#667085', emoji: '' };
}

export function getPlatform(key) {
  return PLATFORMS.find(p => p.key === key) || { key, label: key, emoji: '', color: '#667085' };
}

export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getDeadlineStatus(deadlineStr) {
  if (!deadlineStr) return null;
  const deadline = new Date(deadlineStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, type: 'overdue' };
  if (diff === 0) return { label: 'Due today', type: 'soon' };
  if (diff <= 7) return { label: `${diff}d left`, type: 'soon' };
  return { label: `${diff}d left`, type: 'ok' };
}

export function getPipelineColumns() {
  return STATUSES.filter(s => s.key !== 'archived');
}

/** "3d ago" / "in 2d" — used by activity feeds and notifications. */
export function formatDistance(dateStr) {
  if (!dateStr) return '';
  const then = new Date(String(dateStr).replace(' ', 'T'));
  if (Number.isNaN(then.getTime())) return '';
  const diffMs = then - new Date();
  const absDays = Math.floor(Math.abs(diffMs) / 86400000);
  const absHours = Math.floor(Math.abs(diffMs) / 3600000);
  const absMin = Math.floor(Math.abs(diffMs) / 60000);
  if (absMin < 1) return 'just now';
  if (absMin < 60) return `${absMin}m ${diffMs > 0 ? 'from now' : 'ago'}`;
  if (absHours < 24) return `${absHours}h ${diffMs > 0 ? 'from now' : 'ago'}`;
  if (absDays < 30) return `${absDays}d ${diffMs > 0 ? 'from now' : 'ago'}`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Pipeline stages with the extended flow (in_review / published). */
export const PIPELINE_STAGES = [
  { key: 'outreach', label: 'Outreach', color: '#175cd3', emoji: '' },
  { key: 'negotiating', label: 'Negotiating', color: '#b54708', emoji: '' },
  { key: 'contract_sent', label: 'Contract Sent', color: '#5925dc', emoji: '' },
  { key: 'active', label: 'In Progress', color: '#027a48', emoji: '' },
  { key: 'in_review', label: 'In Review', color: '#026aa2', emoji: '' },
  { key: 'published', label: 'Published', color: '#067647', emoji: '' },
  { key: 'invoiced', label: 'Invoiced', color: '#b54708', emoji: '' },
  { key: 'paid', label: 'Paid', color: '#067647', emoji: '' },
];

/** Weighted value = value × probability (deal-level forecast input). */
export function weightedValue(deal) {
  return Math.round(((deal.deal_value || 0) * (deal.probability ?? 0)) / 100);
}
