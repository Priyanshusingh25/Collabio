import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Kanban, Building2, BarChart3, LogOut, Briefcase, Users, FileText, StickyNote, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navMain = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/brands', label: 'Brands', icon: Building2 },
];

const navBusiness = [
  { to: '/services', label: 'Services', icon: Briefcase },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/invoices', label: 'Invoices', icon: FileText },
];

const navTools = [
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🤝</div>
        <div>
          <span className="sidebar-logo-text">Collabio</span>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent-1)', letterSpacing: '0.05em', fontWeight: 600 }}>
            STUDIO OS
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Command</div>
        {navMain.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        <div className="sidebar-section-label">Business</div>
        {navBusiness.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        <div className="sidebar-section-label">Intelligence</div>
        {navTools.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          className="db-status-pill"
          title="Persistent Local SQLite 3 Database (server/db/collabio.db) in WAL High-Concurrency Mode"
        >
          <div className="db-beacon" />
          <span style={{ fontSize: 11 }}>SQLite 3 WAL Engine</span>
          <span style={{ marginLeft: 'auto', fontSize: 9.5, opacity: 0.85, background: 'rgba(16, 185, 129, 0.2)', padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
            ACTIVE
          </span>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.avatar_emoji || '🎬'}</div>
          <div className="user-info">
            <div className="user-name">{user?.display_name || user?.username || 'Creator'}</div>
            <div className="user-role">Creator Pro</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-icon"
            title="Sign Out"
            style={{ padding: '6px' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
