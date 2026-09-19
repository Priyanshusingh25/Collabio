/**
 * Global toast system: success / error / warning / info / loading,
 * duplicate-suppression, ARIA live region, auto-dismiss.
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info, loading: Loader2 };
const DURATION = { success: 3500, error: 6000, warning: 6000, info: 4500, loading: 0 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const activeRef = useRef(new Map()); // message -> id (duplicate suppression)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', { duration } = {}) => {
    // Suppress identical toasts fired within a short window (double-clicks,
    // retry storms, duplicated realtime events).
    const active = activeRef.current;
    if (active.has(message) && type !== 'loading') {
      return active.get(message);
    }
    idRef.current += 1;
    const id = idRef.current;
    const ttl = duration ?? DURATION[type] ?? 4000;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    active.set(message, id);
    if (ttl > 0) {
      setTimeout(() => {
        dismiss(id);
        if (active.get(message) === id) active.delete(message);
      }, ttl);
    }
    return id;
  }, [dismiss]);

  const updateToast = useCallback((id, message, type = 'loading') => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, message, type } : t)));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, updateToast, dismiss }}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            onClick={() => dismiss(t.id)}
            style={{ cursor: 'pointer' }}
          >
            <span aria-hidden="true" style={{ display: 'flex', color: t.type === 'error' ? '#f97066' : t.type === 'success' ? '#6ce9a6' : '#98a2b3' }}><Icon size={16} /></span>
            <span>{t.message}</span>
          </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
