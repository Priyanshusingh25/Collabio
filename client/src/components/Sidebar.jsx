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
        <span className="sidebar-logo-text">Collabio</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
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

        <div className="sidebar-section-label">Tools</div>
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
          title="Connected to SQLite Local Database (server/db/collabio.db)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 10px',
            marginBottom: 10,
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 8,
            fontSize: 11,
            color: '#10b981',
            cursor: 'default'
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span style={{ fontWeight: 600 }}>SQLite 3 Connected</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.8, background: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: 4 }}>WAL</span>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.avatar_emoji || '🎬'}</div>
          <div className="user-info">
            <div className="user-name">{user?.display_name || user?.username || 'Creator'}</div>
            <div className="user-role">Creator</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-icon"
            title="Logout"
            style={{ padding: '6px', marginLeft: '2px' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
