import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Trash2, Plus, Send, ExternalLink } from 'lucide-react';
import { getStatus, getPlatform, formatCurrency, formatDate, getDeadlineStatus, STATUSES, PLATFORMS, PRIORITIES, PAYMENT_TERMS } from '../utils/helpers';
import { dealsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function DealDetailModal({ deal: initialDeal, onClose, onUpdated, onDeleted }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [deal, setDeal] = useState(initialDeal);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...initialDeal });
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    // Fetch full deal with notes
    dealsApi.getOne(token, initialDeal.id).then(d => {
      setDeal(d);
      setForm({ ...d });
    }).catch(() => {});
  }, [initialDeal.id]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await dealsApi.update(token, deal.id, {
        ...form,
        deal_value: parseFloat(form.deal_value) || 0,
        brand_id: form.brand_id || null,
      });
      setDeal({ ...updated, notes: deal.notes });
      setForm({ ...updated, notes: deal.notes });
      setEditing(false);
      onUpdated(updated);
      addToast('Deal updated!');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await dealsApi.update(token, deal.id, {
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : deal.paid_at,
      });
      setDeal(prev => ({ ...prev, ...updated }));
      setForm(prev => ({ ...prev, ...updated }));
      onUpdated(updated);
      addToast(`Moved to ${getStatus(newStatus).label}`);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this deal? This cannot be undone.')) return;
    try {
      await dealsApi.delete(token, deal.id);
      addToast('Deal deleted');
      onDeleted(deal.id);
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const note = await dealsApi.addNote(token, deal.id, noteText.trim());
      setDeal(prev => ({ ...prev, notes: [note, ...(prev.notes || [])] }));
      setNoteText('');
      addToast('Note added');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await dealsApi.deleteNote(token, deal.id, noteId);
      setDeal(prev => ({ ...prev, notes: (prev.notes || []).filter(n => n.id !== noteId) }));
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const status = getStatus(deal.status);
  const platform = getPlatform(deal.platform);
  const deadline = getDeadlineStatus(deal.deadline);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span className={`badge badge-${deal.status}`}>{status.emoji} {status.label}</span>
              <span className="badge" style={{ background: 'var(--color-surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--color-border)' }}>
                {platform.emoji} {platform.label}
              </span>
              {deal.priority === 'high' && (
                <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>🔥 High Priority</span>
              )}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{deal.brand_name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{deal.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {!editing && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left column */}
          <div>
            {editing ? (
              <>
                <div className="form-group">
                  <label className="form-label">Brand Name</label>
                  <input className="form-input" value={form.brand_name} onChange={e => set('brand_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deal Title</label>
                  <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <select className="form-select" value={form.platform} onChange={e => set('platform', e.target.value)}>
                      {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                      {STATUSES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Deal Value ($)</label>
                    <input className="form-input" type="number" value={form.deal_value} onChange={e => set('deal_value', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <select className="form-select" value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}>
                      {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input className="form-input" type="date" value={form.deadline || ''} onChange={e => set('deadline', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                      {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Deliverable</label>
                  <textarea className="form-textarea" value={form.deliverable || ''} onChange={e => set('deliverable', e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Name</label>
                    <input className="form-input" value={form.contact_name || ''} onChange={e => set('contact_name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <input className="form-input" type="email" value={form.contact_email || ''} onChange={e => set('contact_email', e.target.value)} />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* View mode */}
                <InfoRow label="Deal Value" value={<span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(deal.deal_value)}</span>} />
                <InfoRow label="Payment Terms" value={deal.payment_terms || '—'} />
                <InfoRow label="Deadline" value={
                  <span className={`deadline-badge ${deadline?.type || 'ok'}`}>
                    {deadline ? `${formatDate(deal.deadline)} · ${deadline.label}` : '—'}
                  </span>
                } />
                <InfoRow label="Deliverable" value={deal.deliverable || '—'} />
                <InfoRow label="Contact" value={deal.contact_name ? `${deal.contact_name}${deal.contact_email ? ` · ${deal.contact_email}` : ''}` : '—'} />
                <InfoRow label="Added" value={formatDate(deal.created_at)} />

                {/* Quick status change */}
                <div style={{ marginTop: 20 }}>
                  <div className="section-title">Move to stage</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {STATUSES.map(s => (
                      <button
                        key={s.key}
                        onClick={() => handleStatusChange(s.key)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, opacity: deal.status === s.key ? 1 : 0.6, border: deal.status === s.key ? `1px solid ${s.color}44` : undefined, color: deal.status === s.key ? s.color : undefined }}
                      >
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right column — Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-title">📝 Notes</div>

            {/* Add note */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="Add a note..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={addingNote}>
                <Send size={13} />
              </button>
            </div>

            {/* Notes list */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(deal.notes || []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No notes yet</div>
              ) : (
                (deal.notes || []).map(note => (
                  <div key={note.id} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{note.content}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(note.created_at)}</span>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', color: 'var(--text-muted)' }} onClick={() => handleDeleteNote(note.id)}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Danger zone */}
            {!editing && (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={handleDelete}>
                  <Trash2 size={13} /> Delete Deal
                </button>
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => { setEditing(false); setForm({ ...deal }); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '💾'} Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{value}</div>
    </div>
  );
}
