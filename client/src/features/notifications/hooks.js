/** Notification center hooks. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

export function useNotifications(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.notifications(filters),
    queryFn: ({ signal }) => endpoints.notifications.list(filters, signal),
    ...options,
  });
}

export function useUnreadCount(options = {}) {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => endpoints.notifications.unreadCount(),
    refetchInterval: 60_000,
    ...options,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => endpoints.notifications.markRead(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => endpoints.notifications.markAllRead(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}
