import React, { useState } from 'react';
import { X, DollarSign, Calendar, Zap } from 'lucide-react';
import { PLATFORMS, STATUSES, PRIORITIES, PAYMENT_TERMS } from '../utils/helpers';
import { dealsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PLATFORM_EMOJIS = { YouTube: '▶️', Instagram: '📷', TikTok: '🎵', Twitter: '𝕏', Newsletter: '📧', Podcast: '🎙️', LinkedIn: '💼', Blog: '✍️', Twitch: '🎮' };

export default function NewDealModal({ onClose, onCreated, brands = [] }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brand_name: '',
    brand_id: '',
    title: '',
    platform: 'YouTube',
    status: 'outreach',
    deal_value: '',
    currency: 'USD',
    payment_terms: 'net-30',
    deliverable: '',
    deadline: '',
    priority: 'medium',
    contact_name: '',
    contact_email: '',
    notes: '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleBrandSelect = (brandId) => {
    const brand = brands.find(b => b.id === parseInt(brandId));
    set('brand_id', brandId);
    if (brand) set('brand_name', brand.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.brand_name || !form.title || !form.platform) {
      addToast('Brand name, title and platform are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const deal = await dealsApi.create(token, {
        ...form,
        deal_value: parseFloat(form.deal_value) || 0,
        brand_id: form.brand_id ? parseInt(form.brand_id) : null,
      });
      addToast('Deal created! 🎉');
      onCreated(deal);
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">✨ New Deal</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Add a new sponsorship or collab</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Brand */}
            <div className="form-group">
              <label className="form-label">Brand *</label>
              {brands.length > 0 && (
                <select className="form-select" style={{ marginBottom: 6 }} value={form.brand_id} onChange={e => handleBrandSelect(e.target.value)}>
                  <option value="">— Select existing brand —</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.logo_emoji} {b.name}</option>)}
                </select>
              )}
              <input
                className="form-input"
                placeholder={brands.length > 0 ? 'Or type a new brand name...' : 'Brand name...'}
                value={form.brand_name}
                onChange={e => set('brand_name', e.target.value)}
                required
              />
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Deal Title *</label>
              <input
                className="form-input"
                placeholder="e.g. NordVPN YouTube Integration Q4"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
              />
            </div>

            {/* Platform + Status */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Platform *</label>
                <select className="form-select" value={form.platform} onChange={e => set('platform', e.target.value)}>
                  {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stage</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Value + Payment Terms */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Deal Value ($)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 32 }}
                    type="number"
                    min="0"
                    step="50"
                    placeholder="0"
                    value={form.deal_value}
                    onChange={e => set('deal_value', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Terms</label>
                <select className="form-select" value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}>
                  {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Deadline + Priority */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 32 }}
                    type="date"
                    value={form.deadline}
                    onChange={e => set('deadline', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Deliverable */}
            <div className="form-group">
              <label className="form-label">Deliverable</label>
              <input
                className="form-input"
                placeholder="e.g. 60-second mid-roll integration in tech video"
                value={form.deliverable}
                onChange={e => set('deliverable', e.target.value)}
              />
            </div>

            {/* Contact */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input className="form-input" placeholder="Alex Chen" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input className="form-input" type="email" placeholder="alex@brand.com" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Any notes about this deal..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Creating...</> : <><Zap size={15} /> Create Deal</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
