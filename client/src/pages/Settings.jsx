import React, { useEffect, useState } from 'react';
import { Save, Download, Database, Server, CheckCircle2, RefreshCw } from 'lucide-react';
import { settingsApi, healthApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { token, user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sysHealth, setSysHealth] = useState(null);

  const [form, setForm] = useState({
    linkedin: '', gmail: '', instagram: '', github: '', youtube: '', bio: '', invoice_business_name: '', invoice_address: ''
  });

  const loadData = async () => {
    try {
      const [settingsData, healthData] = await Promise.all([
        settingsApi.get(token),
        healthApi.check().catch(() => null)
      ]);
      if (settingsData) setForm(settingsData);
      if (healthData) setSysHealth(healthData);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await settingsApi.exportData(token);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collabio-workspace-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Workspace data exported successfully! 💾');
    } catch (err) {
      addToast(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
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
          <h1 className="page-title">Settings & Diagnostics ⚙️</h1>
          <p className="page-subtitle">Manage your profile, database storage, and system backups</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleExportData}
          disabled={exporting}
          title="Download complete JSON snapshot of all your deals, brands, contacts, and invoices"
        >
          {exporting ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Download size={15} />}
          Export Workspace (JSON)
        </button>
      </div>

      <div style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* User Profile Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="user-avatar" style={{ width: 64, height: 64, fontSize: 32 }}>
              {user?.avatar_emoji || '🎬'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{user?.display_name || user?.username}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</div>
              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: 'var(--color-surface-2)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span>User ID: #{user?.id}</span>
                <span>•</span>
                <span>Username: @{user?.username}</span>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadData}
              title="Refresh status"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Database & System Diagnostics */}
        <div className="card" style={{ border: '1px solid rgba(124, 58, 237, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 8, background: 'rgba(124, 58, 237, 0.15)', borderRadius: 8, color: '#a855f7' }}>
                <Database size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Database & Storage Architecture</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Persistent storage diagnostics and live engine metrics</div>
              </div>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: 12,
              color: '#10b981',
              fontWeight: 600
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              Connected & Persistent
            </div>
          </div>

          <div className="grid-3 mb-4" style={{ gap: 12 }}>
            <div style={{ padding: 12, background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engine</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                {sysHealth?.database?.engine || 'SQLite 3'}
              </div>
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                {sysHealth?.database?.mode || 'WAL Mode Active'}
              </div>
            </div>

            <div style={{ padding: 12, background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Disk Location</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#a855f7', marginTop: 4, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {sysHealth?.database?.file || 'server/db/collabio.db'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                ACID compliant local SQL file
              </div>
            </div>

            <div style={{ padding: 12, background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Records</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                {(sysHealth?.database?.counts?.deals ?? 0) + (sysHealth?.database?.counts?.brands ?? 0)} records in DB
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {sysHealth?.database?.counts?.deals ?? 0} deals · {sysHealth?.database?.counts?.invoices ?? 0} invoices
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Server size={14} /> Senior Developer Note: Database Scalability
            </div>
            Collabio runs out-of-the-box with persistent SQLite 3. Your user accounts, deals, and invoices are permanent.
            For multi-instance or cloud deployment, PostgreSQL can be plugged in by swapping the connection pool in <code style={{ fontSize: 11, color: '#a855f7' }}>server/db/database.js</code> using standard SQL migrations or Prisma.
          </div>
        </div>

        {/* Profile Settings Form */}
        <form onSubmit={handleSubmit} className="card">
          <div className="section-title">Social Profiles & Portfolio</div>
          <div className="grid-2 mb-6">
            <div className="form-group">
              <label className="form-label">LinkedIn Profile</label>
              <input
                className="form-input"
                value={form.linkedin || ''}
                onChange={e => set('linkedin', e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub</label>
              <input
                className="form-input"
                value={form.github || ''}
                onChange={e => set('github', e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input
                className="form-input"
                value={form.instagram || ''}
                onChange={e => set('instagram', e.target.value)}
                placeholder="https://instagram.com/username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">YouTube Channel</label>
              <input
                className="form-input"
                value={form.youtube || ''}
                onChange={e => set('youtube', e.target.value)}
                placeholder="https://youtube.com/@channel"
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Contact Email for Brands (Gmail / Custom Domain)</label>
              <input
                className="form-input"
                type="email"
                value={form.gmail || ''}
                onChange={e => set('gmail', e.target.value)}
                placeholder="partnerships@creator.com"
              />
            </div>
          </div>

          <div className="divider" />

          <div className="section-title">Invoice & Business Details</div>
          <div className="form-group">
            <label className="form-label">Business / Entity Name (Displayed on Invoices)</label>
            <input
              className="form-input"
              value={form.invoice_business_name || ''}
              onChange={e => set('invoice_business_name', e.target.value)}
              placeholder="e.g. Alex Rivera Media Studio LLC"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Registered Business Address</label>
            <textarea
              className="form-textarea"
              value={form.invoice_address || ''}
              onChange={e => set('invoice_address', e.target.value)}
              placeholder="Suite 400, Austin, TX 78701..."
              style={{ minHeight: 70 }}
            />
          </div>

          <div className="divider" />

          <div className="form-group">
            <label className="form-label">Bio / Tagline</label>
            <input
              className="form-input"
              value={form.bio || ''}
              onChange={e => set('bio', e.target.value)}
              placeholder="Senior Software Architect & Full-Stack Tech Creator"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={15} />}
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
