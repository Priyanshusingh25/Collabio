/**
 * Auth context — zustand-backed; keeps the existing useAuth() contract.
 * The persisted token is validated against /auth/me on boot; an offline
 * device trusts its persisted session until connectivity returns.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { queryClient } from '../lib/queryClient';

const API = '/api/v1';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setStatus = useAuthStore((s) => s.setStatus);
  const [loading, setLoading] = useState(Boolean(token));

  // Validate the persisted token once per session.
  useEffect(() => {
    if (!token) {
      if (status !== 'anonymous') setStatus('anonymous');
      setLoading(false);
      return;
    }
    if (user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const payload = await res.json();
        if (cancelled) return;
        if (res.ok && payload?.data) setSession(token, payload.data);
        else clearSession();
      } catch {
        // Offline — trust the persisted session until connectivity returns.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const login = async (email, password) => {
    const { token: t, user: u } = await authApi.login(email, password);
    setSession(t, u);
    queryClient.clear();
    return u;
  };

  const loginAsDemo = async () => {
    const { token: t, user: u } = await authApi.demo();
    setSession(t, u);
    queryClient.clear();
    return u;
  };

  const register = async (username, email, password, display_name) => {
    const { token: t, user: u } = await authApi.register({ username, email, password, display_name });
    setSession(t, u);
    queryClient.clear();
    return u;
  };

  const logout = async () => {
    try {
      // Server-side logout revokes ALL issued tokens (token_version bump).
      await fetch(`${API}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    } finally {
      clearSession();
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginAsDemo, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
