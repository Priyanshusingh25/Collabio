import React from 'react';
import { Search, Plus, Menu } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { ConnectionIndicator } from './ConnectionIndicator';

export default function TopHeader({ onOpenCommand, onOpenNewDeal, onOpenMenu }) {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button type="button" className="btn btn-ghost btn-icon menu-btn" onClick={onOpenMenu} aria-label="Open navigation">
          <Menu size={18} />
        </button>
        <button
          type="button"
          className="command-bar-trigger"
          onClick={onOpenCommand}
          title="Search anything or jump to pages (Ctrl+K / ⌘K)"
        >
          <Search size={15} color="var(--text-muted)" />
          <span>Search deals, brands, pages...</span>
          <span className="kbd-shortcut">{isMac ? '⌘K' : 'Ctrl+K'}</span>
        </button>
      </div>

      <div className="top-header-right">
        <ConnectionIndicator />
        <NotificationBell />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onOpenNewDeal}
          style={{ gap: 6 }}
        >
          <Plus size={15} />
          <span className="new-deal-label">New Deal</span>
        </button>
      </div>
    </header>
  );
}
