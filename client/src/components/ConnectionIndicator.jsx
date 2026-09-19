/** Connection indicator: ● Live / ● Reconnecting / ● Offline + offline banner. */
import React from 'react';
import { useRealtimeStatus, useOnlineStatus } from '../hooks/useRealtime';

const LABELS = {
  live: { text: 'Live', color: '#22c55e' },
  reconnecting: { text: 'Reconnecting…', color: '#f59e0b' },
  offline: { text: 'Offline', color: '#6b7280' },
};

export function ConnectionIndicator() {
  const status = useRealtimeStatus();
  const meta = LABELS[status] || LABELS.offline;
  return (
    <div className="live-pill" role="status" aria-label={`Realtime connection: ${meta.text}`} title={`Realtime connection: ${meta.text}`}>
      <span
        className="db-beacon"
        style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
      />
      <span>{meta.text}</span>
    </div>
  );
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="alert"
      style={{
        background: 'rgba(245, 158, 11, 0.12)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.35)',
        color: '#fbbf24',
        fontSize: 12.5,
        padding: '8px 16px',
        textAlign: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 60,
      }}
    >
      You're offline. Showing cached data — changes will sync when the connection is restored.
    </div>
  );
}
