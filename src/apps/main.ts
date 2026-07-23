// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Electron Main Process
// ═══════════════════════════════════════════════════════════════

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc-handlers';

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production';
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1366,
    minHeight: 768,
    title: 'DIAMO ERP',
    icon: path.join(__dirname, '../../resources/icons/icon.png'),
    show: false, // Show after ready-to-show to prevent flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Show window when ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

import { bootstrapNestApp } from '../backend/main';
import { INestApplicationContext } from '@nestjs/common';
import { BackupService } from '../backend/modules/backup/backup.service';
import { CompanyController } from '../backend/modules/company/company.controller';

export let nestApp: INestApplicationContext | null = null;

async function runStartupBackupChecks(nestContext: INestApplicationContext) {
  try {
    const backupService = nestContext.get(BackupService);
    const companyController = nestContext.get(CompanyController);
    const companiesRes = await companyController.handleList();

    if (companiesRes && companiesRes.success && Array.isArray(companiesRes.data)) {
      let startupBackupTriggered = false;
      for (const company of companiesRes.data) {
        const companyId = company.id;
        const settings = await backupService.getSettings(companyId);
        if (!settings.backupEnabled) continue;

        // Start snapshot: Trigger ONLY ONCE for the entire application startup
        if ((settings.backupMode === 'START_END' || settings.backupMode === 'BOTH') && !startupBackupTriggered) {
          console.log(`[Backup] Running automated startup backup...`);
          await backupService.createBackup(companyId, 'AUTO', 'Automatic startup database snapshot');
          startupBackupTriggered = true;
          mainWindow?.webContents.send('backup:completed');
        }

        // Missed schedule catch-up run check: only if mode is SCHEDULE or BOTH
        if (settings.backupMode === 'SCHEDULE' || settings.backupMode === 'BOTH') {
          if (settings.frequency === 'NONE') continue;
          const history = await backupService.getBackupHistory(companyId);
          const lastBackup = history.find(h => h.backupType === 'AUTO' || h.backupType === 'SCHEDULED');
          
          let shouldBackup = false;
          const now = new Date();

          if (!lastBackup) {
            shouldBackup = true;
          } else {
            const lastDate = new Date(lastBackup.createdAt);
            const diffMs = now.getTime() - lastDate.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (settings.frequency === 'DAILY' && diffDays >= 1) {
              shouldBackup = true;
            } else if (settings.frequency === 'WEEKLY' && diffDays >= 7) {
              shouldBackup = true;
            } else if (settings.frequency === 'MONTHLY' && diffDays >= 30) {
              shouldBackup = true;
            }
          }

          if (shouldBackup) {
            console.log(`[Backup] Missed scheduled backup detected for company ${companyId}. Running catch-up...`);
            await backupService.createBackup(companyId, 'SCHEDULED', 'Offline scheduled catch-up backup on launch');
            mainWindow?.webContents.send('backup:completed');
          }
        }
      }
    }
  } catch (err) {
    console.error(`[Backup] Startup check failed: ${(err as Error).message}`);
  }
}

async function runActiveScheduledBackupChecks(nestContext: INestApplicationContext) {
  try {
    const backupService = nestContext.get(BackupService);
    const companyController = nestContext.get(CompanyController);
    const companiesRes = await companyController.handleList();

    if (companiesRes && companiesRes.success && Array.isArray(companiesRes.data)) {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      let scheduledBackupTriggered = false;
      for (const company of companiesRes.data) {
        const companyId = company.id;
        const settings = await backupService.getSettings(companyId);
        if (!settings.backupEnabled) continue;

        // Schedule check: only if mode is SCHEDULE or BOTH
        if (settings.backupMode !== 'SCHEDULE' && settings.backupMode !== 'BOTH') continue;
        if (settings.frequency === 'NONE') continue;

        // Check if current time matches scheduled time
        if (settings.executionTime === currentTimeStr && !scheduledBackupTriggered) {
          const history = await backupService.getBackupHistory(companyId);
          
          // Check if backup was already triggered in the last 10 minutes to prevent double-firing in the same minute
          const recentBackup = history.find(h => {
            const timeDiffMs = now.getTime() - new Date(h.createdAt).getTime();
            return timeDiffMs < 10 * 60 * 1000 && (h.backupType === 'SCHEDULED' || h.backupType === 'AUTO');
          });

          if (!recentBackup) {
            console.log(`[Backup] Running automated background scheduled backup...`);
            await backupService.createBackup(companyId, 'SCHEDULED', 'Automated background scheduled backup');
            scheduledBackupTriggered = true;
            mainWindow?.webContents.send('backup:completed');
          }
        }
      }
    }
  } catch (err) {
    console.error(`[Backup] Active background check failed: ${(err as Error).message}`);
  }
}

app.whenReady().then(async () => {
  // Initialize NestJS backend modules context
  nestApp = await bootstrapNestApp();

  // Register all IPC handlers before creating window
  registerIpcHandlers(ipcMain, nestApp);

  createWindow();

  // Run startup catch-up checks 10 seconds after launching to keep load times fast
  setTimeout(() => {
    if (nestApp) {
      runStartupBackupChecks(nestApp);
    }
  }, 10000);

  // Check scheduled clock backup targets every 60 seconds
  setInterval(() => {
    if (nestApp) {
      runActiveScheduledBackupChecks(nestApp);
    }
  }, 60000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Hook app exit to run quick database snapshot before quitting
app.on('before-quit', async () => {
  if (nestApp) {
    try {
      const backupService = nestApp.get(BackupService);
      const companyController = nestApp.get(CompanyController);
      const companiesRes = await companyController.handleList();

      if (companiesRes && companiesRes.success && Array.isArray(companiesRes.data)) {
        let exitBackupTriggered = false;
        for (const company of companiesRes.data) {
          const settings = await backupService.getSettings(company.id);
          if (settings.backupEnabled && (settings.backupMode === 'START_END' || settings.backupMode === 'BOTH' || settings.backupOnExit) && !exitBackupTriggered) {
            console.log(`[Backup] Running exit backup...`);
            await backupService.createBackup(company.id, 'AUTO', 'Automatic exit database snapshot');
            exitBackupTriggered = true;
          }
        }
      }
    } catch (err) {
      console.error(`[Backup] Exit backup failed: ${(err as Error).message}`);
    }
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
