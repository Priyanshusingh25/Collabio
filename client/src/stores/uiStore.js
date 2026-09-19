/** UI client-state: sidebar, modals, command palette, theme, density, pipeline view. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUiStore = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      mobileDrawerOpen: false,
      commandOpen: false,
      newDealOpen: false,
      notificationsOpen: false,
      theme: 'dark',
      density: 'comfortable',
      pipelineView: 'kanban',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setMobileDrawer: (open) => set({ mobileDrawerOpen: open }),
      setCommandOpen: (open) => set({ commandOpen: open }),
      setNewDealOpen: (open) => set({ newDealOpen: open }),
      setNotificationsOpen: (open) => set({ notificationsOpen: open }),
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setPipelineView: (pipelineView) => set({ pipelineView }),
      closeAll: () => set({ commandOpen: false, newDealOpen: false, notificationsOpen: false, mobileDrawerOpen: false }),
    }),
    {
      name: 'collabio-ui',
      partialize: (s) => ({ theme: s.theme, density: s.density, pipelineView: s.pipelineView, sidebarOpen: s.sidebarOpen }),
    }
  )
);
