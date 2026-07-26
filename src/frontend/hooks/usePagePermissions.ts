// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Page Permissions Zustand Store
// Tracks which pages the current user can access
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

interface PagePermissionsState {
  isSuperAdmin: boolean;
  allowedPages: string[];
  isLoaded: boolean;
  setPermissions: (isSuperAdmin: boolean, allowedPages: string[]) => void;
  canAccess: (pageUri: string) => boolean;
  reset: () => void;
}

export const usePagePermissions = create<PagePermissionsState>()((set, get) => ({
  isSuperAdmin: false,
  allowedPages: [],
  isLoaded: false,

  setPermissions: (isSuperAdmin, allowedPages) =>
    set({ isSuperAdmin, allowedPages, isLoaded: true }),

  canAccess: (pageUri: string) => {
    const state = get();
    // Super Admin bypasses all page restrictions
    if (state.isSuperAdmin) return true;
    // If permissions haven't loaded yet, allow transient check
    if (!state.isLoaded) return true;
    // If user is not super admin and has 0 allowed pages, deny access
    if (state.allowedPages.length === 0) return false;
    // Check if the requested page URI matches any allowed page
    return state.allowedPages.some((allowed) =>
      pageUri === allowed || pageUri.startsWith(allowed + '/')
    );
  },

  reset: () => set({ isSuperAdmin: false, allowedPages: [], isLoaded: false }),
}));
