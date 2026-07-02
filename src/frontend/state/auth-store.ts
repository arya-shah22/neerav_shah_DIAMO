// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Auth Store (Zustand)
// Global session state with local persistence
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isSuperAdmin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setSession: (user: AuthUser, sessionToken: string) => void;
  clearSession: () => void;
  setHasHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      hasHydrated: false,

      setSession: (user, sessionToken) =>
        set({ user, sessionToken, isAuthenticated: true }),

      clearSession: () =>
        set({ user: null, sessionToken: null, isAuthenticated: false }),

      setHasHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'diamo-auth',
      partialize: (state) => ({
        user: state.user,
        sessionToken: state.sessionToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated();
      },
    },
  ),
);
