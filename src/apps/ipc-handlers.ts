// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — IPC Handler Registration
// ═══════════════════════════════════════════════════════════════

import { IpcMain, BrowserWindow, dialog, app } from 'electron';
import { INestApplicationContext } from '@nestjs/common';
import { AuthController } from '../backend/modules/auth/auth.controller';
import { CompanyController } from '../backend/modules/company/company.controller';
import { FinancialYearController } from '../backend/modules/financial-year/fy.controller';
import { AccountGroupController } from '../backend/modules/account-group/account-group.controller';
import { AccountController } from '../backend/modules/account/account.controller';
import { BrokerController } from '../backend/modules/broker/broker.controller';
import { QualityController } from '../backend/modules/quality/quality.controller';
import { StockController } from '../backend/modules/stock/stock.controller';
import { StockConversionController } from '../backend/modules/stock/stock-conversion.controller';
import { InvoiceController } from '../backend/modules/invoice/invoice.controller';
import { ChallanController } from '../backend/modules/challan/challan.controller';
import { JobController } from '../backend/modules/job/job.controller';
import { JournalController } from '../backend/modules/journal/journal.controller';
import { CashBankController } from '../backend/modules/cashbank/cashbank.controller';
import { LoanController } from '../backend/modules/loan/loan.controller';
import { ReportController } from '../backend/modules/report/report.controller';
import { ReportValidationController } from '../backend/modules/report-validation/report-validation.controller';
import { PrintTemplateController } from '../backend/modules/print-template/print-template.controller';
import { BackupController } from '../backend/modules/backup/backup.controller';
import { PreferencesController } from '../backend/modules/preferences/preferences.controller';
import { AuditController } from '../backend/modules/audit/audit.controller';
import { HealthController } from '../backend/modules/system-health/health.controller';
import { LicenseController } from '../backend/modules/system-license/license.controller';
import { SuperAdminController } from '../backend/modules/super-admin/super-admin.controller';
import { DashboardController } from '../backend/modules/dashboard/dashboard.controller';
import { NotificationController } from '../backend/modules/notification/notification.controller';
import { UserWorkspaceController } from '../backend/modules/user-workspace/workspace.controller';
import { ExchangeRateController } from '../backend/modules/exchange-rate/exchange-rate.controller';
import { loadDatabaseConfig, saveDatabaseConfig, IDatabaseConfig } from './mysql-manager';
import { discoverHostsOnLan } from './lan-discovery';
import { serializeForIpc } from '../backend/utils/serialize-for-ipc';
import { PrismaService } from '../backend/database/prisma.service';
import type { IApiResponse } from '../shared/types/common.types';

/** Wrap IPC handlers so Prisma Decimal/Date values are JSON-safe for Electron. */
function ipcHandle(
  ipcMain: IpcMain,
  channel: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (...args: any[]) => Promise<IApiResponse | Record<string, unknown>>,
  prismaService?: PrismaService,
): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    // Propagate userId to PrismaService for audit logging
    if (prismaService && args[0] && typeof args[0] === 'object' && args[0].userId) {
      prismaService.setCurrentUserId(args[0].userId);
    }
    const result = await handler(...args);
    if (result && typeof result === 'object' && 'success' in result && result.success && 'data' in result && result.data !== undefined) {
      return { ...result, data: serializeForIpc(result.data) };
    }
    return result;
  });
}

/**
 * Handlers the first-run setup wizard needs before the NestJS context exists.
 * Registered ahead of window creation: the renderer calls db:get-config on mount,
 * which lands several seconds before the Nest bootstrap finishes.
 */
export function registerSetupIpcHandlers(ipcMain: IpcMain): void {
  // ─── Database Configuration & LAN Discovery ────────────
  ipcMain.handle('db:get-config', async () => ({
    success: true,
    data: loadDatabaseConfig(),
  }));

  ipcMain.handle('db:save-config', async (_event, config: IDatabaseConfig) => {
    saveDatabaseConfig(config);
    return { success: true, message: 'Database configuration saved successfully' };
  });

  ipcMain.handle('db:discover-host', async () => {
    const hostsList = await discoverHostsOnLan(3000);
    return {
      success: hostsList.length > 0,
      data: hostsList,
    };
  });

  // Restart so the new configuration is picked up by the whole startup chain
  // (DATABASE_URL resolution → embedded MySQL → NestJS bootstrap).
  ipcMain.handle('app:relaunch', async () => {
    app.relaunch();
    app.exit(0);
    return { success: true };
  });
}

