import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, LayoutDashboard, Kanban, Building2, BarChart3, Briefcase, 
  Users, FileText, StickyNote, Settings, Plus, ArrowRight, X, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dealsApi, brandsApi, contactsApi, invoicesApi } from '../api';
import { formatCurrency } from '../utils/helpers';

export default function CommandPalette({ isOpen, onClose, onOpenNewDeal }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Cached workspace items for instant search
  const [deals, setDeals] = useState([]);
  const [brands, setBrands] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (isOpen && token) {
      Promise.all([
        dealsApi.getAll(token).catch(() => []),
        brandsApi.getAll(token).catch(() => []),
        contactsApi.getAll(token).catch(() => []),
        invoicesApi.getAll(token).catch(() => [])
      ]).then(([d, b, c, inv]) => {
        setDeals(d || []);
        setBrands(b || []);
        setContacts(c || []);
        setInvoices(inv || []);
      });
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const staticNavActions = [
    { id: 'nav-dash', category: 'Navigation', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/dashboard') },
    { id: 'nav-pipe', category: 'Navigation', label: 'Go to Pipeline', icon: Kanban, action: () => navigate('/pipeline') },
    { id: 'nav-brand', category: 'Navigation', label: 'Go to Brands', icon: Building2, action: () => navigate('/brands') },
    { id: 'nav-analytics', category: 'Navigation', label: 'Go to Analytics', icon: BarChart3, action: () => navigate('/analytics') },
    { id: 'nav-invoices', category: 'Navigation', label: 'Go to Invoices', icon: FileText, action: () => navigate('/invoices') },
    { id: 'nav-contacts', category: 'Navigation', label: 'Go to Contacts', icon: Users, action: () => navigate('/contacts') },
    { id: 'nav-services', category: 'Navigation', label: 'Go to Services', icon: Briefcase, action: () => navigate('/services') },
    { id: 'nav-notes', category: 'Navigation', label: 'Go to Notes', icon: StickyNote, action: () => navigate('/notes') },
    { id: 'nav-settings', category: 'Navigation', label: 'Go to Settings', icon: Settings, action: () => navigate('/settings') },
    { id: 'act-new-deal', category: 'Actions', label: 'Create New Deal', icon: Plus, badge: 'New', action: () => { onClose(); onOpenNewDeal?.(); } },
  ];

  // Filter items
  const q = query.toLowerCase().trim();

  const filteredDeals = deals
    .filter(d => d.brand_name.toLowerCase().includes(q) || d.title.toLowerCase().includes(q))
    .slice(0, 5)
    .map(d => ({
      id: `deal-${d.id}`,
      category: 'Deals',
      label: `${d.brand_name} — ${d.title}`,
      badge: formatCurrency(d.deal_value),
      icon: Kanban,
      action: () => { navigate('/pipeline'); onClose(); }
    }));

  const filteredBrands = brands
    .filter(b => b.name.toLowerCase().includes(q) || (b.industry && b.industry.toLowerCase().includes(q)))
    .slice(0, 4)
    .map(b => ({
      id: `brand-${b.id}`,
      category: 'Brands',
      label: b.name,
      badge: b.industry || 'Brand',
      icon: Building2,
      action: () => { navigate('/brands'); onClose(); }
    }));

  const filteredContacts = contacts
    .filter(c => c.name.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q)))
    .slice(0, 3)
    .map(c => ({
      id: `contact-${c.id}`,
      category: 'Contacts',
      label: `${c.name} (${c.company || 'Contact'})`,
      badge: c.email,
      icon: Users,
      action: () => { navigate('/contacts'); onClose(); }
    }));

  const filteredNav = staticNavActions.filter(a => a.label.toLowerCase().includes(q));

  const allItems = q === ''
    ? filteredNav
    : [...filteredDeals, ...filteredBrands, ...filteredContacts, ...filteredNav];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (allItems.length || 1)) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="command-input-wrap">
          <Search size={18} color="var(--accent-1)" />
          <input
            ref={inputRef}
            className="command-input"
            placeholder="Type a command or search deals, brands, contacts..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <button className="btn-ghost btn-sm btn-icon" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        <div className="command-list">
          {allItems.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No matching results found for "{query}"
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon || ArrowRight;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`command-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => { item.action(); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <Icon size={16} color={isSelected ? 'var(--accent-1)' : 'var(--text-muted)'} />
                  <span style={{ fontWeight: isSelected ? 600 : 500 }}>{item.label}</span>
                  {item.badge && (
                    <span className="command-item-badge">{item.badge}</span>
                  )}
                  {isSelected && <ArrowRight size={14} style={{ marginLeft: item.badge ? 8 : 'auto', color: 'var(--accent-1)' }} />}
                </div>
              );
            })
          )}
        </div>

        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 11,
          color: 'var(--text-muted)'
        }}>
          <span><kbd style={{ background: 'var(--color-surface-2)', padding: '2px 5px', borderRadius: 4, border: '1px solid var(--color-border)' }}>↑↓</kbd> to navigate</span>
          <span><kbd style={{ background: 'var(--color-surface-2)', padding: '2px 5px', borderRadius: 4, border: '1px solid var(--color-border)' }}>↵</kbd> to select</span>
          <span><kbd style={{ background: 'var(--color-surface-2)', padding: '2px 5px', borderRadius: 4, border: '1px solid var(--color-border)' }}>Esc</kbd> to exit</span>
        </div>
      </div>
    </div>
  );
}
