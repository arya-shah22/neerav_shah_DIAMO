import { create } from 'zustand';

export type ShortcutMasterType = 'account' | 'quality' | 'account-group';

interface ShortcutModalState {
  isOpen: boolean;
  type: ShortcutMasterType | null;
  groupFilter: string | null;
  editId: number | null;
  searchVal: string;
  onSuccessCallback: ((id: number, name: string) => void) | null;
  
  openCreate: (
    type: ShortcutMasterType,
    searchVal: string,
    groupFilter?: string | null,
    onSuccess?: (id: number, name: string) => void
  ) => void;
  
  openEdit: (
    type: ShortcutMasterType,
    id: number,
    onSuccess?: (id: number, name: string) => void
  ) => void;
  
  close: () => void;
}

export const useShortcutModalStore = create<ShortcutModalState>((set) => ({
  isOpen: false,
  type: null,
  groupFilter: null,
  editId: null,
  searchVal: '',
  onSuccessCallback: null,

  openCreate: (type, searchVal, groupFilter = null, onSuccess) =>
    set({
      isOpen: true,
      type,
      searchVal,
      groupFilter,
      editId: null,
      onSuccessCallback: onSuccess || null,
    }),

  openEdit: (type, id, onSuccess) =>
    set({
      isOpen: true,
      type,
      editId: id,
      groupFilter: null,
      searchVal: '',
      onSuccessCallback: onSuccess || null,
    }),

  close: () =>
    set({
      isOpen: false,
      type: null,
      groupFilter: null,
      editId: null,
      searchVal: '',
      onSuccessCallback: null,
    }),
}));
