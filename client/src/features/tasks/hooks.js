/** Tasks & follow-ups hooks. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

export function useTasks(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.tasks(filters),
    queryFn: ({ signal }) => endpoints.tasks.list(filters, signal),
    ...options,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.tasks.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => endpoints.tasks.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useSetTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => endpoints.tasks.setStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['tasks'] });
      for (const [key, data] of snapshots) {
        if (!Array.isArray(data)) continue;
        queryClient.setQueryData(key, data.map((t) => (t.id === id
          ? { ...t, status, completed_at: status === 'completed' ? new Date().toISOString() : null }
          : t)));
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.snapshots || []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => endpoints.tasks.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
