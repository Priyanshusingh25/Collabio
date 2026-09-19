import React, { useEffect, useState } from 'react';
import { Plus, Search, X, Building2, ExternalLink, Trash2, Edit } from 'lucide-react';
import { brandsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/helpers';

const BRAND_COLORS = ['#eef0ff:#4f46e5', '#eff8ff:#026aa2', '#ecfdf3:#027a48', '#fffaeb:#b54708', '#fef3f2:#b42318', '#f4f3ff:#5925dc'];

function BrandAvatar({ name, size = 44 }) {
  const initial = (name || 'B').charAt(0).toUpperCase();
  const hash = (name || 'B').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [bg, fg] = BRAND_COLORS[hash % BRAND_COLORS.length].split(':');
  return (
    <div style={{ width: size, height: size, background: bg, color: fg, border: '1px solid var(--color-border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 700, boxShadow: 'var(--shadow-xs)' }}>
      {initial}
    </div>
  );
}

function BrandModal({ brand, onClose, onSaved }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(brand || { name: '', industry: '', contact_name: '', contact_email: '', website: '', notes: '' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let result;
      if (brand?.id) {
        result = await brandsApi.update(token, brand.id, form);
        addToast('Brand updated');
      } else {
        result = await brandsApi.create(token, form);
        addToast('Brand added');
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
          <div className="modal-title">{brand?.id ? 'Edit brand' : 'Add brand'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
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
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : null} {brand?.id ? 'Save changes' : 'Add brand'}
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
            <span>Brands</span>
            <span className="badge" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--text-secondary)' }}>
              {brands.length} total
            </span>
          </h1>
          <p className="page-subtitle">Sponsors, contacts, and relationship history</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditBrand(null); setShowModal(true); }}>
          <Plus size={16} /> Add Brand
        </button>
      </div>

      <div style={{ maxWidth: 360, marginBottom: 20 }}>
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="search-input"
            placeholder="Search brands..."
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
          <div style={{ color: 'var(--text-muted)' }}><Building2 size={30} /></div>
          <h3>No brands found</h3>
          <p>Add sponsor relationships to track value and contacts.</p>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Add brand
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
                transition: 'var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <BrandAvatar name={brand.name} />
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
