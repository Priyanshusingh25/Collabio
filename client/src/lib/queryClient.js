/** TanStack Query client — server-state cache, retries, refetch policy. */
import { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  deals: (filters) => ['deals', filters || {}],
  deal: (id) => ['deal', id],
  dealsAll: ['deals', 'all'],
  brands: (filters) => ['brands', filters || {}],
  brand: (id) => ['brand', id],
  contacts: (filters) => ['contacts', filters || {}],
  contact: (id) => ['contact', id],
  invoices: (filters) => ['invoices', filters || {}],
  invoice: (id) => ['invoice', id],
  services: ['services'],
  notes: ['notes'],
  tasks: (filters) => ['tasks', filters || {}],
  templates: ['templates'],
  communications: (filters) => ['communications', filters || {}],
  notifications: (filters) => ['notifications', filters || {}],
  unreadCount: ['notifications', 'unread-count'],
  activity: (filters) => ['activity', filters || {}],
  search: (q) => ['search', q],
  statsOverview: ['stats', 'overview'],
  statsRevenue: ['stats', 'revenue'],
  statsForecast: ['stats', 'forecast'],
  preferences: ['preferences'],
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,            // avoid refetch storms between navigations
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // Never retry client errors (4xx) — only transient failures.
        if (error?.status && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
