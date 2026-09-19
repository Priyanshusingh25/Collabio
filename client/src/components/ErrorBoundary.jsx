/** Global error boundary — friendly fallback + retry, no stack leakage. */
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Client-side log only; server already logs structured errors.
    console.error('[ui] render error:', error?.message);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '60vh', gap: 12, textAlign: 'center', padding: 24,
          }}
        >
          <div style={{ fontSize: 40 }} aria-hidden="true">🛠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 420 }}>
            The interface hit an unexpected error. Your data is safe — try again, or reload the page.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>Try again</button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
