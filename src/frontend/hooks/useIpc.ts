// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — IPC Communication Hooks
// Typed wrappers around window.api.invoke()
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import type { IApiResponse } from '../../shared/types/common.types';
import { invokeIpc } from '../../shared/utils/ipc';
import { formatDisplayError } from '../../shared/utils/display-error';

interface UseIpcReturn<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  invoke: (payload?: unknown) => Promise<IApiResponse<T>>;
  reset: () => void;
}

/**
 * Hook for making IPC calls that return IApiResponse<T>.
 *
 * @example
 * const { data, loading, invoke } = useIpc<ICompany[]>('company:list');
 * useEffect(() => { invoke().then(res => { if (res.success) ... }); }, []);
 */
export function useIpc<T = unknown>(channel: string): UseIpcReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const invoke = useCallback(
    async (payload?: unknown): Promise<IApiResponse<T>> => {
      setLoading(true);
      setError(null);

      try {
        const response = await invokeIpc<T>(channel, payload);
        if (response.success && response.data !== undefined) {
          setData(response.data);
          setError(null);
        } else if (!response.success) {
          setData(null);
          setError(formatDisplayError(response.error, 'Request failed'));
        }
        setLoading(false);
        return response.success
          ? response
          : { ...response, error: formatDisplayError(response.error, 'Request failed') };
      } catch (err) {
        const message = formatDisplayError(
          err instanceof Error ? err.message : 'An unexpected error occurred',
          'An unexpected error occurred',
        );
        // Electron IPC clone failures surface as generic handler errors
        const friendly = message.includes('could not be cloned')
          ? 'Saved successfully, but the response could not be displayed. Please refresh the list.'
          : message;
        setData(null);
        setError(friendly);
        setLoading(false);
        return { success: false, error: friendly };
      }
    },
    [channel],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, invoke, reset };
}
