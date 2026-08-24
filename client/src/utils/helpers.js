// Status helpers
export const STATUSES = [
  { key: 'outreach', label: 'Outreach', color: '#60a5fa', emoji: '📤' },
  { key: 'negotiating', label: 'Negotiating', color: '#f59e0b', emoji: '🤝' },
  { key: 'contract_sent', label: 'Contract Sent', color: '#8b5cf6', emoji: '📝' },
  { key: 'active', label: 'Active', color: '#10b981', emoji: '🎬' },
  { key: 'invoiced', label: 'Invoiced', color: '#f97316', emoji: '💸' },
  { key: 'paid', label: 'Paid', color: '#22c55e', emoji: '✅' },
  { key: 'archived', label: 'Archived', color: '#6b7280', emoji: '📦' },
];

export const PLATFORMS = [
  { key: 'YouTube', label: 'YouTube', emoji: '▶️', color: '#ff0000' },
  { key: 'Instagram', label: 'Instagram', emoji: '📷', color: '#e1306c' },
  { key: 'TikTok', label: 'TikTok', emoji: '🎵', color: '#69c9d0' },
  { key: 'Twitter', label: 'Twitter / X', emoji: '𝕏', color: '#1da1f2' },
  { key: 'Newsletter', label: 'Newsletter', emoji: '📧', color: '#f59e0b' },
  { key: 'Podcast', label: 'Podcast', emoji: '🎙️', color: '#8b5cf6' },
  { key: 'LinkedIn', label: 'LinkedIn', emoji: '💼', color: '#0077b5' },
  { key: 'Blog', label: 'Blog', emoji: '✍️', color: '#6b7280' },
  { key: 'Twitch', label: 'Twitch', emoji: '🎮', color: '#9147ff' },
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
  return STATUSES.find(s => s.key === key) || { key, label: key, color: '#6b7280', emoji: '•' };
}

export function getPlatform(key) {
  return PLATFORMS.find(p => p.key === key) || { key, label: key, emoji: '🌐', color: '#6b7280' };
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
