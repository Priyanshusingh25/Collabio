import React, { useEffect, useState } from 'react';
import { Plus, Search, X, Building2, ExternalLink, Trash2, Edit } from 'lucide-react';
import { brandsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';

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
        addToast('Brand updated! ✨');
      } else {
        result = await brandsApi.create(token, form);
        addToast('Brand added to directory! 🚀');
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
          <div className="modal-title">{brand?.id ? 'Edit Brand Partner' : '🏢 Add New Brand Partner'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Emoji picker */}
            <div className="form-group">
              <label className="form-label">Brand Icon / Badge</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LOGO_EMOJIS.map(e => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => set('logo_emoji', e)}
                    style={{
                      width: 38,
                      height: 38,
                      fontSize: 20,
                      border: `2px solid ${form.logo_emoji === e ? 'var(--accent-1)' : 'var(--color-border)'}`,
                      borderRadius: 10,
                      background: form.logo_emoji === e ? 'var(--accent-gradient-subtle)' : 'var(--color-surface-2)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Brand Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sony, Notion, NordVPN" required />
            </div>

            <div className="form-group">
              <label className="form-label">Industry Sector</label>
              <input className="form-input" value={form.industry || ''} onChange={e => set('industry', e.target.value)} placeholder="Creator Tech, Productivity, SaaS..." />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Primary Contact</label>
                <input className="form-input" value={form.contact_name || ''} onChange={e => set('contact_name', e.target.value)} placeholder="Sarah Lin" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input className="form-input" type="email" value={form.contact_email || ''} onChange={e => set('contact_email', e.target.value)} placeholder="sarah@brand.com" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Official Website</label>
              <input className="form-input" value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://notion.so" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Partnership Notes & Guidelines</label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Brand tone guidelines, payment preferences, annual deals..." />
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
    if (!window.confirm('Delete this brand? Deals linked to it will remain preserved.')) return;
    try {
      await brandsApi.delete(token, id);
      setBrands(prev => prev.filter(b => b.id !== id));
      addToast('Brand deleted');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const filtered = brands.filter(b => 
    !search || 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    b.industry?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Brand Directory</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', background: 'rgba(139, 92, 246, 0.12)', color: '#c084fc', padding: '3px 10px', borderRadius: 20 }}>
              {brands.length} Partners
            </span>
          </h1>
          <p className="page-subtitle">Sponsor roster, media contacts, past deal volumes, and relationship histories</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditBrand(null); setShowModal(true); }}>
          <Plus size={16} /> Add Brand
        </button>
      </div>

      <div style={{ maxWidth: 400, marginBottom: 24 }}>
        <div className="search-input-wrap">
          <Search size={16} />
          <input 
            className="search-input" 
            placeholder="Search brands or industries..." 
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
          <div className="empty-state-icon">🏢</div>
          <div className="empty-state-title">No brand partners found</div>
          <div className="empty-state-text">Add your sponsor relationships to track lifetime value and contact details.</div>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Add Brand Partner
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(brand => (
            <div
              key={brand.id}
              className="card"
              onClick={() => { setEditBrand(brand); setShowModal(true); }}
              style={{
                cursor: 'pointer',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                }}>
                  {brand.logo_emoji || '🏢'}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={(e) => { e.stopPropagation(); handleDelete(brand.id); }}
                  title="Delete brand"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                {brand.name}
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--accent-1)', fontWeight: 600, marginBottom: 12 }}>
                {brand.industry || 'Tech & Creator'}
              </div>

              {brand.contact_name && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                  👤 {brand.contact_name} {brand.contact_email ? `• ${brand.contact_email}` : ''}
                </div>
              )}

              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginBottom: 16
                  }}
                >
                  <ExternalLink size={12} />
                  <span>{brand.website.replace('https://', '').replace('http://', '')}</span>
                </a>
              )}

              <div style={{
                marginTop: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                paddingTop: 14,
                borderTop: '1px solid var(--color-border)'
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {brand.total_deals || 0}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deals</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--accent-1)' }}>
                    {formatCurrency(brand.total_value)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pipeline</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: '#10b981' }}>
                    {formatCurrency(brand.total_paid)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Settled</div>
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
