import React, { useEffect, useState } from 'react';
import { Plus, X, Trash2, Pin } from 'lucide-react';
import { notesApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/helpers';

const COLORS = {
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  gray: '#6b7280'
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
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quick Notes 📝</h1>
          <p className="page-subtitle">Scratch pad for ideas and meeting notes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus size={16} /> Add Note
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">No notes yet</div>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}><Plus size={15} /> Create Note</button>
        </div>
      ) : (
        <div className="grid-4" style={{ gridAutoRows: 'max-content' }}>
          {notes.map(note => (
            <div 
              key={note.id} 
              className="card" 
              onClick={() => { setEditItem(note); setShowModal(true); }}
              style={{ 
                cursor: 'pointer', 
                borderTop: `4px solid ${COLORS[note.color] || COLORS.blue}`,
                display: 'flex', flexDirection: 'column' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, paddingRight: 24 }}>{note.title || 'Untitled Note'}</h3>
                <div style={{ display: 'flex', gap: 4, position: 'absolute', top: 12, right: 12 }}>
                  <button 
                    className="btn btn-ghost btn-sm btn-icon" 
                    onClick={(e) => togglePin(e, note)}
                    style={{ color: note.is_pinned ? 'var(--accent-1)' : 'var(--text-muted)' }}
                  >
                    <Pin size={14} fill={note.is_pinned ? 'currentColor' : 'none'} />
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: 16, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical' }}>
                {note.content}
              </div>
              <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                {formatDate(note.updated_at)}
              </div>
            </div>
          ))}
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
  const [form, setForm] = useState(note || { title: '', content: '', color: 'blue', is_pinned: 0 });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = note
        ? await notesApi.update(token, note.id, form)
        : await notesApi.create(token, form);
      addToast(note ? 'Note updated' : 'Note created');
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
          <div className="modal-title">{note ? 'Edit Note' : 'New Note'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <input 
              className="form-input" 
              style={{ fontSize: 18, fontWeight: 700, background: 'transparent', border: 'none', padding: 0, marginBottom: 16, boxShadow: 'none' }}
              value={form.title} onChange={e => set('title', e.target.value)} placeholder="Note Title" autoFocus
            />
            <textarea 
              className="form-textarea" 
              style={{ minHeight: 200, background: 'var(--color-surface-2)', border: 'none' }}
              value={form.content} onChange={e => set('content', e.target.value)} placeholder="Start typing..." required
            />
            
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {Object.keys(COLORS).map(c => (
                <div 
                  key={c}
                  onClick={() => set('color', c)}
                  style={{ 
                    width: 24, height: 24, borderRadius: '50%', background: COLORS[c], cursor: 'pointer',
                    border: form.color === c ? '2px solid white' : '2px solid transparent',
                    boxShadow: form.color === c ? `0 0 0 2px ${COLORS[c]}` : 'none'
                  }}
                />
              ))}
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
