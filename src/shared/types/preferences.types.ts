// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Shared System Preferences Types
// ═══════════════════════════════════════════════════════════════

import type { CurrencyCode } from './exchange-rate.types';

export interface ISystemPreferences {
  timeFormat: '12H' | '24H';
  dateFormat: string; // Read-only "DD-MM-YYYY"
  requireLoginOnStartup: boolean;
  // Currency Settings (Multi-Currency Support)
  defaultCurrency: CurrencyCode;  // Pre-fill currency on new transactions
  showDualCurrency: boolean;       // Show both $ and ₹ amounts across UI
}

export const DEFAULT_SYSTEM_PREFERENCES: ISystemPreferences = {
  timeFormat: '12H',
  dateFormat: 'DD-MM-YYYY',
  requireLoginOnStartup: false,
  defaultCurrency: 'USD',         // Diamond industry default
  showDualCurrency: true,
};
