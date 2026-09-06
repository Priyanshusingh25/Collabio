import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import CommandPalette from './components/CommandPalette';
import NewDealModal from './components/NewDealModal';
import { brandsApi } from './api';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Brands from './pages/Brands';
import Analytics from './pages/Analytics';
import Services from './pages/Services';
import Contacts from './pages/Contacts';
import Invoices from './pages/Invoices';
import Notes from './pages/Notes';
import Settings from './pages/Settings';

function ProtectedLayout({ children }) {
  const { user, loading, token } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [brands, setBrands] = useState([]);

  // Load brands for global deal modal
  useEffect(() => {
    if (token && newDealOpen && brands.length === 0) {
      brandsApi.getAll(token).then(b => setBrands(b)).catch(() => {});
    }
  }, [token, newDealOpen, brands.length]);

  // Global keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader
          onOpenCommand={() => setCommandOpen(true)}
          onOpenNewDeal={() => setNewDealOpen(true)}
        />
        <main className="main-content">{children}</main>
      </div>

      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        onOpenNewDeal={() => setNewDealOpen(true)}
      />

      {newDealOpen && (
        <NewDealModal
          brands={brands}
          onClose={() => setNewDealOpen(false)}
          onCreated={(deal) => {
            setNewDealOpen(false);
            addToast(`Deal "${deal.title}" created!`);
            navigate('/pipeline');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/pipeline" element={<ProtectedLayout><Pipeline /></ProtectedLayout>} />
            <Route path="/brands" element={<ProtectedLayout><Brands /></ProtectedLayout>} />
            <Route path="/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />
            <Route path="/services" element={<ProtectedLayout><Services /></ProtectedLayout>} />
            <Route path="/contacts" element={<ProtectedLayout><Contacts /></ProtectedLayout>} />
            <Route path="/invoices" element={<ProtectedLayout><Invoices /></ProtectedLayout>} />
            <Route path="/notes" element={<ProtectedLayout><Notes /></ProtectedLayout>} />
            <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
