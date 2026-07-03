// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — IPC Handler Registration
// ═══════════════════════════════════════════════════════════════

import { IpcMain } from 'electron';
import { INestApplicationContext } from '@nestjs/common';
import { AuthController } from '../backend/modules/auth/auth.controller';
import { CompanyController } from '../backend/modules/company/company.controller';
import { FinancialYearController } from '../backend/modules/financial-year/fy.controller';
import { AccountGroupController } from '../backend/modules/account-group/account-group.controller';
import { AccountController } from '../backend/modules/account/account.controller';
import { BrokerController } from '../backend/modules/broker/broker.controller';
import { QualityController } from '../backend/modules/quality/quality.controller';
import { StockController } from '../backend/modules/stock/stock.controller';
import { serializeForIpc } from '../backend/utils/serialize-for-ipc';
import type { IApiResponse } from '../shared/types/common.types';

/** Wrap IPC handlers so Prisma Decimal/Date values are JSON-safe for Electron. */
function ipcHandle(
  ipcMain: IpcMain,
  channel: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (...args: any[]) => Promise<IApiResponse | Record<string, unknown>>,
): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    const result = await handler(...args);
    if (result && typeof result === 'object' && 'success' in result && result.success && 'data' in result && result.data !== undefined) {
      return { ...result, data: serializeForIpc(result.data) };
    }
    return result;
  });
}

export function registerIpcHandlers(ipcMain: IpcMain, nestApp: INestApplicationContext): void {
  const authController = nestApp.get(AuthController);
  const companyController = nestApp.get(CompanyController);
  const fyController = nestApp.get(FinancialYearController);
  const accountGroupController = nestApp.get(AccountGroupController);
  const accountController = nestApp.get(AccountController);
  const brokerController = nestApp.get(BrokerController);
  const qualityController = nestApp.get(QualityController);
  const stockController = nestApp.get(StockController);

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
  ipcHandle(ipcMain, 'fy:activate', (payload) => fyController.handleActivate(payload));
  ipcHandle(ipcMain, 'fy:toggle-closed', (payload) => fyController.handleToggleClosed(payload));

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
  ipcHandle(ipcMain, 'stock:preview-id', (companyId: number) => stockController.handlePreviewId(companyId));
  ipcHandle(ipcMain, 'stock:shapes-list', (companyId: number) => stockController.handleListShapes(companyId));
}
