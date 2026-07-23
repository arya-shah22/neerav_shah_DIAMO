// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Module Action Permissions Zustand Store
// Tracks fine-grained CRUD action access (create, edit, delete, export, print)
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

export type ActionCode = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'print';

export interface ActionPermItem {
  moduleCode: string;
  actionCode: string;
}

interface ModulePermissionsState {
  isSuperAdmin: boolean;
  allowedActions: ActionPermItem[];
  isLoaded: boolean;
  setModulePermissions: (isSuperAdmin: boolean, actions: ActionPermItem[]) => void;
  canDo: (moduleCode: string, actionCode: ActionCode) => boolean;
  reset: () => void;
}

export const useModulePermissions = create<ModulePermissionsState>()((set, get) => ({
  isSuperAdmin: false,
  allowedActions: [],
  isLoaded: false,

  setModulePermissions: (isSuperAdmin, allowedActions) =>
    set({ isSuperAdmin, allowedActions, isLoaded: true }),

  canDo: (moduleCode: string, actionCode: ActionCode) => {
    const state = get();
    // Super Admin bypasses all action restrictions
    if (state.isSuperAdmin) return true;
    if (!state.isLoaded) return true;
    // Default fallback: if no specific action rules configured for this module, allow access
    const moduleRules = state.allowedActions.filter((a) => a.moduleCode === moduleCode);
    if (moduleRules.length === 0) return true;

    return moduleRules.some((a) => a.actionCode === actionCode);
  },

  reset: () => set({ isSuperAdmin: false, allowedActions: [], isLoaded: false }),
}));
