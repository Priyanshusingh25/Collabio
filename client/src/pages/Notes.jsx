import React, { useEffect, useState } from 'react';
import { Plus, X, Trash2, Pin, StickyNote, Sparkles } from 'lucide-react';
import { notesApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/helpers';

const COLORS = {
  slate: '#475467',
  indigo: '#4f46e5',
  blue: '#026aa2',
  green: '#027a48',
  amber: '#b54708',
  red: '#b42318',
  gray: '#667085'
};

export default function Notes() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = async () => {
    try {
      const data = await notesApi.getAll(token);
      setNotes(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await notesApi.delete(token, id);
      setNotes(prev => prev.filter(n => n.id !== id));
      addToast('Note deleted');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const togglePin = async (e, note) => {
    e.stopPropagation();
    try {
      const updated = await notesApi.update(token, note.id, { ...note, is_pinned: note.is_pinned ? 0 : 1 });
      setNotes(prev => {
        const next = prev.map(n => n.id === note.id ? updated : n);
        return next.sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.created_at) - new Date(a.created_at));
      });
      addToast(note.is_pinned ? 'Note unpinned' : 'Note pinned');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Notes</span>
            <span className="badge" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--text-secondary)' }}>
              {notes.length} total
            </span>
          </h1>
          <p className="page-subtitle">Pitches, templates, and working notes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus size={16} /> Add Note
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <div style={{ color: 'var(--text-muted)' }}><StickyNote size={30} /></div>
          <h3>No notes yet</h3>
          <p>Keep pitch templates and talking points here.</p>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Add note
          </button>
        </div>
      ) : (
        <div className="grid-3" style={{ gridAutoRows: 'max-content' }}>
          {notes.map(note => {
            const cardColor = COLORS[note.color] || COLORS.slate;
            return (
              <div
                key={note.id}
                className="card"
                onClick={() => { setEditItem(note); setShowModal(true); }}
                style={{
                  cursor: 'pointer',
                  borderTop: `3px solid ${cardColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'var(--transition-fast)',
                  background: 'var(--color-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    paddingRight: 40
                  }}>
                    {note.title || 'Untitled Note'}
                  </div>

                  <div style={{ display: 'flex', gap: 4, position: 'absolute', top: 16, right: 16 }}>
                    <button 
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon" 
                      onClick={(e) => togglePin(e, note)}
                      title={note.is_pinned ? 'Unpin' : 'Pin to top'}
                      style={{ color: note.is_pinned ? 'var(--accent-1)' : 'var(--text-muted)' }}
                    >
                      <Pin size={14} fill={note.is_pinned ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon" 
                      style={{ color: '#f43f5e' }} 
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                      title="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  marginBottom: 16,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 7,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.55
                }}>
                  {note.content}
                </div>

                <div style={{
                  marginTop: 'auto',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTop: '1px solid var(--color-border)'
                }}>
                  <span>{formatDate(note.updated_at || note.created_at)}</span>
                  {note.is_pinned ? (
                    <span style={{ color: 'var(--accent-1)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Pin size={11} fill="currentColor" /> Pinned
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NoteModal
          note={editItem}
          onClose={() => setShowModal(false)}
          onSaved={(saved) => {
            if (editItem) {
              setNotes(prev => prev.map(n => n.id === saved.id ? saved : n).sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.created_at) - new Date(a.created_at)));
            } else {
              setNotes(prev => [saved, ...prev].sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.created_at) - new Date(a.created_at)));
            }
          }}
        />
      )}
    </div>
  );
}

function NoteModal({ note, onClose, onSaved }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(note || { title: '', content: '', color: 'purple', is_pinned: 0 });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = note
        ? await notesApi.update(token, note.id, form)
        : await notesApi.create(token, form);
      addToast(note ? 'Note updated!' : 'Note created! ✨');
      onSaved(res);
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
          <div className="modal-title">{note ? 'Edit Note' : '📝 New Pitch Note'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <input 
              className="form-input" 
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 800,
                background: 'transparent',
                border: 'none',
                padding: '0 0 12px 0',
                marginBottom: 12,
                borderBottom: '1px solid var(--color-border)',
                borderRadius: 0
              }}
              value={form.title} 
              onChange={e => set('title', e.target.value)} 
              placeholder="Note Title or Sponsor Name..." 
              autoFocus
            />
            
            <textarea 
              className="form-textarea" 
              style={{
                minHeight: 200,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                fontSize: 14,
                lineHeight: 1.6
              }}
              value={form.content} 
              onChange={e => set('content', e.target.value)} 
              placeholder="Start drafting pitch copy, rate breakdown, or talking points..." 
              required
            />
            
            <div style={{ marginTop: 18 }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Accent Tag Color</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {Object.keys(COLORS).map(c => (
                  <div 
                    key={c}
                    onClick={() => set('color', c)}
                    style={{ 
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: COLORS[c],
                      cursor: 'pointer',
                      border: form.color === c ? '2px solid #ffffff' : '2px solid transparent',
                      boxShadow: form.color === c ? `0 0 12px ${COLORS[c]}` : 'none',
                      transition: 'var(--transition-fast)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '💾'} Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
