/** Invoices + payments hooks. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

export function useInvoices(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.invoices(filters),
    queryFn: ({ signal }) => endpoints.invoices.list(filters, signal),
    ...options,
  });
}

export function useInvoice(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: ({ signal }) => endpoints.invoices.get(id, signal),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.invoices.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => endpoints.invoices.update(id, body),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (invoice?.id) queryClient.invalidateQueries({ queryKey: queryKeys.invoice(invoice.id) });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => endpoints.invoices.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useRecordPayment(invoiceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.invoices.addPayment(invoiceId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      if (invoiceId) queryClient.invalidateQueries({ queryKey: queryKeys.invoice(invoiceId) });
    },
  });
}
