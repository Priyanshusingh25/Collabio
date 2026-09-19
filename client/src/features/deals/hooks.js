/** Deals — server-state hooks with optimistic stage moves. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

export function useDeals(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.deals(filters),
    queryFn: ({ signal }) => endpoints.deals.list(filters, signal),
    ...options,
  });
}

export function useDeal(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.deal(id),
    queryFn: ({ signal }) => endpoints.deals.get(id, signal),
    enabled: Boolean(id),
    ...options,
  });
}

export function useDealTimeline(id) {
  return useQuery({
    queryKey: ['deal', id, 'timeline'],
    queryFn: () => endpoints.deals.timeline(id),
    enabled: Boolean(id),
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.deals.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => endpoints.deals.update(id, body),
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      if (deal?.id) queryClient.setQueryData(queryKeys.deal(deal.id), (old) => ({ ...(old || {}), ...deal }));
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

/** Optimistic stage move (Kanban drag/drop): UI updates instantly, server
 *  validates the transition and rolls the card back on rejection. */
export function useMoveDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, position }) => endpoints.deals.move(id, { status, position }),
    onMutate: async ({ id, status, position }) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['deals'] });
      for (const [key, data] of snapshots) {
        if (!Array.isArray(data)) continue;
        queryClient.setQueryData(key, data.map((d) => (d.id === id ? { ...d, status, position: position ?? d.position } : d)));
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.snapshots || []) queryClient.setQueryData(key, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => endpoints.deals.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['deals'] });
      for (const [key, data] of snapshots) {
        if (!Array.isArray(data)) continue;
        queryClient.setQueryData(key, data.filter((d) => d.id !== id));
      }
      return { snapshots };
    },
    onError: (_err, _id, context) => {
      for (const [key, data] of context?.snapshots || []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useAddDealNote(dealId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content) => endpoints.deals.addNote(dealId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.deal(dealId) }),
  });
}

export function useDeleteDealNote(dealId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId) => endpoints.deals.deleteNote(dealId, noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.deal(dealId) }),
  });
}
