// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — IPC Handler Registration
// ═══════════════════════════════════════════════════════════════
// Central registry for all IPC channel handlers.
// Each module registers its handlers here.

import { IpcMain } from 'electron';
import { INestApplicationContext } from '@nestjs/common';
import { AuthController } from '../backend/modules/auth/auth.controller';

/**
 * Register all IPC handlers.
 * Called once from main.ts on app ready.
 */
export function registerIpcHandlers(ipcMain: IpcMain, nestApp: INestApplicationContext): void {
  // Resolve controllers once at registration time
  const authController = nestApp.get(AuthController);

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

  // ─── Stage 1: Auth handlers ──────────────────────────────
  ipcMain.handle('auth:login', async (_, payload) => {
    return authController.handleLogin(payload);
  });

  ipcMain.handle('auth:logout', async (_, payload) => {
    return authController.handleLogout(payload);
  });

  // ─── Stage 1: Company handlers will be registered here ───
  // registerCompanyHandlers(ipcMain);

  // ─── Stage 2: Master handlers will be registered here ────
  // registerAccountGroupHandlers(ipcMain);
  // registerAccountHandlers(ipcMain);
  // registerQualityHandlers(ipcMain);
}
