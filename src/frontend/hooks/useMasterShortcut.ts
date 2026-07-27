import { useEffect } from 'react';
import { useShortcutModalStore, ShortcutMasterType } from '../state/useShortcutModalStore';

export function useMasterShortcut() {
  const openCreate = useShortcutModalStore((s) => s.openCreate);
  const openEdit = useShortcutModalStore((s) => s.openEdit);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl + A or Cmd + A
      const isModifier = e.ctrlKey || e.metaKey;
      if (isModifier && e.key.toLowerCase() === 'a') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (!activeEl) return;

        const type = activeEl.getAttribute('data-shortcut-type') as ShortcutMasterType | null;
        if (!type) return;

        // Prevent default browser Select All behavior
        e.preventDefault();
        e.stopPropagation();

        // Dispatch trigger event to close the dropdown layout instantly
        const triggerEvent = new CustomEvent('shortcut-triggered', { bubbles: true });
        activeEl.dispatchEvent(triggerEvent);
        activeEl.parentElement?.dispatchEvent(triggerEvent);

        const selectId = activeEl.getAttribute('data-select-id');
        const group = activeEl.getAttribute('data-shortcut-group');
        const selectedValue = activeEl.getAttribute('data-selected-value');
        const searchText = activeEl.getAttribute('data-search-text') || '';

        const handleSuccess = (id: number, name: string) => {
          const successEvent = new CustomEvent('shortcut-master-success', {
            detail: { id, name, selectId },
          });
          window.dispatchEvent(successEvent);
        };

        if (selectedValue && selectedValue !== '0' && selectedValue !== '') {
          openEdit(type, Number(selectedValue), handleSuccess);
        } else {
          openCreate(type, searchText, group, handleSuccess);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [openCreate, openEdit]);
}
