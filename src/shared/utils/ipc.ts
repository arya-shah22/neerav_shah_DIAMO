// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — IPC Utility
// Typed wrapper for Electron IPC invoke calls
// ═══════════════════════════════════════════════════════════════

import type { IApiResponse } from '../types/common.types';

/**
 * Invoke an IPC channel and return a typed API response.
 */
export async function invokeIpc<T = unknown>(
  channel: string,
  payload?: unknown,
): Promise<IApiResponse<T>> {
  const result = await window.api.invoke(channel, payload);
  return result as IApiResponse<T>;
}

/**
 * Unwrap a successful IPC response or throw with the error message.
 */
export async function invokeIpcOrThrow<T = unknown>(
  channel: string,
  payload?: unknown,
): Promise<T> {
  const response = await invokeIpc<T>(channel, payload);
  if (!response.success) {
    throw new Error(response.error || 'Request failed');
  }
  return response.data as T;
}
