import React, { useEffect, useState } from 'react';
import { Plus, X, Search, Trash2, Edit, Mail, ExternalLink } from 'lucide-react';
import { contactsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Contacts() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const data = await contactsApi.getAll(token);
      setContacts(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await contactsApi.delete(token, id);
      setContacts(prev => prev.filter(c => c.id !== id));
      addToast('Contact deleted');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const filtered = contacts.filter(c => 
    !search || 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contacts & Leads 👥</h1>
          <p className="page-subtitle">Track everyone you communicate with</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus size={16} /> Add Contact
        </button>
      </div>

      <div className="search-bar mb-6">
        <div className="search-input-wrap">
          <Search size={15} />
          <input className="search-input" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No contacts found</div>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}><Plus size={15} /> Add Contact</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email / Contact</th>
                <th>Status</th>
                <th>Deals</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                    {c.source && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>via {c.source}</div>}
                  </td>
                  <td>{c.company || '—'}</td>
                  <td>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', display: 'inline-flex', gap: 4 }}>
                        <Mail size={12} /> {c.email}
                      </a>
                    ) : (
                      c.platform ? `${c.platform} DM` : '—'
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${c.status === 'lead' ? 'outreach' : c.status === 'won' ? 'paid' : c.status === 'lost' ? 'archived' : 'active'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    {c.linked_deals_count > 0 ? (
                      <span className="badge badge-active">{c.linked_deals_count} deal(s)</span>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditItem(c); setShowModal(true); }}>
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDelete(c.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ContactModal
          contact={editItem}
          onClose={() => setShowModal(false)}
          onSaved={(saved) => {
            if (editItem) {
              setContacts(prev => prev.map(c => c.id === saved.id ? { ...c, ...saved } : c));
            } else {
              setContacts(prev => [{ ...saved, linked_deals_count: 0 }, ...prev]);
            }
          }}
        />
      )}
    </div>
  );
}

function ContactModal({ contact, onClose, onSaved }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(contact || {
    name: '', company: '', email: '', phone: '', platform: '', source: '', status: 'lead', notes: ''
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = contact
        ? await contactsApi.update(token, contact.id, form)
        : await contactsApi.create(token, form);
      addToast(contact ? 'Contact updated!' : 'Contact created!');
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
          <div className="modal-title">{contact ? 'Edit Contact' : 'Add Contact'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input className="form-input" value={form.company || ''} onChange={e => set('company', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="lead">Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="in_discussion">In Discussion</option>
                  <option value="won">Won (Client)</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <input className="form-input" placeholder="Inbound, LinkedIn, Referral..." value={form.source || ''} onChange={e => set('source', e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '💾'} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
