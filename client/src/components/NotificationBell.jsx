/** Notification bell — unread count, dropdown feed, mark read/all. */
import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, FileText, Handshake, ListChecks, CircleDot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '../features/notifications/hooks';
import { useUiStore } from '../stores/uiStore';
import { formatDistance } from '../utils/helpers';

const CATEGORY_ICONS = {
  deal: Handshake, invoice: FileText, payment: FileText, task: ListChecks,
  deadline: CircleDot, follow_up: Bell, system: CircleDot,
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const setNotificationsOpen = useUiStore((s) => s.setNotificationsOpen);

  const { data: unread } = useUnreadCount();
  const { data: notifications } = useNotifications({}, { staleTime: 15_000 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const count = unread?.count || 0;
  const items = Array.isArray(notifications) ? notifications.slice(0, 8) : [];

  const openItem = (n) => {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    if (n.entity_type === 'deal' && n.entity_id) navigate('/pipeline');
    else if (n.entity_type === 'invoice' && n.entity_id) navigate('/invoices');
    else if (n.entity_type === 'task' && n.entity_id) navigate('/tasks');
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label={`Notifications${count ? ` (${count} unread)` : ''}`}
        onClick={() => { setOpen((o) => !o); setNotificationsOpen(!open); }}
        style={{ position: 'relative' }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: 2, right: 2, background: '#f43f5e', color: '#fff',
              borderRadius: 999, fontSize: 10, minWidth: 16, height: 16, lineHeight: '16px',
              fontWeight: 700, padding: '0 4px',
            }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, maxWidth: 'calc(100vw - 24px)',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 12, boxShadow: 'var(--shadow-xl)', zIndex: 200, overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => markAllRead.mutate()}
              disabled={count === 0 || markAllRead.isPending}
              title="Mark all read"
            >
              <CheckCheck size={14} /> All read
            </button>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 && (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                You're all caught up.
              </div>
            )}
            {items.map((n) => {
              const CatIcon = CATEGORY_ICONS[n.category] || Bell;
              return (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: n.is_read ? 'transparent' : 'var(--accent-1-soft)',
                  border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', color: 'inherit',
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: n.is_read ? 500 : 650, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-primary)' }}>
                  <span aria-hidden="true" style={{ color: 'var(--text-muted)', display: 'flex' }}><CatIcon size={14} /></span> {n.title}
                </div>
                {n.message && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>}
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>{formatDistance(n.created_at)}</div>
              </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
