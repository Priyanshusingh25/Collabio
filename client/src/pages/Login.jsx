import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight,
  UserCheck, CheckCircle2, Handshake, FolderKanban, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { user, login, loginAsDemo, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [form, setForm] = useState({
    username: '',
    email: localStorage.getItem('collabio_remembered_email') || '',
    password: '',
    display_name: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password, rememberMe);
        addToast('Welcome back');
      } else {
        await register(form.username, form.email, form.password, form.display_name);
        addToast('Account created successfully');
      }
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await loginAsDemo();
      addToast('Signed in to demo workspace');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message || 'Demo login failed', 'error');
    } finally {
      setDemoLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setForm(p => ({
      ...p,
      email: 'demo@collabio.app',
      password: 'creator123'
    }));
    setMode('login');
    addToast('Demo credentials filled. Select Sign In or Try Demo.', 'info');
  };

  return (
    <div className="auth-page">
      {/* Left Pane: product overview */}
      <div className="auth-hero-pane">
        <div className="auth-hero-badge">
          <Handshake size={13} />
          <span>Creator CRM & Deal Management</span>
        </div>

        <h1 className="auth-hero-headline">
          Manage every brand deal in one place.
        </h1>

        <p className="auth-hero-sub">
          Track pipeline stages, deliverables, invoices, and payments across
          every sponsorship — with clear reporting and reliable local storage.
        </p>

        {/* 3D product preview — layered deal cards */}
        <div className="auth-stage">
          <div className="auth-mock">
            <div className="auth-mock-top">
              <div className="auth-mock-icon" style={{ background: '#eef0ff', color: '#4f46e5' }}>
                <FolderKanban size={18} />
              </div>
              <div>
                <div className="auth-mock-name">Sony Electronics</div>
                <div className="auth-mock-sub">Product review · YouTube · Due Mar 12</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="auth-mock-value">$7,500</div>
              <span className="badge badge-negotiating">Negotiating</span>
            </div>
          </div>

          <div className="auth-mock">
            <div className="auth-mock-top">
              <div className="auth-mock-icon" style={{ background: '#ecfdf3', color: '#027a48' }}>
                <FileText size={18} />
              </div>
              <div>
                <div className="auth-mock-name">Notion</div>
                <div className="auth-mock-sub">Invoice INV-0241 · Net-30 · Paid</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="auth-mock-value">$4,500</div>
              <span className="badge badge-paid">Paid</span>
            </div>
          </div>
        </div>

        {/* Trust points */}
        <div className="auth-proof">
          <div className="auth-proof-item">
            <CheckCircle2 size={15} color="#6ce9a6" />
            <span>Pipeline + invoicing</span>
          </div>
          <div className="auth-proof-item">
            <CheckCircle2 size={15} color="#6ce9a6" />
            <span>Local-first storage</span>
          </div>
          <div className="auth-proof-item">
            <CheckCircle2 size={15} color="#6ce9a6" />
            <span>Role-based access</span>
          </div>
        </div>
      </div>

      {/* Right Pane: sign-in card */}
      <div className="auth-form-pane">
        <div className="auth-card">
          {/* Logo Header */}
          <div style={{ marginBottom: 22 }}>
            <div className="sidebar-logo-icon" style={{ margin: '0 0 12px', width: 36, height: 36 }}>
              <Handshake size={18} strokeWidth={2.25} />
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 750,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)'
            }}>
              {mode === 'login' ? 'Sign in to Collabio' : 'Create your account'}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              Creator deal pipeline, invoicing, and reporting.
            </div>
          </div>

          {/* Demo callout */}
          <div style={{
            marginBottom: 18,
            padding: '14px',
            background: 'var(--color-surface-2)',
            borderRadius: 10,
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}>
                <UserCheck size={13} /> Demo workspace
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>No signup needed</span>
            </div>

            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              style={{
                justifyContent: 'center',
                fontWeight: 650,
                fontSize: 13.5,
                padding: '10px 16px'
              }}
            >
              {demoLoading ? (
                <div className="spinner" style={{ width: 16, height: 16 }} />
              ) : (
                <>
                  <UserCheck size={16} /> Try the demo <ArrowRight size={15} />
                </>
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <span>Sample deals, brands, and invoices</span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-1)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 11.5,
                  fontWeight: 600
                }}
              >
                Fill credentials
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
              or continue with email
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {/* Mode Switch Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--color-surface-2)',
            padding: 3,
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid var(--color-border)'
          }}>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: mode === 'login' ? 'var(--color-surface)' : 'transparent',
                boxShadow: mode === 'login' ? 'var(--shadow-xs)' : 'none',
                border: mode === 'login' ? '1px solid var(--color-border)' : '1px solid transparent',
                transition: 'var(--transition-fast)'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: mode === 'register' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: mode === 'register' ? 'var(--color-surface)' : 'transparent',
                boxShadow: mode === 'register' ? 'var(--shadow-xs)' : 'none',
                border: mode === 'register' ? '1px solid var(--color-border)' : '1px solid transparent',
                transition: 'var(--transition-fast)'
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Alex Rivera"
                    value={form.display_name}
                    onChange={e => set('display_name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    className="form-input"
                    placeholder="creator_handle"
                    value={form.username}
                    onChange={e => set('username', e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                placeholder="alex@creator.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4
                  }}
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--accent-1)', cursor: 'pointer' }}
                  />
                  Remember email
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Local JWT Session</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-secondary w-full"
              style={{
                justifyContent: 'center',
                padding: '10px',
                fontWeight: 600
              }}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" style={{ width: 16, height: 16 }} />
              ) : (
                mode === 'login' ? 'Sign In' : 'Create account'
              )}
            </button>
          </form>

          {/* Storage note */}
          <div style={{
            marginTop: 16,
            padding: '10px 12px',
            background: 'var(--color-surface-2)',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
            color: 'var(--text-secondary)'
          }}>
            <div className="db-beacon" />
            <div style={{ flex: 1 }}>
              Data is stored locally and persists across restarts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
