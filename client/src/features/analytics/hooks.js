/** Analytics hooks — real database-driven stats, revenue and forecast. */
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

export function useDashboardStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.statsOverview,
    queryFn: ({ signal }) => endpoints.stats.overview(signal),
    ...options,
  });
}

export function useRevenueAnalytics(options = {}) {
  return useQuery({
    queryKey: queryKeys.statsRevenue,
    queryFn: ({ signal }) => endpoints.stats.revenue(signal),
    ...options,
  });
}

export function useForecast(options = {}) {
  return useQuery({
    queryKey: queryKeys.statsForecast,
    queryFn: ({ signal }) => endpoints.stats.forecast(signal),
    ...options,
  });
}
