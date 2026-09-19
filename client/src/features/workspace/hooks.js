/** Global search, activity feed, preferences, templates, communications hooks. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';
import { useAuthStore } from '../../stores/authStore';

export function useGlobalSearch(query, options = {}) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: ({ signal }) => endpoints.search(query, signal),
    enabled: Boolean(query && query.length >= 2),
    staleTime: 10_000,
    ...options,
  });
}

export function useActivity(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.activity(filters),
    queryFn: ({ signal }) => endpoints.activity.list(filters, signal),
    ...options,
  });
}

export function usePreferences(options = {}) {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => endpoints.preferences.get(),
    ...options,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.preferences.update(body),
    onSuccess: (prefs) => {
      queryClient.setQueryData(queryKeys.preferences, prefs);
      const setUser = useAuthStore.getState().setUser;
      // keep local UI copies in sync
      window.dispatchEvent(new CustomEvent('collabio:preferences-updated', { detail: prefs }));
      setUser?.(useAuthStore.getState().user); // no-op refresh
    },
  });
}

export function useTemplates(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: ({ signal }) => endpoints.templates.list(filters, signal),
    ...options,
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => (id ? endpoints.templates.update(id, body) : endpoints.templates.create(body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => endpoints.templates.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useCommunications(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.communications(filters),
    queryFn: ({ signal }) => endpoints.communications.list(filters, signal),
    ...options,
  });
}

export function useLogCommunication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.communications.create(body),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      if (vars?.deal_id) queryClient.invalidateQueries({ queryKey: ['deal', vars.deal_id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
