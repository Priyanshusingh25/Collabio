import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import CommandPalette from './components/CommandPalette';
import NewDealModal from './components/NewDealModal';
import ErrorBoundary from './components/ErrorBoundary';
import { OfflineBanner } from './components/ConnectionIndicator';
import { queryClient } from './lib/queryClient';
import { startRealtime } from './lib/realtime';
import { useRealtimeCacheSync } from './hooks/useRealtime';
import { useUiStore } from './stores/uiStore';
import { PageFallback, BootSplash } from './components/States';
import { brandsApi } from './api';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Brands = lazy(() => import('./pages/Brands'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Services = lazy(() => import('./pages/Services'));
const Notes = lazy(() => import('./pages/Notes'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Settings = lazy(() => import('./pages/Settings'));

function go(navigate, path) {
  navigate(path);
  useUiStore.getState().closeAll();
}

function ProtectedLayout({ children }) {
  const { user, loading, token } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);

  const commandOpen = useUiStore((s) => s.commandOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const newDealOpen = useUiStore((s) => s.newDealOpen);
  const setNewDealOpen = useUiStore((s) => s.setNewDealOpen);
  const mobileDrawerOpen = useUiStore((s) => s.mobileDrawerOpen);
  const setMobileDrawer = useUiStore((s) => s.setMobileDrawer);

  useRealtimeCacheSync();

  useEffect(() => {
    if (token && newDealOpen && brands.length === 0) {
      brandsApi.getAll(token).then((b) => setBrands(b || [])).catch(() => {});
    }
  }, [token, newDealOpen, brands.length]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandOpen(!useUiStore.getState().commandOpen);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = (e.key || '').toLowerCase();
      if (k === 'n') { e.preventDefault(); setNewDealOpen(true); }
      else if (k === 'd') go(navigate, '/dashboard');
      else if (k === 'b') go(navigate, '/brands');
      else if (k === 'i') go(navigate, '/invoices');
      else if (k === 't') go(navigate, '/tasks');
      else if (k === 'escape') useUiStore.getState().closeAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, setCommandOpen, setNewDealOpen]);

  if (loading) return <BootSplash />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <Sidebar />
      {mobileDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setMobileDrawer(false)} role="presentation">
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Navigation">
            <Sidebar onNavigate={() => setMobileDrawer(false)} />
          </div>
        </div>
      )}
      <div className="main-wrapper">
        <TopHeader
          onOpenCommand={() => setCommandOpen(true)}
          onOpenNewDeal={() => setNewDealOpen(true)}
          onOpenMenu={() => setMobileDrawer(true)}
        />
        <main className="main-content">
          <Suspense fallback={<PageFallback />}>{children}</Suspense>
        </main>
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

function RequireGuest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <BootSplash />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Suspense fallback={<BootSplash />}>{children}</Suspense>;
}

export default function App() {
  useEffect(() => { startRealtime(); }, []);
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <OfflineBanner />
              <Routes>
                <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
                <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
                <Route path="/pipeline" element={<ProtectedLayout><Pipeline /></ProtectedLayout>} />
                <Route path="/brands" element={<ProtectedLayout><Brands /></ProtectedLayout>} />
                <Route path="/contacts" element={<ProtectedLayout><Contacts /></ProtectedLayout>} />
                <Route path="/invoices" element={<ProtectedLayout><Invoices /></ProtectedLayout>} />
                <Route path="/services" element={<ProtectedLayout><Services /></ProtectedLayout>} />
                <Route path="/notes" element={<ProtectedLayout><Notes /></ProtectedLayout>} />
                <Route path="/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />
                <Route path="/tasks" element={<ProtectedLayout><Tasks /></ProtectedLayout>} />
                <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
