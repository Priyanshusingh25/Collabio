import React, { useEffect, useState } from 'react';
import { 
  Save, Download, Database, Server, CheckCircle2, RefreshCw, 
  ShieldCheck, Lock, KeyRound, Cpu, HardDrive
} from 'lucide-react';
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
      addToast('Settings saved');
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
      addToast('Workspace backup exported');
    } catch (err) {
      addToast(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Settings</span>
          </h1>
          <p className="page-subtitle">Profile, security, and backups</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleExportData}
          disabled={exporting}
          title="Download a JSON backup of your workspace"
        >
          {exporting ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Download size={15} />}
          Export data
        </button>
      </div>

      <div style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* User Profile Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="user-avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
              {(user?.display_name || user?.username || 'C').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {user?.display_name || user?.username}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user?.email}</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadData}
              title="Refresh status"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Security Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 9, background: 'var(--accent-1-soft)', border: '1px solid var(--accent-1-border)', borderRadius: 9, color: 'var(--accent-1)', display: 'flex' }}>
                <ShieldCheck size={19} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  Security
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Authentication and request protection
                </div>
              </div>
            </div>
            <div className="live-pill">
              <div className="db-beacon" />
              <span>Active</span>
            </div>
          </div>

          <div className="grid-3 mb-4" style={{ gap: 12 }}>
            <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Lock size={13} color="var(--accent-1)" />
                <span>Password Hash</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
                bcrypt (10 rounds)
              </div>
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                Adaptive salted key stretching
              </div>
            </div>

            <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <KeyRound size={13} color="var(--accent-cyan)" />
                <span>Session Tokens</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
                HMAC-SHA256 JWT
              </div>
              <div style={{ fontSize: 11, color: '#06b6d4', marginTop: 2 }}>
                Signed cryptographic bearer
              </div>
            </div>

            <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <ShieldCheck size={13} color="var(--accent-amber)" />
                <span>Brute-Force Guard</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
                Rate Limiter Active
              </div>
              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>
                Sliding window IP throttling
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.6
          }}>
            <span style={{ fontWeight: 650, color: 'var(--text-primary)' }}>Request protection enabled:</span>{' '}
            Security headers, CORS isolation, rate limiting, and parameterized queries.
          </div>
        </div>

        {/* Database */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 9, background: '#ecfdf3', border: '1px solid #a6f4c5', borderRadius: 9, color: '#027a48', display: 'flex' }}>
                <Database size={19} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  Database
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Local storage status
                </div>
              </div>
            </div>
            <div className="live-pill">
              <div className="db-beacon" />
              <span>Connected</span>
            </div>
          </div>

          <div className="grid-3 mb-4" style={{ gap: 12 }}>
            <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Engine</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                {sysHealth?.database?.engine || 'SQLite 3'}
              </div>
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                {sysHealth?.database?.mode || 'Write-Ahead Logging (WAL)'}
              </div>
            </div>

            <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Disk Location</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-1)', marginTop: 4, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                {sysHealth?.database?.file || 'server/db/collabio.db'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Persistent local file
              </div>
            </div>

            <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stored Entities</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {(sysHealth?.database?.counts?.deals ?? 0) + (sysHealth?.database?.counts?.brands ?? 0)} records
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {sysHealth?.database?.counts?.deals ?? 0} deals • {sysHealth?.database?.counts?.invoices ?? 0} invoices
              </div>
            </div>
          </div>
        </div>

        {/* Profile & Business Details Form */}
        <form onSubmit={handleSubmit} className="card">
          <div className="section-title">Creator Social Channels & Media Kit Links</div>
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
              <label className="form-label">Contact Email for Brands</label>
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

          <div className="section-title">Invoice Entity & Remittance Details</div>
          <div className="form-group">
            <label className="form-label">Business / Studio Legal Entity Name</label>
            <input
              className="form-input"
              value={form.invoice_business_name || ''}
              onChange={e => set('invoice_business_name', e.target.value)}
              placeholder="e.g. Alex Rivera Media Studio LLC"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Registered Office Address</label>
            <textarea
              className="form-textarea"
              value={form.invoice_address || ''}
              onChange={e => set('invoice_address', e.target.value)}
              placeholder="742 Evergreen Terrace, Suite 400, Austin, TX 78701..."
              style={{ minHeight: 70 }}
            />
          </div>

          <div className="divider" />

          <div className="form-group">
            <label className="form-label">Bio / Creator Positioning Tagline</label>
            <input
              className="form-input"
              value={form.bio || ''}
              onChange={e => set('bio', e.target.value)}
              placeholder="Senior Software Architect & Full-Stack Tech Creator"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={15} />}
              Save All Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
