/** Brands CRM hooks. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

export function useBrands(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands(filters),
    queryFn: ({ signal }) => endpoints.brands.list(filters, signal),
    ...options,
  });
}

export function useBrand(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.brand(id),
    queryFn: ({ signal }) => endpoints.brands.get(id, signal),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.brands.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => endpoints.brands.update(id, body),
    onSuccess: (brand) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      if (brand?.id) queryClient.invalidateQueries({ queryKey: queryKeys.brand(brand.id) });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => endpoints.brands.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
  });
}
