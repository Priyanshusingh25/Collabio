import React from 'react';
import { Search, Plus, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopHeader({ onOpenCommand, onOpenNewDeal }) {
  const { user } = useAuth();
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button
          type="button"
          className="command-bar-trigger"
          onClick={onOpenCommand}
          title="Search anything or jump to pages (Ctrl+K / ⌘K)"
        >
          <Search size={15} color="var(--accent-1)" />
          <span>Search deals, brands, jump anywhere...</span>
          <span className="kbd-shortcut">{isMac ? '⌘K' : 'Ctrl+K'}</span>
        </button>
      </div>

      <div className="top-header-right">
        {/* Live system state beacon */}
        <div className="live-pill" title="Real-time SQLite WAL persistent engine">
          <div className="db-beacon" />
          <span>Creator Mode • Live</span>
        </div>

        {/* Quick action button */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onOpenNewDeal}
          style={{ gap: 6 }}
        >
          <Plus size={15} />
          <span>New Deal</span>
        </button>
      </div>
    </header>
  );
}
