// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — IPC Communication Hook
// Typed wrapper around window.api.invoke()
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';

interface IpcResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface UseIpcReturn<T> extends IpcResult<T> {
  invoke: (payload?: unknown) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for making IPC calls to the NestJS backend.
 *
 * @example
 * const { data, loading, invoke } = useIpc<Company[]>('company:list');
 * useEffect(() => { invoke(); }, []);
 */
export function useIpc<T = unknown>(channel: string): UseIpcReturn<T> {
  const [state, setState] = useState<IpcResult<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const invoke = useCallback(async (payload?: unknown): Promise<T | null> => {
    setState({ data: null, error: null, loading: true });

    try {
      const result = await window.api.invoke(channel, payload);
      const data = result as T;
      setState({ data, error: null, loading: false });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setState({ data: null, error: message, loading: false });
      return null;
    }
  }, [channel]);

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return { ...state, invoke, reset };
}
