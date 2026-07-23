// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Shared System Preferences Types
// ═══════════════════════════════════════════════════════════════

export interface ISystemPreferences {
  timeFormat: '12H' | '24H';
  dateFormat: string; // Read-only "DD-MM-YYYY"
  requireLoginOnStartup: boolean;
}

export const DEFAULT_SYSTEM_PREFERENCES: ISystemPreferences = {
  timeFormat: '12H',
  dateFormat: 'DD-MM-YYYY',
  requireLoginOnStartup: false,
};
