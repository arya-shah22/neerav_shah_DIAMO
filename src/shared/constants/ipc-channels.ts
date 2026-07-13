// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — IPC Channel Name Registry
// ═══════════════════════════════════════════════════════════════
// Single source of truth for all IPC channel names.
// Frontend and backend both import from this file.

export const IPC = {
  // ─── System ──────────────────────────────────────────────
  SYSTEM_PING: 'system:ping',
  SYSTEM_VERSION: 'system:version',

  // ─── Auth (Stage 1) ─────────────────────────────────────
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_SESSION: 'auth:session',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',

  // ─── Company (Stage 1) ──────────────────────────────────
  COMPANY_LIST: 'company:list',
  COMPANY_GET: 'company:get',
  COMPANY_CREATE: 'company:create',
  COMPANY_UPDATE: 'company:update',
  COMPANY_DELETE: 'company:delete',
  COMPANY_SET_ACTIVE: 'company:set-active',

  // ─── Financial Year (Stage 1) ───────────────────────────
  FY_LIST: 'fy:list',
  FY_GET: 'fy:get',
  FY_CREATE: 'fy:create',
  FY_UPDATE: 'fy:update',
  FY_ACTIVATE: 'fy:activate',
  FY_CLOSE: 'fy:close',

  // ─── Users (Stage 1) ───────────────────────────────────
  USER_LIST: 'user:list',
  USER_GET: 'user:get',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // ─── Account Group (Stage 2) ────────────────────────────
  ACCOUNT_GROUP_LIST: 'account-group:list',
  ACCOUNT_GROUP_TREE: 'account-group:tree',
  ACCOUNT_GROUP_GET: 'account-group:get',
  ACCOUNT_GROUP_CREATE: 'account-group:create',
  ACCOUNT_GROUP_UPDATE: 'account-group:update',
  ACCOUNT_GROUP_DELETE: 'account-group:delete',

  // ─── Account (Stage 2) ─────────────────────────────────
  ACCOUNT_LIST: 'account:list',
  ACCOUNT_GET: 'account:get',
  ACCOUNT_CREATE: 'account:create',
  ACCOUNT_UPDATE: 'account:update',
  ACCOUNT_DELETE: 'account:delete',
  ACCOUNT_SEARCH: 'account:search',

  // ─── Broker (Stage 2) ───────────────────────────────────
  BROKER_LIST: 'broker:list',
  BROKER_GET: 'broker:get',
  BROKER_CREATE: 'broker:create',
  BROKER_UPDATE: 'broker:update',
  BROKER_DELETE: 'broker:delete',

  // ─── Account Group seed ─────────────────────────────────
  ACCOUNT_GROUP_SEED: 'account-group:seed',

  // ─── Quality (Stage 2) ─────────────────────────────────
  QUALITY_LIST: 'quality:list',
  QUALITY_GET: 'quality:get',
  QUALITY_CREATE: 'quality:create',
  QUALITY_UPDATE: 'quality:update',
  QUALITY_DELETE: 'quality:delete',
  QUALITY_HSN_LIST: 'quality:hsn-list',

  // ─── Stock (Stage 3) ───────────────────────────────────
  STOCK_LIST: 'stock:list',
  STOCK_GET: 'stock:get',
  STOCK_CREATE: 'stock:create',
  STOCK_UPDATE: 'stock:update',
  STOCK_SEARCH: 'stock:search',
  STOCK_TIMELINE: 'stock:timeline',
  STOCK_DELETE: 'stock:delete',
  STOCK_PREVIEW_ID: 'stock:preview-id',
  STOCK_SHAPES_LIST: 'stock:shapes-list',

  // ─── Purchase (Stage 4) ────────────────────────────────
  PURCHASE_LIST: 'purchase:list',
  PURCHASE_GET: 'purchase:get',
  PURCHASE_CREATE: 'purchase:create',
  PURCHASE_UPDATE: 'purchase:update',
  PURCHASE_DELETE: 'purchase:delete',

  // ─── Sale (Stage 5) ────────────────────────────────────
  SALE_LIST: 'sale:list',
  SALE_GET: 'sale:get',
  SALE_CREATE: 'sale:create',
  SALE_UPDATE: 'sale:update',
  SALE_DELETE: 'sale:delete',

  // ─── Challan (Stage 6) ────────────────────────────────
  CHALLAN_LIST: 'challan:list',
  CHALLAN_GET: 'challan:get',
  CHALLAN_CREATE: 'challan:create',
  CHALLAN_UPDATE: 'challan:update',
  CHALLAN_RETURN: 'challan:return',

  // ─── Cash/Bank (Stage 7) ──────────────────────────────
  CASHBANK_LIST: 'cashbank:list',
  CASHBANK_GET: 'cashbank:get',
  CASHBANK_CREATE: 'cashbank:create',
  CASHBANK_UPDATE: 'cashbank:update',

  // ─── Journal Voucher (Stage 7) ─────────────────────────
  JV_LIST: 'jv:list',
  JV_GET: 'jv:get',
  JV_CREATE: 'jv:create',
  JV_UPDATE: 'jv:update',

  // ─── Job Book (Stage 8) ───────────────────────────────
  JOB_LIST: 'job:list',
  JOB_GET: 'job:get',
  JOB_CREATE: 'job:create',
  JOB_UPDATE: 'job:update',

  // ─── Reports (Stage 9) ───────────────────────────────
  REPORT_LEDGER: 'report:ledger',
  REPORT_TRIAL_BALANCE: 'report:trial-balance',
  REPORT_PNL: 'report:pnl',
  REPORT_BALANCE_SHEET: 'report:balance-sheet',
  REPORT_OUTSTANDING: 'report:outstanding',
  REPORT_STOCK: 'report:stock',
  REPORT_GST: 'report:gst',
  REPORT_GST_DASHBOARD: 'report:gst-dashboard',
  REPORT_GSTR1: 'report:gstr1',
  REPORT_GSTR1_JSON: 'report:gstr1-json',

  // ─── Settings (Stage 10) ─────────────────────────────
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
