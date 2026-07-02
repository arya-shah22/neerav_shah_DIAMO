// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — IPC Handler Registration
// ═══════════════════════════════════════════════════════════════
// Central registry for all IPC channel handlers.
// Each module registers its handlers here.

import { IpcMain } from 'electron';

/**
 * Register all IPC handlers.
 * Called once from main.ts on app ready.
 *
 * As modules are built (Stage 1+), their handlers will be
 * imported and registered here.
 */
export function registerIpcHandlers(ipcMain: IpcMain): void {
  // ─── System ──────────────────────────────────────────────
  ipcMain.handle('system:ping', async () => {
    return { success: true, message: 'DIAMO ERP is running', timestamp: new Date().toISOString() };
  });

  ipcMain.handle('system:version', async () => {
    return {
      app: '1.0.0',
      node: process.versions.node,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
    };
  });

  // ─── Stage 1: Auth handlers will be registered here ──────
  // registerAuthHandlers(ipcMain);

  // ─── Stage 1: Company handlers will be registered here ───
  // registerCompanyHandlers(ipcMain);

  // ─── Stage 2: Master handlers will be registered here ────
  // registerAccountGroupHandlers(ipcMain);
  // registerAccountHandlers(ipcMain);
  // registerQualityHandlers(ipcMain);
}
