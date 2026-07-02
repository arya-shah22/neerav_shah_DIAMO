// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Preload Script (IPC Bridge)
// ═══════════════════════════════════════════════════════════════
// Exposes a secure API to the React renderer via contextBridge.
// The renderer NEVER has direct access to Node.js or Electron APIs.

import { contextBridge, ipcRenderer } from 'electron';

// ─── Exposed API ─────────────────────────────────────────────

contextBridge.exposeInMainWorld('api', {
  /**
   * Invoke an IPC channel and await the response.
   * This is the primary communication method for all CRUD operations.
   */
  invoke: (channel: string, data?: unknown): Promise<unknown> => {
    return ipcRenderer.invoke(channel, data);
  },

  /**
   * Listen for messages from the main process (push notifications).
   */
  on: (channel: string, callback: (...args: unknown[]) => void): void => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      callback(...args);
    };
    ipcRenderer.on(channel, subscription);
  },

  /**
   * Remove a specific listener from a channel.
   */
  removeListener: (channel: string, callback: (...args: unknown[]) => void): void => {
    ipcRenderer.removeListener(channel, callback);
  },

  /**
   * Remove all listeners from a channel.
   */
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// ─── Type Declaration ────────────────────────────────────────
// This type is declared globally so React components can use window.api

export interface IElectronAPI {
  invoke: (channel: string, data?: unknown) => Promise<unknown>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
