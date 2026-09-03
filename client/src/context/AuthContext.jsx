import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API = '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('collabio_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (r.ok) return r.json();
          // Invalidate stale or invalid token
          localStorage.removeItem('collabio_token');
          setToken(null);
          return null;
        })
        .then(u => {
          setUser(u);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email, password, remember = true) => {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Login failed');
    
    localStorage.setItem('collabio_token', data.token);
    if (remember) {
      localStorage.setItem('collabio_remembered_email', email);
    } else {
      localStorage.removeItem('collabio_remembered_email');
    }

    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginAsDemo = useCallback(async () => {
    const r = await fetch(`${API}/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Demo login failed');

    localStorage.setItem('collabio_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, email, password, display_name) => {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, display_name }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Registration failed');

    localStorage.setItem('collabio_token', data.token);
    localStorage.setItem('collabio_remembered_email', email);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('collabio_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginAsDemo, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
