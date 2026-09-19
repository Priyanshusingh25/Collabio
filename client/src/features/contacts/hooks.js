/** Contacts hooks. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';

export function useContacts(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.contacts(filters),
    queryFn: ({ signal }) => endpoints.contacts.list(filters, signal),
    ...options,
  });
}

export function useContact(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.contact(id),
    queryFn: ({ signal }) => endpoints.contacts.get(id, signal),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => endpoints.contacts.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => endpoints.contacts.update(id, body),
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      if (contact?.id) queryClient.invalidateQueries({ queryKey: queryKeys.contact(contact.id) });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => endpoints.contacts.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });
}
