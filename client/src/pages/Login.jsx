import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, Database, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
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
      addToast('Logged in as Alex Rivera (Demo Creator) 🎬');
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
    addToast('Demo credentials filled! Click Sign In or 1-Click Demo.', 'info');
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        {/* Brand Header */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🤝</div>
          <div style={{
            fontSize: 26,
            fontWeight: 800,
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            Collabio
          </div>
          <div className="auth-tagline">Personal deal manager & creator CRM</div>
        </div>

        {/* 1-Click Demo Action Callout */}
        <div style={{
          marginBottom: 20,
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(236, 72, 153, 0.08) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(124, 58, 237, 0.25)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a855f7', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={13} /> Instant Evaluation
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No signup needed</span>
          </div>

          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            style={{
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              padding: '10px 14px',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)'
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
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Pre-loaded with deals, brands & invoices</span>
            <button
              type="button"
              onClick={fillDemoCredentials}
              style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}
            >
              Fill fields
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 18px', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            or use account
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <h1 className="auth-title" style={{ fontSize: 20, marginBottom: 14 }}>
          {mode === 'login' ? 'Sign In to Workspace' : 'Create Creator Account'}
        </h1>

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
                  placeholder="creator_username"
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
              placeholder="you@creators.com"
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -4, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                />
                Remember email
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Local JWT session</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', marginTop: 4, height: 42 }}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              mode === 'login' ? '🚀 Sign In' : '✨ Create Permanent Account'
            )}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <a onClick={() => setMode('register')}>Sign up</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode('login')}>Sign in</a></>
          )}
        </div>

        {/* Database & Persistence Status Badge */}
        <div style={{
          marginTop: 22,
          padding: '10px 12px',
          background: 'var(--color-surface-2)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 11,
          color: 'var(--text-secondary)',
          textAlign: 'left'
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
          }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Persistent SQLite 3 Engine:</span>{' '}
            All logins & deals are saved locally to disk at <code style={{ fontSize: 10, color: '#a855f7' }}>server/db/collabio.db</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
