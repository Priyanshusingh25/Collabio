import React, { useEffect, useState } from 'react';
import { Plus, Search, X, Building2 } from 'lucide-react';
import { brandsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/helpers';

const LOGO_EMOJIS = ['🏢', '🔒', '☕', '👜', '🟦', '⚡', '🎮', '🎵', '📱', '🌐', '💼', '🎯', '🚀', '💡', '🎨'];

function BrandModal({ brand, onClose, onSaved }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(brand || { name: '', industry: '', contact_name: '', contact_email: '', website: '', notes: '', logo_emoji: '🏢' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let result;
      if (brand?.id) {
        result = await brandsApi.update(token, brand.id, form);
        addToast('Brand updated!');
      } else {
        result = await brandsApi.create(token, form);
        addToast('Brand added!');
      }
      onSaved(result);
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
          <div className="modal-title">{brand?.id ? 'Edit Brand' : '🏢 Add Brand'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Emoji picker */}
            <div className="form-group">
              <label className="form-label">Logo / Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {LOGO_EMOJIS.map(e => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => set('logo_emoji', e)}
                    style={{
                      width: 36, height: 36, fontSize: 20, border: `2px solid ${form.logo_emoji === e ? 'var(--accent-1)' : 'var(--color-border)'}`,
                      borderRadius: 8, background: 'var(--color-surface-2)', cursor: 'pointer', transition: 'var(--transition)'
                    }}
                  >{e}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Brand Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="NordVPN" required />
            </div>
            <div className="form-group">
              <label className="form-label">Industry</label>
              <input className="form-input" value={form.industry || ''} onChange={e => set('industry', e.target.value)} placeholder="Tech, Lifestyle, Finance..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input className="form-input" value={form.contact_name || ''} onChange={e => set('contact_name', e.target.value)} placeholder="Alex Chen" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input className="form-input" type="email" value={form.contact_email || ''} onChange={e => set('contact_email', e.target.value)} placeholder="alex@brand.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://brand.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Partnership notes, preferences..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '💾'} {brand?.id ? 'Save Changes' : 'Add Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Brands() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBrand, setEditBrand] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const b = await brandsApi.getAll(token);
      setBrands(b);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this brand? Associated deals will not be deleted.')) return;
    try {
      await brandsApi.delete(token, id);
      setBrands(prev => prev.filter(b => b.id !== id));
      addToast('Brand deleted');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const filtered = brands.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.industry?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Brands 🏢</h1>
          <p className="page-subtitle">{brands.length} brand{brands.length !== 1 ? 's' : ''} in your directory</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditBrand(null); setShowModal(true); }}>
          <Plus size={16} /> Add Brand
        </button>
      </div>

      <div className="search-bar mb-6">
        <div className="search-input-wrap">
          <Search size={15} />
          <input className="search-input" placeholder="Search brands..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <div className="empty-state-title">No brands yet</div>
          <div className="empty-state-text">Add your first brand partner to start tracking your deals</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Brand</button>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(brand => (
            <div
              key={brand.id}
              className="brand-card"
              onClick={() => { setEditBrand(brand); setShowModal(true); }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div className="brand-logo">{brand.logo_emoji || '🏢'}</div>
                <button
                  className="btn btn-danger btn-sm btn-icon"
                  onClick={(e) => { e.stopPropagation(); handleDelete(brand.id); }}
                  style={{ opacity: 0, transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <X size={13} />
                </button>
              </div>
              <div className="brand-name">{brand.name}</div>
              <div className="brand-industry">{brand.industry || 'No industry set'}</div>
              {brand.contact_name && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  👤 {brand.contact_name}{brand.contact_email ? ` · ${brand.contact_email}` : ''}
                </div>
              )}
              <div className="brand-stats">
                <div className="brand-stat">
                  <div className="brand-stat-value">{brand.total_deals || 0}</div>
                  <div className="brand-stat-label">Deals</div>
                </div>
                <div className="brand-stat">
                  <div className="brand-stat-value" style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    {formatCurrency(brand.total_value)}
                  </div>
                  <div className="brand-stat-label">Total Value</div>
                </div>
                <div className="brand-stat">
                  <div className="brand-stat-value" style={{ color: '#22c55e' }}>{formatCurrency(brand.total_paid)}</div>
                  <div className="brand-stat-label">Paid</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <BrandModal
          brand={editBrand}
          onClose={() => { setShowModal(false); setEditBrand(null); }}
          onSaved={(saved) => {
            if (editBrand?.id) {
              setBrands(prev => prev.map(b => b.id === saved.id ? { ...b, ...saved } : b));
            } else {
              setBrands(prev => [{ ...saved, total_deals: 0, total_value: 0, total_paid: 0 }, ...prev]);
            }
          }}
        />
      )}
    </div>
  );
}
