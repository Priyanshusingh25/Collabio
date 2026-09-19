/** Shared loading states used by the router shell and by lazily-loaded pages. */
import React from 'react';
import { Handshake, AlertCircle, Inbox } from 'lucide-react';

export function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div className="spinner" style={{ width: 28, height: 28 }} aria-label="Loading" role="status" />
    </div>
  );
}

export function BootSplash() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--accent-1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: 'var(--shadow-md)' }} aria-hidden="true"><Handshake size={22} /></div>
        <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }} role="status" aria-label="Loading application" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" style={{ marginBottom: 10 }} />
      ))}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="empty-state" role="alert">
      <div style={{ color: 'var(--text-muted)' }} aria-hidden="true"><AlertCircle size={30} /></div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      <div style={{ color: 'var(--text-muted)' }} aria-hidden="true"><Inbox size={30} /></div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
