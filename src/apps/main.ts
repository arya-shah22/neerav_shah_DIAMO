// ═══════════════════════════════════════════════════════════════
// CRITICAL: Set DATABASE_URL SYNCHRONOUSLY before any import
// PrismaClient reads process.env.DATABASE_URL at constructor time
// (during module evaluation). If it's not set by then, Prisma throws
// "Environment variable not found: DATABASE_URL" immediately.
// This MUST run before any import that touches @prisma/client.
// ═══════════════════════════════════════════════════════════════
const _fs = require('fs');
const _path = require('path');
const _electron = require('electron');

function _loadDatabaseUrlSync(): string {
  // 1. Prioritize database_config.json if saved
  try {
    const configPath = _path.join(_electron.app.getPath('userData'), 'database_config.json');
    if (_fs.existsSync(configPath)) {
      const config = JSON.parse(_fs.readFileSync(configPath, 'utf-8'));
      if (config.role === 'CLIENT') {
        const userPass = config.dbPass ? `${config.dbUser}:${config.dbPass}` : config.dbUser;
        return `mysql://${userPass}@${config.hostIp}:${config.hostPort}/${config.dbName}`;
      }
      const userPass = config.dbPass ? `${config.dbUser}:${config.dbPass}` : config.dbUser;
      if (process.platform === 'win32') {
        return `mysql://${userPass}@127.0.0.1:${config.hostPort || 3306}/${config.dbName || 'diamo_db'}`;
      }
      return `mysql://${userPass}@localhost/${config.dbName || 'diamo_db'}?socket=/tmp/mysql_diamo.sock`;
    }
  } catch (e) {
    console.error('[Banner] Error loading database_config.json:', e);
  }

  // 2. Fallback to process.env.DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // 3. Hardcoded fallback — safe default for local MySQL
  if (process.platform === 'win32') {
    return 'mysql://root:@127.0.0.1:3306/diamo_db';
  }
  return 'mysql://root:@localhost/diamo_db?socket=/tmp/mysql_diamo.sock';
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = _loadDatabaseUrlSync();
  console.log('[Main] DATABASE_URL set synchronously before module loading');
}

// ─── Now safe to import modules that depend on DATABASE_URL ───
import 'reflect-metadata';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { loadDatabaseConfig, ensureEmbeddedMySQLRunning, getConnectionString, stopEmbeddedMySQL } from './mysql-manager';
import { startHostDiscoveryBeacon, stopLanDiscovery } from './lan-discovery';

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

import { autoUpdater } from 'electron-updater';

// Configure autoUpdater log output & download strategy
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater(): void {
  if (isDev) return;

  autoUpdater.on('update-available', (info: any) => {
    console.log(`[AutoUpdater] Update available: v${info.version}`);
    mainWindow?.webContents.send('app:update-available', info);
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    console.log(`[AutoUpdater] Update downloaded: v${info.version}`);
    mainWindow?.webContents.send('app:update-downloaded', info);
  });

  autoUpdater.on('error', (err: any) => {
    console.error(`[AutoUpdater] Error: ${err.message}`);
  });

  // Check for updates automatically in production
  autoUpdater.checkForUpdatesAndNotify().catch((err: any) => {
    console.error('[AutoUpdater] Failed to check for updates:', err);
  });
}

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
    setupAutoUpdater();
  });

  // Fallback: Ensure window displays even if ready-to-show is delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 1000);

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
  // Create default .env in userData if missing (for future edits by client)
  try {
    const fs = require('fs');
    const userEnvPath = path.join(app.getPath('userData'), '.env');
    if (!fs.existsSync(userEnvPath)) {
      const defaultEnvContent = [
        '# DIAMO ERP Configuration',
        `DATABASE_URL="${process.env.DATABASE_URL}"`,
        'NODE_ENV="production"',
        '',
      ].join('\n');
      try {
        fs.writeFileSync(userEnvPath, defaultEnvContent, 'utf-8');
        console.log('[Main] Created default .env at:', userEnvPath);
      } catch (writeErr) {
        console.error('[Main] Could not create default .env file:', writeErr);
      }
    }
  } catch (err) {
    console.error('[Main] .env setup error:', err);
  }

  if (app.isPackaged) {
    try {
      const fs = require('fs');
      const candidateDirs = [
        path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '.prisma', 'client'),
        path.join(process.resourcesPath, 'node_modules', '.prisma', 'client'),
      ];

      for (const dir of candidateDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          let engineFile: string | undefined;
          if (process.platform === 'win32') {
            engineFile = files.find((f: string) => f.includes('query_engine') && (f.includes('windows') || f.endsWith('.dll') || f.endsWith('.dll.node')));
          } else if (process.platform === 'darwin') {
            engineFile = files.find((f: string) => f.includes('query_engine') && f.includes('darwin'));
          } else {
            engineFile = files.find((f: string) => f.includes('query_engine') && (f.includes('linux') || f.includes('debian') || f.endsWith('.so') || f.endsWith('.so.node')));
          }

          if (engineFile) {
            process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(dir, engineFile);
            console.log(`[Main] Explicitly configured Prisma Query Engine (${process.platform}) at: ${process.env.PRISMA_QUERY_ENGINE_LIBRARY}`);
            break;
          }
        }
      }
    } catch (engineErr) {
      console.error('[Main] Failed to configure Prisma Query Engine path:', engineErr);
    }
  }

  // Start embedded MySQL (if in HOST mode) and LAN Discovery
  try {
    const dbConfig = loadDatabaseConfig();
    process.env.DATABASE_URL = getConnectionString(dbConfig);

    if (dbConfig.role === 'HOST') {
      await ensureEmbeddedMySQLRunning(dbConfig);
      startHostDiscoveryBeacon(dbConfig.hostPort);
    }
  } catch (dbInitErr) {
    console.error('[Main] Embedded DB / LAN discovery initialization error:', dbInitErr);
  }

  // 1. Create main window immediately so app launches instantly
  createWindow();

  // 2. Initialize NestJS backend modules context safely
  try {
    nestApp = await bootstrapNestApp();
    registerIpcHandlers(ipcMain, nestApp);
  } catch (backendErr: any) {
    console.error('[Main] NestJS backend initialization failed:', backendErr);
    dialog.showErrorBox(
      'DIAMO ERP – Initialization Error',
      `Failed to initialize database connection or backend services:\n\n${backendErr?.stack || backendErr?.message || backendErr}`
    );
  }

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

// Hook app exit to run quick database snapshot and stop embedded DB/LAN services before quitting
app.on('before-quit', async () => {
  try {
    stopLanDiscovery();
    stopEmbeddedMySQL();
  } catch (_e) {}

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
