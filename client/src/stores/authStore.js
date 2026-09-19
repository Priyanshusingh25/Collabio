/** Auth state — token + user, persisted to localStorage. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      status: 'idle', // idle | loading | authenticated | anonymous
      setSession: (token, user) => set({ token, user, status: 'authenticated' }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ token: null, user: null, status: 'anonymous' }),
      setStatus: (status) => set({ status }),
    }),
    {
      name: 'collabio-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) state.setStatus('authenticated');
        else state.setStatus('anonymous');
      },
    }
  )
);
