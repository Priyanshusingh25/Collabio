import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, EyeOff, Sparkles, Database, ShieldCheck, ArrowRight, 
  UserCheck, CheckCircle2, TrendingUp, Zap, Lock
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
        addToast('Welcome back! 🚀');
      } else {
        await register(form.username, form.email, form.password, form.display_name);
        addToast('Account created successfully! ✨');
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
      addToast('Welcome Alex Rivera (Demo Creator) 🎬');
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
    addToast('Demo credentials loaded! Click Sign In or 1-Click Demo.', 'info');
  };

  return (
    <div className="auth-page">
      {/* Left Pane: Awwwards / Shopify Editions Editorial Showcase */}
      <div className="auth-hero-pane">
        <div className="auth-hero-badge">
          <Sparkles size={13} />
          <span>Award-Grade Creator CRM & Deal Suite</span>
        </div>

        <h1 className="auth-hero-headline">
          The Operating System for Modern Creators.
        </h1>

        <p className="auth-hero-sub">
          Manage brand sponsorships, track multi-stage deal pipelines, send itemized high-ticket invoices, and scale your creative business with developer-grade security.
        </p>

        {/* Floating Preview Cards with Subtle Float Animation */}
        <div style={{ maxWidth: 460 }}>
          <div className="auth-floating-card" style={{ animationDelay: '0s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>
                🎧
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Sony Electronics</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>WH-1000XM6 Headphones Studio Deep Dive</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: '#34d399' }}>$7,500</div>
              <span className="badge badge-negotiating">Negotiating</span>
            </div>
          </div>

          <div className="auth-floating-card" style={{ animationDelay: '-3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>
                ⚡
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Notion AI 2.0</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dedicated Video + Template Share</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: '#34d399' }}>$4,500</div>
              <span className="badge badge-active">Active</span>
            </div>
          </div>
        </div>

        {/* Trust & Architecture Points */}
        <div style={{ display: 'flex', gap: 24, marginTop: 24, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>SQLite WAL Persistence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="#8b5cf6" />
            <span>bcrypt + JWT Security</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={16} color="#f59e0b" />
            <span>Sub-10ms Local Latency</span>
          </div>
        </div>
      </div>

      {/* Right Pane: Glassmorphic Auth Card */}
      <div className="auth-form-pane">
        <div className="auth-card">
          {/* Logo Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="sidebar-logo-icon" style={{ margin: '0 auto 12px', width: 44, height: 44, fontSize: 22 }}>
              🤝
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #ffffff 0%, #d4d8e8 60%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Collabio
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Creator Business & Sponsorship Suite
            </div>
          </div>

          {/* 1-Click Instant Demo Callout with Glowing Aura */}
          <div style={{
            marginBottom: 20,
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.08) 100%)',
            borderRadius: 14,
            border: '1px solid rgba(139, 92, 246, 0.35)',
            boxShadow: '0 0 25px rgba(139, 92, 246, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}>
                <Sparkles size={13} /> Instant Evaluation
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Zero signup required</span>
            </div>

            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              style={{
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13.5,
                padding: '11px 16px',
                borderRadius: 10
              }}
            >
              {demoLoading ? (
                <div className="spinner" style={{ width: 16, height: 16 }} />
              ) : (
                <>
                  <UserCheck size={16} /> 1-Click Demo (Alex Rivera) <ArrowRight size={15} />
                </>
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Pre-populated with 8 deals & 6 brands</span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-1)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                Fill credentials
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              or sign in with password
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {/* Mode Switch Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--color-surface-2)',
            padding: 3,
            borderRadius: 10,
            marginBottom: 16,
            border: '1px solid var(--color-border)'
          }}>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: mode === 'login' ? '#ffffff' : 'var(--text-muted)',
                background: mode === 'login' ? 'var(--color-surface-3)' : 'transparent',
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
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: mode === 'register' ? '#ffffff' : 'var(--text-muted)',
                background: mode === 'register' ? 'var(--color-surface-3)' : 'transparent',
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
                padding: '11px',
                fontWeight: 600,
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" style={{ width: 16, height: 16 }} />
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Creator Account'
              )}
            </button>
          </form>

          {/* SQLite 3 WAL Engine Live Badge */}
          <div style={{
            marginTop: 20,
            padding: '10px 12px',
            background: 'var(--color-surface-2)',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 11,
            color: 'var(--text-secondary)'
          }}>
            <div className="db-beacon" />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Persistent SQLite 3 (WAL):</span>{' '}
              All deals, brands & invoices survive restarts on disk.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
