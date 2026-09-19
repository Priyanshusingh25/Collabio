/** Small shared hooks: online status, debounce, realtime query patching. */
import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onRealtimeEvent, onRealtimeStatus } from '../lib/realtime';
import { queryKeys } from '../lib/queryClient';

/** True when the browser reports offline. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

/** 'live' | 'reconnecting' | 'offline' */
export function useRealtimeStatus() {
  const [status, setStatus] = useState('offline');
  useEffect(() => onRealtimeStatus(setStatus), []);
  return status;
}

/** Debounce any fast-changing value (search inputs). */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Patch the TanStack cache from realtime events so every open view updates
 * without a refetch storm; falls back to invalidation for complex queries.
 */
export function useRealtimeCacheSync() {
  const queryClient = useQueryClient();
  const ref = useRef(null);
  if (!ref.current) {
    ref.current = onRealtimeEvent((event) => {
      const { type, payload } = event || {};
      if (!payload) return;

      switch (type) {
        case 'deal:created':
        case 'deal:moved':
        case 'deal:updated': {
          if (payload.deal) {
            queryClient.setQueryData(queryKeys.deal(payload.deal.id), (old) =>
              old ? { ...old, ...payload.deal } : old);
          }
          queryClient.invalidateQueries({ queryKey: ['deals'] });
          break;
        }
        case 'deal:deleted': {
          queryClient.invalidateQueries({ queryKey: ['deals'] });
          queryClient.removeQueries({ queryKey: queryKeys.deal(payload.dealId) });
          break;
        }
        case 'invoice:updated':
        case 'payment:recorded': {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['stats'] });
          break;
        }
        case 'task:updated': {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          break;
        }
        case 'brand:updated': {
          queryClient.invalidateQueries({ queryKey: ['brands'] });
          break;
        }
        case 'contact:updated': {
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
          break;
        }
        case 'notification:created': {
          if (payload.notification) {
            queryClient.setQueryData(queryKeys.notifications({}), (old) => {
              if (!old) return old;
              return [payload.notification, ...old];
            });
          }
          queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
          break;
        }
        case 'activity:logged': {
          queryClient.invalidateQueries({ queryKey: ['activity'] });
          break;
        }
        case 'stats:changed': {
          queryClient.invalidateQueries({ queryKey: ['stats'] });
          break;
        }
        default:
          break;
      }
    });
  }
  useEffect(() => () => ref.current?.(), []);
}
