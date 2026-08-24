import React, { useEffect, useState } from 'react';
import { Plus, X, Trash2, Edit } from 'lucide-react';
import { servicesApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';

export default function Services() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = async () => {
    try {
      const data = await servicesApi.getAll(token);
      setServices(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await servicesApi.delete(token, id);
      setServices(prev => prev.filter(s => s.id !== id));
      addToast('Service deleted');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Services 💼</h1>
          <p className="page-subtitle">Manage what you offer and your rates</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus size={16} /> Add Service
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <div className="empty-state-title">No services yet</div>
          <div className="empty-state-text">Define your brand integrations, dev services, or consulting rates.</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Service</button>
        </div>
      ) : (
        <div className="grid-3">
          {services.map(s => (
            <div key={s.id} className="card" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditItem(s); setShowModal(true); }}>
                  <Edit size={14} />
                </button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(s.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="badge badge-outreach" style={{ marginBottom: 12 }}>{s.category || 'Service'}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-2)', marginBottom: 12 }}>
                {formatCurrency(s.rate)} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>/ {s.rate_type}</span>
              </div>
              {s.platforms && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <strong>Platforms:</strong> {s.platforms}
                </div>
              )}
              {s.description && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {s.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ServiceModal
          service={editItem}
          onClose={() => setShowModal(false)}
          onSaved={(saved) => {
            if (editItem) {
              setServices(prev => prev.map(s => s.id === saved.id ? saved : s));
            } else {
              setServices(prev => [saved, ...prev]);
            }
          }}
        />
      )}
    </div>
  );
}

function ServiceModal({ service, onClose, onSaved }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(service || {
    name: '', category: 'Brand Promotion', rate: 0, rate_type: 'project', platforms: '', description: '', status: 'active'
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = service
        ? await servicesApi.update(token, service.id, form)
        : await servicesApi.create(token, form);
      addToast(service ? 'Service updated!' : 'Service created!');
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
          <div className="modal-title">{service ? 'Edit Service' : 'Add Service'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Service Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. YouTube Integration" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="Brand Promotion">Brand Promotion</option>
                  <option value="Software Dev">Software Dev</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rate ($)</label>
                <input className="form-input" type="number" value={form.rate} onChange={e => set('rate', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Rate Type</label>
                <select className="form-select" value={form.rate_type} onChange={e => set('rate_type', e.target.value)}>
                  <option value="project">Per Project</option>
                  <option value="hour">Per Hour</option>
                  <option value="video">Per Video</option>
                  <option value="post">Per Post</option>
                  <option value="month">Per Month</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Platforms</label>
              <input className="form-input" value={form.platforms} onChange={e => set('platforms', e.target.value)} placeholder="e.g. YouTube, Instagram" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description / Included</label>
              <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What do they get?" />
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
