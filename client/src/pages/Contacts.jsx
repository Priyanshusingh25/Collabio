import React, { useEffect, useState } from 'react';
import { Plus, X, Search, Trash2, Edit, Mail, ExternalLink, Users, Phone, Building2 } from 'lucide-react';
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
      addToast('Contact removed');
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Contacts & Leads</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', padding: '3px 10px', borderRadius: 20 }}>
              {contacts.length} Leads
            </span>
          </h1>
          <p className="page-subtitle">Track brand managers, talent agents, PR representatives, and deal point-of-contacts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus size={16} /> Add Contact
        </button>
      </div>

      <div style={{ maxWidth: 380, marginBottom: 24 }}>
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="search-input"
            placeholder="Search contacts, companies, emails..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No contacts found</div>
          <div className="empty-state-text">Keep your communications organized by adding your agency and brand leads.</div>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Add First Contact
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Brand / Company</th>
                <th>Direct Communication</th>
                <th>Relationship Stage</th>
                <th>Linked Deals</th>
                <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: 'var(--accent-gradient-subtle)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'var(--accent-1)',
                        fontSize: 13
                      }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                        {c.source && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>via {c.source}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                      <Building2 size={13} color="var(--text-muted)" />
                      <span>{c.company || 'Independent'}</span>
                    </div>
                  </td>
                  <td>
                    {c.email ? (
                      <a 
                        href={`mailto:${c.email}`} 
                        className="btn btn-ghost btn-sm" 
                        style={{ padding: '4px 8px', display: 'inline-flex', gap: 6, color: 'var(--accent-cyan)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <Mail size={13} /> {c.email}
                      </a>
                    ) : (
                      c.platform ? `${c.platform} Direct` : '—'
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${c.status === 'lead' ? 'outreach' : c.status === 'won' ? 'paid' : c.status === 'lost' ? 'archived' : 'active'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    {c.linked_deals_count > 0 ? (
                      <span className="badge badge-active">{c.linked_deals_count} deal{c.linked_deals_count !== 1 ? 's' : ''}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm btn-icon"
                        onClick={() => { setEditItem(c); setShowModal(true); }}
                        title="Edit Contact"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={() => handleDelete(c.id)}
                        title="Delete Contact"
                      >
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
      addToast(contact ? 'Contact updated!' : 'Contact created! ✨');
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
          <div className="modal-title">{contact ? 'Edit Contact' : '👤 Add Brand Contact'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sarah Lin" required />
              </div>
              <div className="form-group">
                <label className="form-label">Brand / Agency</label>
                <input className="form-input" value={form.company || ''} onChange={e => set('company', e.target.value)} placeholder="Notion, Sony..." />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="sarah@brand.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone / WhatsApp</label>
                <input className="form-input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+1 (415) 555-0192" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Relationship Stage</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="lead">Lead (Outreach)</option>
                  <option value="contacted">Contacted</option>
                  <option value="in_discussion">In Discussion</option>
                  <option value="won">Won (Active Client)</option>
                  <option value="lost">Archived</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lead Source</label>
                <input className="form-input" placeholder="Inbound, LinkedIn, Referral..." value={form.source || ''} onChange={e => set('source', e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Communication Notes</label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Prefers video draft links via Frame.io, quarterly budgets..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '💾'} {contact ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
