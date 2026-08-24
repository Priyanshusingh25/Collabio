import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { settingsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { token, user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    linkedin: '', gmail: '', instagram: '', github: '', youtube: '', bio: '', invoice_business_name: '', invoice_address: ''
  });

  useEffect(() => {
    settingsApi.get(token).then(data => {
      if (data) {
        setForm(data);
      }
      setLoading(false);
    }).catch(err => {
      addToast(err.message, 'error');
      setLoading(false);
    });
  }, [token]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(token, form);
      addToast('Profile saved successfully! ✨');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile Settings ⚙️</h1>
          <p className="page-subtitle">Manage your creator identity and preferences</p>
        </div>
      </div>

      <div style={{ maxWidth: 800 }}>
        <div className="card mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div className="user-avatar" style={{ width: 64, height: 64, fontSize: 32 }}>{user?.avatar_emoji || '🎬'}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{user?.display_name || user?.username}</div>
              <div style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <div className="section-title">Social Links</div>
          <div className="grid-2 mb-6">
            <div className="form-group">
              <label className="form-label">LinkedIn</label>
              <input className="form-input" value={form.linkedin || ''} onChange={e => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub</label>
              <input className="form-input" value={form.github || ''} onChange={e => set('github', e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input className="form-input" value={form.instagram || ''} onChange={e => set('instagram', e.target.value)} placeholder="https://instagram.com/..." />
            </div>
            <div className="form-group">
              <label className="form-label">YouTube</label>
              <input className="form-input" value={form.youtube || ''} onChange={e => set('youtube', e.target.value)} placeholder="https://youtube.com/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email (Gmail)</label>
              <input className="form-input" type="email" value={form.gmail || ''} onChange={e => set('gmail', e.target.value)} placeholder="you@gmail.com" />
            </div>
          </div>

          <div className="divider" />

          <div className="section-title">Invoice Settings</div>
          <div className="form-group">
            <label className="form-label">Business Name (for Invoices)</label>
            <input className="form-input" value={form.invoice_business_name || ''} onChange={e => set('invoice_business_name', e.target.value)} placeholder="e.g. Priyanshu Singh LLC" />
          </div>
          <div className="form-group">
            <label className="form-label">Business Address</label>
            <textarea className="form-textarea" value={form.invoice_address || ''} onChange={e => set('invoice_address', e.target.value)} placeholder="123 Creator St..." style={{ minHeight: 80 }} />
          </div>

          <div className="divider" />
          
          <div className="form-group">
            <label className="form-label">Bio / Tagline</label>
            <input className="form-input" value={form.bio || ''} onChange={e => set('bio', e.target.value)} placeholder="Software Developer & Creator" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={15} />} Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
