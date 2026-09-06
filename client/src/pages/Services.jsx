import React, { useEffect, useState } from 'react';
import { Plus, X, Trash2, Edit, Briefcase, DollarSign, Layers } from 'lucide-react';
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
    if (!window.confirm('Delete this service package?')) return;
    try {
      await servicesApi.delete(token, id);
      setServices(prev => prev.filter(s => s.id !== id));
      addToast('Service package deleted');
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
            <span>Rate Card & Services</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', background: 'rgba(139, 92, 246, 0.12)', color: '#c084fc', padding: '3px 10px', borderRadius: 20 }}>
              {services.length} Packages
            </span>
          </h1>
          <p className="page-subtitle">Standardized sponsorship deliverables, pricing tiers, and platform rate packages</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus size={16} /> Add Package
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <div className="empty-state-title">No service packages configured</div>
          <div className="empty-state-text">Define your brand integrations, dedicated video pricing, or consulting rates.</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Create Package
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {services.map(s => (
            <div
              key={s.id}
              className="card"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                transition: 'var(--transition-spring)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className="badge badge-contract_sent">{s.category || 'Package'}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-secondary btn-sm btn-icon"
                    onClick={() => { setEditItem(s); setShowModal(true); }}
                    title="Edit Service"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    onClick={() => handleDelete(s.id)}
                    title="Delete Service"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                {s.name}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: 'var(--accent-1)' }}>
                  {formatCurrency(s.rate)}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  / {s.rate_type}
                </span>
              </div>

              {s.platforms && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Platforms:</span> {s.platforms}
                </div>
              )}

              {s.description && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
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
      addToast(service ? 'Service updated!' : 'Service package created! ✨');
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
          <div className="modal-title">{service ? 'Edit Service Package' : '💼 Create Service Package'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Service Package Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. 60s Integrated Mid-roll" required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="Brand Promotion">Brand Promotion</option>
                  <option value="Video">Video Production</option>
                  <option value="Short-form">Short-form Video</option>
                  <option value="Social">Social Media & Thread</option>
                  <option value="Consulting">Consulting & Advisory</option>
                  <option value="Newsletter">Newsletter Placement</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Active Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Active (Available)</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rate / Price ($) *</label>
                <input className="form-input" type="number" value={form.rate} onChange={e => set('rate', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Pricing Model</label>
                <select className="form-select" value={form.rate_type} onChange={e => set('rate_type', e.target.value)}>
                  <option value="flat">Flat per Deliverable</option>
                  <option value="project">Per Project</option>
                  <option value="video">Per Video</option>
                  <option value="post">Per Post</option>
                  <option value="hour">Per Hour</option>
                  <option value="month">Monthly Retainer</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Platforms Supported</label>
              <input className="form-input" value={form.platforms} onChange={e => set('platforms', e.target.value)} placeholder="e.g. YouTube, TikTok, X" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Package Inclusions & Deliverables</label>
              <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Full dedicated 8-12 min technical tutorial with affiliate link & pinned comment..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '💾'} Save Package
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
