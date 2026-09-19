import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Kanban, Building2, BarChart3, LogOut, Briefcase, Users, FileText, StickyNote, Settings, ListChecks, Handshake } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navMain = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
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

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onNavigate?.();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Handshake size={18} strokeWidth={2.25} /></div>
        <div>
          <span className="sidebar-logo-text">Collabio</span>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.02em', fontWeight: 500 }}>
            Creator CRM
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Workspace</div>
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

        <div className="sidebar-section-label">Reports</div>
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
          title="Local SQLite database with write-ahead logging"
        >
          <div className="db-beacon" />
          <span style={{ fontSize: 11.5 }}>Local database</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.9, background: 'rgba(18, 183, 106, 0.15)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            SYNCED
          </span>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{(user?.display_name || user?.username || 'C').charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user?.display_name || user?.username || 'Creator'}</div>
            <div className="user-role">{user?.email || 'Creator account'}</div>
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