export function registerIpcHandlers(ipcMain: IpcMain, nestApp: INestApplicationContext): void {
  const prismaService = nestApp.get(PrismaService);
  const authController = nestApp.get(AuthController);
  const companyController = nestApp.get(CompanyController);
  const fyController = nestApp.get(FinancialYearController);
  const accountGroupController = nestApp.get(AccountGroupController);
  const accountController = nestApp.get(AccountController);
  const brokerController = nestApp.get(BrokerController);
  const qualityController = nestApp.get(QualityController);
  const stockController = nestApp.get(StockController);
  const stockConversionController = nestApp.get(StockConversionController);
  const invoiceController = nestApp.get(InvoiceController);
  const challanController = nestApp.get(ChallanController);
  const jobController = nestApp.get(JobController);
  const journalController = nestApp.get(JournalController);
  const cashBankController = nestApp.get(CashBankController);
  const loanController = nestApp.get(LoanController);
  const reportController = nestApp.get(ReportController);
  const reportValidationController = nestApp.get(ReportValidationController);
  const printTemplateController = nestApp.get(PrintTemplateController);
  const backupController = nestApp.get(BackupController);
  const preferencesController = nestApp.get(PreferencesController);
  const auditController = nestApp.get(AuditController);
  const healthController = nestApp.get(HealthController);
  const licenseController = nestApp.get(LicenseController);
  const superAdminController = nestApp.get(SuperAdminController);
  const dashboardController = nestApp.get(DashboardController);
  const notificationController = nestApp.get(NotificationController);
  const userWorkspaceController = nestApp.get(UserWorkspaceController);
  const exchangeRateController = nestApp.get(ExchangeRateController);

  // Helper: wrap with prisma userId propagation for write-heavy channels
  const p = prismaService;

  // ─── Dashboard ───────────────────────────────────────────
  ipcHandle(ipcMain, 'dashboard:get-telemetry', (payload) => dashboardController.handleGetTelemetry(payload), p);
  ipcHandle(ipcMain, 'dashboard:get-analytics', (payload) => dashboardController.handleGetAnalytics(payload), p);

  // ─── Notifications ───────────────────────────────────────
  ipcHandle(ipcMain, 'notification:get-all', (payload) => notificationController.handleGetNotifications(payload));
  ipcHandle(ipcMain, 'notification:mark-read', (payload) => notificationController.handleMarkAsRead(payload));
  ipcHandle(ipcMain, 'notification:mark-all-read', (payload) => notificationController.handleMarkAllAsRead(payload));
  ipcHandle(ipcMain, 'notification:dismiss', (payload) => notificationController.handleDismiss(payload));

  // ─── User Personal Workspace ─────────────────────────────
  ipcHandle(ipcMain, 'workspace:get', (payload) => userWorkspaceController.handleGetWorkspace(payload));
  ipcHandle(ipcMain, 'workspace:update', (payload) => userWorkspaceController.handleUpdateWorkspace(payload));
  ipcHandle(ipcMain, 'workspace:log-recent', (payload) => userWorkspaceController.handleLogRecentPage(payload));

  // ─── System ──────────────────────────────────────────────
  ipcMain.handle('system:ping', async () => ({
    success: true,
    message: 'DIAMO ERP is running',
    timestamp: new Date().toISOString(),
  }));

  ipcMain.handle('system:version', async () => ({
    app: '1.0.0',
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  }));

  ipcMain.handle('system:check-update', async () => {
    try {
      const { autoUpdater } = require('electron-updater');
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: result?.updateInfo?.version };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to check for updates' };
    }
  });

  ipcMain.handle('system:get-db-config', async () => {
    const fs = require('fs');
    const path = require('path');
    const configPath = app ? path.join(app.getPath('userData'), '.env') : path.join(process.cwd(), '.env');
    let currentUrl = process.env.DATABASE_URL || '';
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const match = content.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
      if (match) currentUrl = match[1];
    }
    return { success: true, databaseUrl: currentUrl };
  });

  ipcMain.handle('system:save-db-config', async (_, payload: { databaseUrl: string }) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = app ? path.join(app.getPath('userData'), '.env') : path.join(process.cwd(), '.env');
      const envContent = `DATABASE_URL="${payload.databaseUrl}"\nNODE_ENV="production"\n`;
      fs.writeFileSync(configPath, envContent, 'utf8');
      process.env.DATABASE_URL = payload.databaseUrl;
      return { success: true, message: 'Database configuration saved successfully. Please restart application.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save database configuration' };
    }
  });

  ipcMain.handle('system:quit-and-install', async () => {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:print-to-pdf', async (event, payload: { filename: string }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, error: 'No active window found' };

    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Report as PDF',
      defaultPath: payload.filename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!filePath) {
      return { success: false, error: 'Cancelled' };
    }

    try {
      const data = await event.sender.printToPDF({
        margins: {
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4
        },
        pageSize: 'A4',
        printBackground: true,
        landscape: false,
      });

      const fs = require('fs');
      fs.writeFileSync(filePath, data);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to generate PDF' };
    }
  });

  ipcMain.handle('system:save-file-direct', async (_, payload: { targetPath: string; filename: string; content: string; encoding?: string }) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      let fullDir = payload.targetPath;
      if (fullDir.startsWith('Documents')) {
        fullDir = path.join(os.homedir(), 'Documents', fullDir.replace(/^Documents\/?/, ''));
      } else if (fullDir.startsWith('Desktop')) {
        fullDir = path.join(os.homedir(), 'Desktop', fullDir.replace(/^Desktop\/?/, ''));
      } else if (!path.isAbsolute(fullDir)) {
        fullDir = path.join(os.homedir(), fullDir);
      }

      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }

      const filePath = path.join(fullDir, payload.filename);
      if (payload.encoding === 'base64') {
        fs.writeFileSync(filePath, Buffer.from(payload.content, 'base64'));
      } else {
        fs.writeFileSync(filePath, payload.content, 'utf-8');
      }
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save file' };
    }
  });

  ipcMain.handle('system:open-file', async (_, payload: { filePath: string }) => {
    try {
      const { shell } = require('electron');
      const fs = require('fs');
      if (!fs.existsSync(payload.filePath)) {
        return { success: false, error: 'File does not exist on disk' };
      }
      await shell.openPath(payload.filePath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to open file' };
    }
  });

  ipcMain.handle('system:filter-existing-files', async (_, payload: { archives: any[] }) => {
    try {
      const fs = require('fs');
      const filtered = payload.archives.filter(a => {
        let path = a.filePath;
        if (!path && a.params && a.params.includes('Saved Path: ')) {
          path = a.params.split('Saved Path: ')[1]?.trim();
        }
        if (!path) return true; // Keep initial metadata-only mocks
        return fs.existsSync(path);
      });
      return { success: true, archives: filtered };
    } catch (err: any) {
      return { success: false, error: err.message, archives: payload.archives };
    }
  });

  ipcMain.handle('system:print-pdf-direct', async (event, payload: { html: string; targetPath: string; filename: string }) => {
    const { BrowserWindow } = require('electron');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const workerWin = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const tempFilePath = path.join(os.tmpdir(), `diamo_temp_print_${Date.now()}.html`);

    try {
      // Extract active CSS styles and variables from main window, converting relative paths to absolute paths
      let styles = '';
      try {
        styles = await event.sender.executeJavaScript(`
          (() => {
            const origin = window.location.origin;
            return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
              .map(el => {
                if (el.tagName === 'LINK' && el.getAttribute('href')?.startsWith('/')) {
                  const clone = el.cloneNode(true);
                  clone.setAttribute('href', origin + el.getAttribute('href'));
                  return clone.outerHTML;
                }
                return el.outerHTML;
              })
              .join('\\n');
          })()
        `);
      } catch (e) {
        console.error('Failed to extract styles from main window', e);
      }

      const resetStyles = `
        <style>
          html, body {
            display: block !important;
            flex-direction: column !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #print-area, .print-page {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-sizing: border-box !important;
          }
        </style>
      `;

      // Prepend extracted styles to the head tag
      const styledHtml = payload.html.includes('</head>')
        ? payload.html.replace('</head>', `${styles}${resetStyles}</head>`)
        : `<head>${styles}${resetStyles}</head>${payload.html}`;

      fs.writeFileSync(tempFilePath, styledHtml, 'utf-8');
      await workerWin.loadFile(tempFilePath);

      // Wait a moment for rendering and fonts to paint
      await new Promise((resolve) => setTimeout(resolve, 250));

      const data = await workerWin.webContents.printToPDF({
        margins: {
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4
        },
        pageSize: 'A4',
        printBackground: true,
        landscape: false,
      });

      let fullDir = payload.targetPath;
      if (fullDir.startsWith('Documents')) {
        fullDir = path.join(os.homedir(), 'Documents', fullDir.replace(/^Documents\/?/, ''));
      } else if (fullDir.startsWith('Desktop')) {
        fullDir = path.join(os.homedir(), 'Desktop', fullDir.replace(/^Desktop\/?/, ''));
      } else if (!path.isAbsolute(fullDir)) {
        fullDir = path.join(os.homedir(), fullDir);
      }

      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }

      const filePath = path.join(fullDir, payload.filename);
      fs.writeFileSync(filePath, data);

      workerWin.close();
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}

      return { success: true, filePath };
    } catch (err: any) {
      workerWin.close();
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
      return { success: false, error: err.message || 'Failed to print background PDF' };
    }
  });

  // ─── Stage 1: Auth ───────────────────────────────────────
  ipcHandle(ipcMain, 'auth:login', (payload) => authController.handleLogin(payload));
  ipcHandle(ipcMain, 'auth:logout', (payload) => authController.handleLogout(payload));
  ipcHandle(ipcMain, 'auth:session', (payload) => authController.handleSession(payload));

  // ─── Stage 1: Company ────────────────────────────────────
  ipcHandle(ipcMain, 'company:list', () => companyController.handleList());
  ipcHandle(ipcMain, 'company:states', () => companyController.handleListStates());
  ipcHandle(ipcMain, 'company:get', (id: number) => companyController.handleGet(id));
  ipcHandle(ipcMain, 'company:create', (payload) => companyController.handleCreate(payload));
  ipcHandle(ipcMain, 'company:update', (payload) => companyController.handleUpdate(payload));
  ipcHandle(ipcMain, 'company:delete', (id: number) => companyController.handleDelete(id));

  // ─── Stage 1: Financial Year ─────────────────────────────
  ipcHandle(ipcMain, 'fy:list', (companyId: number) => fyController.handleList(companyId));
  ipcHandle(ipcMain, 'fy:create', (payload) => fyController.handleCreate(payload));
  ipcHandle(ipcMain, 'fy:update', (payload) => fyController.handleUpdate(payload));
  ipcHandle(ipcMain, 'fy:activate', (payload) => fyController.handleActivate(payload));
  ipcHandle(ipcMain, 'fy:toggle-closed', (payload) => fyController.handleToggleClosed(payload));
  ipcHandle(ipcMain, 'fy:delete', (payload) => fyController.handleDelete(payload));

  // ─── Stage 2: Account Group ────────────────────────────
  ipcHandle(ipcMain, 'account-group:list', (companyId: number) => accountGroupController.handleList(companyId));
  ipcHandle(ipcMain, 'account-group:tree', (companyId: number) => accountGroupController.handleTree(companyId));
  ipcHandle(ipcMain, 'account-group:get', (payload) => accountGroupController.handleGet(payload));
  ipcHandle(ipcMain, 'account-group:create', (payload) => accountGroupController.handleCreate(payload));
  ipcHandle(ipcMain, 'account-group:update', (payload) => accountGroupController.handleUpdate(payload));
  ipcHandle(ipcMain, 'account-group:delete', (payload) => accountGroupController.handleDelete(payload));
  ipcHandle(ipcMain, 'account-group:seed', (companyId: number) => accountGroupController.handleSeed({ companyId }));

  // ─── Stage 2: Account ────────────────────────────────────
  ipcHandle(ipcMain, 'account:list', (payload) => accountController.handleList(payload));
  ipcHandle(ipcMain, 'account:search', (payload) => accountController.handleSearch(payload));
  ipcHandle(ipcMain, 'account:get', (payload) => accountController.handleGet(payload));
  ipcHandle(ipcMain, 'account:create', (payload) => accountController.handleCreate(payload));
  ipcHandle(ipcMain, 'account:update', (payload) => accountController.handleUpdate(payload));
  ipcHandle(ipcMain, 'account:update-status', (payload) => accountController.handleUpdateStatus(payload));
  ipcHandle(ipcMain, 'account:delete', (payload) => accountController.handleDelete(payload));
  ipcHandle(ipcMain, 'account:seed-defaults', (payload) => accountController.handleSeedDefaults(payload));

  // ─── Stage 2: Broker ─────────────────────────────────────
  ipcHandle(ipcMain, 'broker:list', (companyId: number) => brokerController.handleList(companyId));
  ipcHandle(ipcMain, 'broker:get', (payload) => brokerController.handleGet(payload));
  ipcHandle(ipcMain, 'broker:create', (payload) => brokerController.handleCreate(payload));
  ipcHandle(ipcMain, 'broker:update', (payload) => brokerController.handleUpdate(payload));
  ipcHandle(ipcMain, 'broker:delete', (payload) => brokerController.handleDelete(payload));

  // ─── Stage 2: Quality ────────────────────────────────────
  ipcHandle(ipcMain, 'quality:list', (payload) => qualityController.handleList(payload));
  ipcHandle(ipcMain, 'quality:get', (payload) => qualityController.handleGet(payload));
  ipcHandle(ipcMain, 'quality:create', (payload) => qualityController.handleCreate(payload));
  ipcHandle(ipcMain, 'quality:update', (payload) => qualityController.handleUpdate(payload));
  ipcHandle(ipcMain, 'quality:delete', (payload) => qualityController.handleDelete(payload));
  ipcHandle(ipcMain, 'quality:hsn-list', () => qualityController.handleHsnList());

  // ─── Stage 3: Stock / Inventory ──────────────────────────
  ipcHandle(ipcMain, 'stock:list', (payload) => stockController.handleList(payload));
  ipcHandle(ipcMain, 'stock:get', (payload) => stockController.handleGet(payload));
  ipcHandle(ipcMain, 'stock:create', (payload) => stockController.handleCreate(payload));
  ipcHandle(ipcMain, 'stock:update', (payload) => stockController.handleUpdate(payload));
  ipcHandle(ipcMain, 'stock:delete', (payload) => stockController.handleDelete(payload));
  ipcHandle(ipcMain, 'stock:search', (payload) => stockController.handleSearch(payload));
  ipcHandle(ipcMain, 'stock:timeline', (payload) => stockController.handleTimeline(payload));
  ipcHandle(ipcMain, 'stock:preview-id', (payload) => stockController.handlePreviewId(payload));
  ipcHandle(ipcMain, 'stock:get-config', (companyId: number) => stockController.handleGetConfig(companyId));
  ipcHandle(ipcMain, 'stock:save-config', (payload) => stockController.handleSaveConfig(payload));
  ipcHandle(ipcMain, 'stock:get-all-configs', (payload) => stockController.handleGetAllVoucherConfigs(payload));
  ipcHandle(ipcMain, 'stock:save-voucher-config', (payload) => stockController.handleSaveVoucherConfig(payload));
  ipcHandle(ipcMain, 'stock:shapes-list', (companyId: number) => stockController.handleListShapes(companyId));
  ipcHandle(ipcMain, 'stock:import-csv', (payload) => stockController.handleImportCsv(payload));

  // ─── Stock Conversion (Quality Transformation) ────────────
  ipcHandle(ipcMain, 'stock-conversion:list', (payload) => stockConversionController.handleList(payload));
  ipcHandle(ipcMain, 'stock-conversion:get', (payload) => stockConversionController.handleGet(payload));
  ipcHandle(ipcMain, 'stock-conversion:by-packet', (payload) => stockConversionController.handleGetByPacket(payload));
  ipcHandle(ipcMain, 'stock-conversion:create', (payload) => stockConversionController.handleCreate(payload));
  ipcHandle(ipcMain, 'stock-conversion:update', (payload) => stockConversionController.handleUpdate(payload));
  ipcHandle(ipcMain, 'stock-conversion:delete', (payload) => stockConversionController.handleDelete(payload));

  // ─── Stage 4: Invoices ───────────────────────────────────
  ipcHandle(ipcMain, 'invoice:list', (payload) => invoiceController.handleList(payload));
  ipcHandle(ipcMain, 'invoice:preview-number', (payload) => invoiceController.handlePreviewNumber(payload));
  ipcHandle(ipcMain, 'invoice:get', (payload) => invoiceController.handleGet(payload));
  ipcHandle(ipcMain, 'invoice:create', (payload) => invoiceController.handleCreate(payload));
  ipcHandle(ipcMain, 'invoice:update', (payload) => invoiceController.handleUpdate(payload));
  ipcHandle(ipcMain, 'invoice:delete', (payload) => invoiceController.handleDelete(payload));

  // ─── Stage 6: Challans ───────────────────────────────────
  ipcHandle(ipcMain, 'challan:list', (payload) => challanController.handleList(payload));
  ipcHandle(ipcMain, 'challan:get', (payload) => challanController.handleGet(payload));
  ipcHandle(ipcMain, 'challan:preview-number', (payload) => challanController.handlePreviewNumber(payload));
  ipcHandle(ipcMain, 'challan:create', (payload) => challanController.handleCreate(payload));
  ipcHandle(ipcMain, 'challan:update', (payload) => challanController.handleUpdate(payload));
  ipcHandle(ipcMain, 'challan:delete', (payload) => challanController.handleDelete(payload));
  ipcHandle(ipcMain, 'challan:update-status', (payload) => challanController.handleUpdateStatus(payload));

  // ─── Stage 8: Job Book ────────────────────────────────────
  ipcHandle(ipcMain, 'job:list', (payload) => jobController.handleList(payload));
  ipcHandle(ipcMain, 'job:get', (payload) => jobController.handleGet(payload));
  ipcHandle(ipcMain, 'job:preview-number', (payload) => jobController.handlePreviewNumber(payload));
  ipcHandle(ipcMain, 'job:create', (payload) => jobController.handleCreate(payload));
  ipcHandle(ipcMain, 'job:create-unified', (payload) => jobController.handleCreateUnified(payload));
  ipcHandle(ipcMain, 'job:update-unified', (payload) => jobController.handleUpdateUnified(payload));
  ipcHandle(ipcMain, 'job:receive-bill', (payload) => jobController.handleReceiveAndBill(payload));
  ipcHandle(ipcMain, 'job:cancel', (payload) => jobController.handleCancel(payload));
  ipcHandle(ipcMain, 'job:generate-pdf', (payload) => jobController.handleGeneratePdf(payload));
  ipcHandle(ipcMain, 'job:delete', (payload) => jobController.handleDelete(payload));

  // ─── Phase 8: Accounting (JV) ─────────────────────────────
  ipcHandle(ipcMain, 'journal:list', (payload) => journalController.handleList(payload));
  ipcHandle(ipcMain, 'journal:preview-number', (payload) => journalController.handlePreviewNumber(payload));
  ipcHandle(ipcMain, 'journal:pending-bills', (payload) => journalController.handleGetPendingBills(payload));
  ipcHandle(ipcMain, 'journal:create', (payload) => journalController.handleCreate(payload));
  ipcHandle(ipcMain, 'journal:delete', (payload) => journalController.handleDelete(payload));

  // ─── Phase 9: Cash & Bank Vouchers ────────────────────────
  ipcHandle(ipcMain, 'cashbank:list', (payload) => cashBankController.handleList(payload));
  ipcHandle(ipcMain, 'cashbank:balance', (payload) => cashBankController.handleGetRunningBalance(payload));
  ipcHandle(ipcMain, 'cashbank:unpaid-purchases', (payload) => cashBankController.handleListUnpaidPurchases(payload));
  ipcHandle(ipcMain, 'cashbank:unpaid-sales', (payload) => cashBankController.handleListUnpaidSales(payload));
  ipcHandle(ipcMain, 'cashbank:party-notes', (payload) => cashBankController.handleListPartyNotes(payload));
  ipcHandle(ipcMain, 'cashbank:preview-number', (payload) => cashBankController.handlePreviewNumber(payload));
  ipcHandle(ipcMain, 'cashbank:create', (payload) => cashBankController.handleCreate(payload));
  ipcHandle(ipcMain, 'cashbank:delete', (payload) => cashBankController.handleDelete(payload));

  // ─── Loan Management ──────────────────────────────────────
  ipcHandle(ipcMain, 'loan:list', (payload) => loanController.handleList(payload));
  ipcHandle(ipcMain, 'loan:preview-number', (payload) => loanController.handlePreviewNumber(payload));
  ipcHandle(ipcMain, 'loan:create', (payload) => loanController.handleCreate(payload));
  ipcHandle(ipcMain, 'loan:repay', (payload) => loanController.handleRepay(payload));
  ipcHandle(ipcMain, 'loan:write-off', (payload) => loanController.handleWriteOff(payload));
  ipcHandle(ipcMain, 'loan:delete', (payload) => loanController.handleDelete(payload));
  ipcHandle(ipcMain, 'loan:onhand', (payload) => loanController.handleGetOnHandMoney(payload));
  ipcHandle(ipcMain, 'loan:pdf', (payload) => loanController.handleGeneratePdf(payload));

  // ─── Phase 11: Enterprise Reports ────────────────────────
  ipcHandle(ipcMain, 'report:ledger', (payload) => reportController.handleGetLedger(payload));
  ipcHandle(ipcMain, 'report:trial-balance', (payload) => reportController.handleGetTrialBalance(payload));
  ipcHandle(ipcMain, 'report:profit-loss', (payload) => reportController.handleGetProfitLoss(payload));
  ipcHandle(ipcMain, 'report:balance-sheet', (payload) => reportController.handleGetBalanceSheet(payload));
  ipcHandle(ipcMain, 'report:outstanding', (payload) => reportController.handleGetOutstanding(payload));
  ipcHandle(ipcMain, 'report:stock', (payload) => reportController.handleGetStockReport(payload));
  ipcHandle(ipcMain, 'report:gst-dashboard', (payload) => reportController.handleGetGstDashboard(payload));
  ipcHandle(ipcMain, 'report:gstr1', (payload) => reportController.handleGetGstr1Report(payload));
  ipcHandle(ipcMain, 'report:gstr1-json', (payload) => reportController.handleGenerateGstr1Json(payload));
  ipcHandle(ipcMain, 'report:gst-registers', (payload) => reportController.handleGetGstRegisters(payload));
  ipcHandle(ipcMain, 'report:reconcile-itc', (payload) => reportController.handleReconcileItc(payload));
  ipcHandle(ipcMain, 'report:gstr3b-summary', (payload) => reportController.handleGetGstr3bSummary(payload));
  ipcHandle(ipcMain, 'report:gst-analytics', (payload) => reportController.handleGetGstAnalytics(payload));
  ipcHandle(ipcMain, 'report:day-book', (payload) => reportController.handleGetDayBookSummary(payload));
  ipcHandle(ipcMain, 'report:day-book-list', (payload) => reportController.handleGetDayBookDatesList(payload));

  // ─── Phase 11.6: TDS & TCS Reports ────────────────────────
  ipcHandle(ipcMain, 'report:tds-register', (payload) => reportController.handleGetTdsRegister(payload));
  ipcHandle(ipcMain, 'report:tcs-register', (payload) => reportController.handleGetTcsRegister(payload));
  ipcHandle(ipcMain, 'report:tds-tcs-dashboard', (payload) => reportController.handleGetTdsTcsDashboard(payload));
  ipcHandle(ipcMain, 'report:tds-partywise', (payload) => reportController.handleGetTdsPartywise(payload));
  ipcHandle(ipcMain, 'report:tcs-partywise', (payload) => reportController.handleGetTcsPartywise(payload));

  // ─── Phase 11.8: Enterprise MIS & Business Analytics ─────
  ipcHandle(ipcMain, 'report:mis-dashboard', (payload) => reportController.handleGetMisDashboard(payload));
  ipcHandle(ipcMain, 'report:mis-stock-job', (payload) => reportController.handleGetMisStockJobAnalytics(payload));
  ipcHandle(ipcMain, 'report:mis-ratios', (payload) => reportController.handleGetMisFinancialRatios(payload));

  // ─── Phase 11.2: Financial Statement Additions ─────────────
  ipcHandle(ipcMain, 'report:cash-flow', (payload) => reportController.handleGetCashFlow(payload));
  ipcHandle(ipcMain, 'report:fund-flow', (payload) => reportController.handleGetFundFlow(payload));

  // ─── Phase 11.10: Enterprise Report Validation & Auditing ───
  ipcHandle(ipcMain, 'report:run-health-checks', (payload) => reportValidationController.handleRunHealthChecks(payload));
  ipcHandle(ipcMain, 'report:get-validation-history', (payload) => reportValidationController.handleGetValidationHistory(payload));
  ipcHandle(ipcMain, 'report:generate-certificate', (payload) => reportValidationController.handleGenerateCertificate(payload));

  // ─── Phase 13.5: Print Template Configuration ──────────────
  ipcHandle(ipcMain, 'print:get-template-config', (payload) => printTemplateController.handleGetTemplateConfig(payload));
  ipcHandle(ipcMain, 'print:save-template-config', (payload) => printTemplateController.handleSaveTemplateConfig(payload));
  ipcHandle(ipcMain, 'print:get-all-templates', (payload) => printTemplateController.handleGetAllTemplates(payload));
  ipcHandle(ipcMain, 'print:reset-template-config', (payload) => printTemplateController.handleResetTemplateConfig(payload));
  ipcHandle(ipcMain, 'print:copy-template-config', (payload) => printTemplateController.handleCopyTemplateConfig(payload));

  // ─── Phase 13.6: Backup & Recovery Management ───────────────
  ipcHandle(ipcMain, 'backup:get-settings', (payload) => backupController.handleGetSettings(payload));
  ipcHandle(ipcMain, 'backup:save-settings', (payload) => backupController.handleSaveSettings(payload));
  ipcHandle(ipcMain, 'backup:create', (payload) => backupController.handleCreateBackup(payload));
  ipcHandle(ipcMain, 'backup:get-history', (payload) => backupController.handleGetHistory(payload));
  ipcHandle(ipcMain, 'backup:restore', (payload) => backupController.handleRestoreBackup(payload));
  ipcHandle(ipcMain, 'backup:delete', (payload) => backupController.handleDeleteBackup(payload));
  ipcHandle(ipcMain, 'backup:delete-all', (payload) => backupController.handleDeleteAllBackups(payload));
  
  // Custom dialog folder picker channel
  ipcMain.handle('backup:select-folder', async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return { success: false, error: 'No active window found' };
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Selection cancelled' };
    }
    return { success: true, data: { path: result.filePaths[0] } };
  });

  // ─── Phase 13.7: System Preferences ─────────────────────────
  ipcHandle(ipcMain, 'preferences:get-settings', (payload) => preferencesController.handleGetSettings(payload));
  ipcHandle(ipcMain, 'preferences:save-settings', (payload) => preferencesController.handleSaveSettings(payload));

  // ─── Exchange Rate (Multi-Currency Support) ─────────────────
  ipcHandle(ipcMain, 'exchange-rate:log', (payload) => exchangeRateController.handleLogRate(payload));
  ipcHandle(ipcMain, 'exchange-rate:latest', (payload) => exchangeRateController.handleGetLatestRate(payload));
  ipcHandle(ipcMain, 'exchange-rate:for-date', (payload) => exchangeRateController.handleGetRateForDate(payload));
  ipcHandle(ipcMain, 'exchange-rate:history', (payload) => exchangeRateController.handleGetRateHistory(payload));
  ipcHandle(ipcMain, 'exchange-rate:update', (payload) => exchangeRateController.handleUpdateRate(payload));
  ipcHandle(ipcMain, 'exchange-rate:delete', (payload) => exchangeRateController.handleDeleteRate(payload));

  // ─── Phase 13.8: Audit & Security Controls ─────────────────
  ipcHandle(ipcMain, 'audit:get-settings', (payload) => auditController.handleGetSettings(payload));
  ipcHandle(ipcMain, 'audit:save-settings', (payload) => auditController.handleSaveSettings(payload));
  ipcHandle(ipcMain, 'audit:list', (payload) => auditController.handleListLogs(payload));

  // ─── Phase 13.9 & 16: Database Health & System Diagnostics ───────
  ipcHandle(ipcMain, 'health:get-status', (payload) => healthController.handleGetStatus(payload));
  ipcHandle(ipcMain, 'health:run-diagnostics', (payload) => healthController.handleRunDiagnostics(payload));
  ipcHandle(ipcMain, 'health:optimize-db', (payload) => healthController.handleOptimizeDb(payload));
  ipcHandle(ipcMain, 'health:clear-cache', (payload) => healthController.handleClearCache(payload));
  ipcHandle(ipcMain, 'health:run-integrity-audit', (payload) => healthController.handleRunIntegrityAudit(payload));
  ipcHandle(ipcMain, 'health:apply-repair', (payload) => healthController.handleApplyDataRepair(payload));

  // ─── Phase 13.10: License & Version Management ──────────────
  ipcHandle(ipcMain, 'license:get-info', (payload) => licenseController.handleGetInfo(payload));
  ipcHandle(ipcMain, 'license:update-key', (payload) => licenseController.handleUpdateKey(payload));
  ipcHandle(ipcMain, 'license:reset-uptime', (payload) => licenseController.handleResetUptime(payload));
  ipcHandle(ipcMain, 'license:check-update', (payload) => licenseController.handleCheckForUpdates(payload));
  ipcHandle(ipcMain, 'license:apply-update', (payload) => licenseController.handleApplyUpdate(payload));

  // ─── Phase 14.1: Super Admin Management ─────────────────────
  ipcHandle(ipcMain, 'admin:get-profile', (payload) => superAdminController.handleGetProfile(payload));
  ipcHandle(ipcMain, 'admin:update-profile', (payload) => superAdminController.handleUpdateProfile(payload));
  ipcHandle(ipcMain, 'admin:change-password', (payload) => superAdminController.handleChangePassword(payload));
  ipcHandle(ipcMain, 'admin:set-backup-password', (payload) => superAdminController.handleSetBackupDeletionPassword(payload));
  ipcHandle(ipcMain, 'admin:get-metrics', (payload) => superAdminController.handleGetMetrics(payload));
  ipcHandle(ipcMain, 'admin:terminate-session', (payload) => superAdminController.handleTerminateSession(payload));

  // ─── Phase 14.2: User & Employee Management ─────────────────
  ipcHandle(ipcMain, 'admin:list-users', (payload) => superAdminController.handleListUsers(payload));
  ipcHandle(ipcMain, 'admin:create-user', (payload) => superAdminController.handleCreateUser(payload));
  ipcHandle(ipcMain, 'admin:update-user', (payload) => superAdminController.handleUpdateUser(payload));
  ipcHandle(ipcMain, 'admin:change-user-password', (payload) => superAdminController.handleChangeUserPassword(payload));
  ipcHandle(ipcMain, 'admin:toggle-user-lock', (payload) => superAdminController.handleToggleUserLock(payload));
  ipcHandle(ipcMain, 'admin:toggle-user-status', (payload) => superAdminController.handleToggleUserStatus(payload));
  ipcHandle(ipcMain, 'admin:delete-user', (payload) => superAdminController.handleDeleteUser(payload));

  // ─── Phase 14.4: Page Access Control ────────────────────────
  ipcHandle(ipcMain, 'admin:get-user-permissions', (payload) => superAdminController.handleGetUserPermissions(payload));
  ipcHandle(ipcMain, 'admin:save-user-permissions', (payload) => superAdminController.handleSaveUserPermissions(payload));
  ipcHandle(ipcMain, 'admin:copy-user-permissions', (payload) => superAdminController.handleCopyUserPermissions(payload));
  ipcHandle(ipcMain, 'admin:get-my-permissions', (payload) => superAdminController.handleGetMyPermissions(payload));

  // ─── Phase 14.5: Module Actions Security ──────────────────────
  ipcHandle(ipcMain, 'admin:get-user-module-permissions', (payload) => superAdminController.handleGetUserModulePermissions(payload));
  ipcHandle(ipcMain, 'admin:save-user-module-permissions', (payload) => superAdminController.handleSaveUserModulePermissions(payload));
  ipcHandle(ipcMain, 'admin:get-my-module-permissions', (payload) => superAdminController.handleGetMyModulePermissions(payload));

  // ─── Phase 14.6: User Activity & Productivity Monitoring ──────
  ipcHandle(ipcMain, 'admin:get-activity-logs', (payload) => superAdminController.handleGetActivityLogs(payload));
  ipcHandle(ipcMain, 'admin:get-user-timeline', (payload) => superAdminController.handleGetUserTimeline(payload));
  ipcHandle(ipcMain, 'admin:get-productivity-metrics', (payload) => superAdminController.handleGetProductivityMetrics(payload));
}
