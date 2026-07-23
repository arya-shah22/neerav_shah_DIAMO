// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Audit & Security Settings Definitions
// ═══════════════════════════════════════════════════════════════

export interface IAuditSecuritySettings {
  auditLevel: 'BASIC' | 'STANDARD' | 'DETAILED';
  editDraft: boolean;
  editPostApproval: boolean;
  sessionTimeoutMinutes: number; // 0 to disable
  concurrentLoginsLimit: number; // 0 to disable
  maxFailedLoginAttempts: number; // 0 to disable
  lockoutDurationMinutes: number;
}

export const DEFAULT_AUDIT_SECURITY_SETTINGS: IAuditSecuritySettings = {
  auditLevel: 'STANDARD',
  editDraft: true,
  editPostApproval: false,
  sessionTimeoutMinutes: 15,
  concurrentLoginsLimit: 0,
  maxFailedLoginAttempts: 5,
  lockoutDurationMinutes: 30,
};
