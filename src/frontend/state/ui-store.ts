// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — UI Store (Zustand)
// Sidebar state, loading overlay, global search
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  globalSearchOpen: boolean;
  loadingMessage: string | null;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  setLoading: (message: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  globalSearchOpen: false,
  loadingMessage: null,

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  openGlobalSearch: () =>
    set({ globalSearchOpen: true }),

  closeGlobalSearch: () =>
    set({ globalSearchOpen: false }),

  setLoading: (message) =>
    set({ loadingMessage: message }),
}));
