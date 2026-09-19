import React, { useEffect, useState } from 'react';
import { X, Trash2, Send } from 'lucide-react';
import { getStatus, getPlatform, formatCurrency, formatDistance, formatDate, getDeadlineStatus, STATUSES, PLATFORMS, PRIORITIES, PAYMENT_TERMS } from '../utils/helpers';
import { useDeal, useUpdateDeal, useDeleteDeal, useDealTimeline, useAddDealNote, useDeleteDealNote } from '../features/deals/hooks';
import { useToast } from '../context/ToastContext';

export default function DealDetailModal({ deal: initialDeal, onClose }) {
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...initialDeal });
  const [noteText, setNoteText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: full } = useDeal(initialDeal.id);
  const { data: timeline } = useDealTimeline(initialDeal.id);
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const addNote = useAddDealNote(initialDeal.id);
  const deleteNote = useDeleteDealNote(initialDeal.id);

  const deal = full ? { ...full, notes: full.notes } : { ...initialDeal, notes: initialDeal.notes || [] };

  useEffect(() => {
    if (full) setForm((prev) => ({ ...prev, ...full }));
  }, [full]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    try {
      await updateDeal.mutateAsync({
        ...form,
        id: deal.id,
        deal_value: parseFloat(form.deal_value) || 0,
        brand_id: form.brand_id || null,
      });
      setEditing(false);
      addToast('Deal updated!');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDeal.mutateAsync(deal.id);
      addToast('Deal deleted');
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addNote.mutateAsync(noteText.trim());
      setNoteText('');
      addToast('Note added');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote.mutateAsync(noteId);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  /** Stage transition from the detail modal (validated server-side). */
  const handleStatusChange = async (nextStatus) => {
    if (nextStatus === deal.status) return;
    try {
      await updateDeal.mutateAsync({ id: deal.id, status: nextStatus });
      addToast('Stage updated');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const status = getStatus(deal.status);
  const platform = getPlatform(deal.platform);
  const deadline = getDeadlineStatus(deal.deadline);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true" aria-label={`Deal: ${deal.brand_name}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className={`badge badge-${deal.status}`}>{status.label}</span>
              <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--color-border)' }}>
                {platform.label}
              </span>
              {deal.priority === 'high' && (
                <span className="badge badge-priority_high">High priority</span>
              )}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{deal.brand_name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{deal.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {!editing && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close deal details"><X size={18} /></button>
          </div>
        </div>

        <div className="modal-body modal-body-split">
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
              <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={addNote.isPending} aria-label="Add note">
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
                <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={13} /> Delete Deal
                </button>
              </div>
            )}
          </div>
        </div>

        {confirmDelete && (
          <div className="confirm-inline" role="alertdialog" aria-label="Confirm delete deal">
            <div className="confirm-inline-text">
              <strong>Delete this deal?</strong>
              <span>“{deal.brand_name} — {deal.title}” and its notes will be permanently removed. This action cannot be undone.</span>
            </div>
            <div className="confirm-inline-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleteDeal.isPending}>
                {deleteDeal.isPending ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        )}

        {editing && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => { setEditing(false); setForm({ ...deal }); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={updateDeal.isPending}>
              {updateDeal.isPending ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '💾'} Save Changes
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
