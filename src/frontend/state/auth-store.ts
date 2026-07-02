// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Auth Store (Zustand)
// Phase 17.2 §8: Global state for session
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isSuperAdmin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: true }),

  clearUser: () =>
    set({ user: null, isAuthenticated: false }),
}));
