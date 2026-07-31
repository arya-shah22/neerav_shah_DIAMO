// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Settings Page (Stock ID & Voucher Naming Configuration)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Barcode, FileText, ShieldAlert, ArrowLeft, ChevronRight, Database, Sliders, ShieldCheck, History, Heart, KeyRound } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, useToast } from '../../components/ui';
import { useCompanyStore } from '../../state/company-store';
import { PrintTemplateConfig } from './PrintTemplateConfig';
import { BackupConfig } from './BackupConfig';
import { PreferencesConfig } from './PreferencesConfig';
import { SecurityConfig } from './SecurityConfig';
import { AuditLogViewer } from './AuditLogViewer';
import { HealthDashboard } from './HealthDashboard';
import { LicenseConfig } from './LicenseConfig';

interface VoucherTypeDefinition {
  type: string;
  label: string;
  defaultPrefix: string;
}

const VOUCHER_TYPES: VoucherTypeDefinition[] = [
  { type: 'STOCK_ENTRY', label: 'Stock Packet Naming ID', defaultPrefix: 'DM' },
  { type: 'SALE_INVOICE', label: 'Sale Invoice', defaultPrefix: 'SI' },
  { type: 'SALE_RETURN', label: 'Sale Return Credit Note', defaultPrefix: 'SR' },
  { type: 'SALE_DEBIT_NOTE', label: 'Sale Debit Note', defaultPrefix: 'SDN' },
  { type: 'PURCHASE_INVOICE', label: 'Purchase Invoice', defaultPrefix: 'PI' },
  { type: 'PURCHASE_RETURN', label: 'Purchase Return Debit Note', defaultPrefix: 'PR' },
  { type: 'PURCHASE_DEBIT_NOTE', label: 'Purchase Credit Note', defaultPrefix: 'PDN' },
  { type: 'MEMO_TRADING', label: 'Memo — Jhanghad Trading', defaultPrefix: 'MM-T' },
  { type: 'MEMO_JOB_WORK', label: 'Memo — Job Work Issue', defaultPrefix: 'MM-JW' },
  { type: 'MEMO_SALE_ORDER', label: 'Memo — Sale Order', defaultPrefix: 'MM-SO' },
  { type: 'MEMO_PURCHASE_ORDER', label: 'Memo — Purchase Order', defaultPrefix: 'MM-PO' },
  { type: 'JOB_INCOME', label: 'Job Book Income', defaultPrefix: 'JI' },
  { type: 'JOB_EXPENSE', label: 'Job Book Expense', defaultPrefix: 'JE' },
  { type: 'JOURNAL_VOUCHER', label: 'Journal Voucher', defaultPrefix: 'JV' },
  { type: 'CASH_PAYMENT', label: 'Cash Payment', defaultPrefix: 'CP' },
  { type: 'CASH_RECEIPT', label: 'Cash Receipt', defaultPrefix: 'CR' },
  { type: 'BANK_PAYMENT', label: 'Bank Payment', defaultPrefix: 'BP' },
  { type: 'BANK_RECEIPT', label: 'Bank Receipt', defaultPrefix: 'BR' },
  { type: 'LOAN_VOUCHER', label: 'Loan Book Voucher', defaultPrefix: 'LN' }
];

export const SettingsPage: React.FC = () => {
  const { companyId, isReady } = useActiveCompany();
  const { showToast } = useToast();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  // settings sub-pages active tab
  const [activeTab, setActiveTab] = useState<'menu' | 'numbering' | 'print' | 'backup' | 'preferences' | 'security' | 'audit' | 'health' | 'license'>('menu');

  // ─── Voucher Configs State ───
  const { invoke: getAllVoucherConfigs } = useIpc<any>('stock:get-all-configs');
  const { invoke: saveVoucherConfig, loading: savingVoucher } = useIpc<any>('stock:save-voucher-config');
  const [voucherConfigs, setVoucherConfigs] = useState<Record<string, any>>({});
  const [selectedVType, setSelectedVType] = useState<string>('STOCK_ENTRY');

  // Selected Voucher Edit States
  const [vPrefix, setVPrefix] = useState('');
  const [vSeparator, setVSeparator] = useState('-');
  const [vSuffix, setVSuffix] = useState('');
  const [vDigitLength, setVDigitLength] = useState(6);
  const [vIncludeYear, setVIncludeYear] = useState(true);
  const [vIncludeMonth, setVIncludeMonth] = useState(false);

  // Load All configurations
  const loadConfigurations = React.useCallback(() => {
    if (!companyId || !activeFinancialYear?.id) return;

    // Load all configs
    getAllVoucherConfigs({ companyId, financialYearId: activeFinancialYear.id }).then((res) => {
      if (res.success && res.data) {
        const mapped: Record<string, any> = {};
        res.data.forEach((cfg: any) => {
          mapped[cfg.voucherType] = cfg;
        });
        setVoucherConfigs(mapped);
      }
    });
  }, [companyId, activeFinancialYear?.id, getAllVoucherConfigs]);

  useEffect(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  // Sync selected voucher form when selection changes
  useEffect(() => {
    const vDef = VOUCHER_TYPES.find((v) => v.type === selectedVType);
    const config = voucherConfigs[selectedVType];
    if (config) {
      setVPrefix(config.prefix || vDef?.defaultPrefix || '');
      setVSeparator(config.separator || '-');
      setVSuffix(config.suffix || '');
      setVDigitLength(config.digitLength || 6);
      setVIncludeYear(config.includeYear !== false);
      setVIncludeMonth(config.includeMonth === true);
    } else {
      setVPrefix(vDef?.defaultPrefix || '');
      setVSeparator('-');
      setVSuffix('');
      setVDigitLength(6);
      setVIncludeYear(true);
      setVIncludeMonth(false);
    }
  }, [selectedVType, voucherConfigs]);

  // Live previews
  const getVoucherPreview = () => {
    const padded = '1'.padStart(vDigitLength, '0');
    const prefixStr = vPrefix || selectedVType.split('_')[0];
    const suffixStr = vSuffix ? `${vSeparator}${vSuffix}` : '';
    const monthStr = new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase();

    if (selectedVType === 'STOCK_ENTRY') {
      const year = new Date().getFullYear();
      let datePart = '';
      if (vIncludeMonth && vIncludeYear) {
        datePart = `${monthStr}${year}`;
      } else if (vIncludeMonth) {
        datePart = monthStr;
      } else if (vIncludeYear) {
        datePart = String(year);
      }

      if (datePart) {
        return `${prefixStr}${vSeparator}${datePart}${vSeparator}${padded}${suffixStr}`;
      }
      return `${prefixStr}${vSeparator}${padded}${suffixStr}`;
    }

    const yearLabel = (activeFinancialYear as any)?.label || (activeFinancialYear ? `${new Date(activeFinancialYear.fromDate).getFullYear().toString().slice(-2)}${new Date(activeFinancialYear.toDate).getFullYear().toString().slice(-2)}` : '2627');
    const yearSuffix = yearLabel.slice(-4); // e.g. 2627
    let datePart = '';
    if (vIncludeMonth && vIncludeYear) {
      datePart = `${monthStr}${yearSuffix}`;
    } else if (vIncludeMonth) {
      datePart = monthStr;
    } else if (vIncludeYear) {
      datePart = yearSuffix;
    }

    if (datePart) {
      return `${prefixStr}${vSeparator}${datePart}${vSeparator}${padded}${suffixStr}`;
    }
    return `${prefixStr}${vSeparator}${padded}${suffixStr}`;
  };

  const handleSaveVoucher = async () => {
    if (!companyId || !activeFinancialYear?.id) return;
    if (!vPrefix.trim()) {
      showToast('Prefix is required', 'error');
      return;
    }
    const res = await saveVoucherConfig({
      companyId,
      financialYearId: activeFinancialYear.id,
      voucherType: selectedVType,
      data: {
        prefix: vPrefix.toUpperCase().trim(),
        separator: vSeparator,
        suffix: vSuffix.toUpperCase().trim(),
        digitLength: vDigitLength,
        includeYear: vIncludeYear,
        includeMonth: vIncludeMonth,
      },
    });
     if (res.success) {
      if (res.data?.message) {
        showToast(res.data.message, 'success');
      } else {
        showToast(`${VOUCHER_TYPES.find(v => v.type === selectedVType)?.label} configuration updated`, 'success');
      }
      loadConfigurations();
    } else {
      showToast(res.error || 'Failed to save voucher configuration', 'error');
    }
  };

  if (!isReady) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px' }}>
        <ShieldAlert size={48} color="var(--color-primary-light)" />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>Please select an active company first.</p>
      </div>
    );
  }

  if (activeTab === 'menu') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%', maxWidth: '1200px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
            System Settings
          </h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
            Configure and customize rules, templates, layouts, and business defaults.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '12px' }}>
          {/* Card 1: Document Numbering & Stock ID Rules */}
          <div 
            onClick={() => setActiveTab('numbering')}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-light)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', color: 'var(--color-primary)' }}>
                <Barcode size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Numbering & ID Rules</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Customize prefixes, separators, suffixes, digit length, and yearly resetting parameters for packet IDs and vouchers.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', alignSelf: 'flex-end' }}>
              Configure Rules <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 2: Print Template Configuration (Phase 13.5 Placeholder/Integration point) */}
          <div 
            onClick={() => setActiveTab('print')}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-light)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', color: '#059669' }}>
                <FileText size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Print Template Config</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Manage design layouts, visual toggles, company logs, and bank details for printed invoices and challans.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#059669', alignSelf: 'flex-end' }}>
              Configure Templates <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 3: Backup & Recovery */}
          <div 
            onClick={() => setActiveTab('backup')}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-light)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '8px', color: '#d97706' }}>
                <Database size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Backup & Recovery</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Configure scheduled database backups, set retention thresholds, and perform recovery operations.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#d97706', alignSelf: 'flex-end' }}>
              Configure Backups <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 4: System Preferences */}
          <div 
            onClick={() => setActiveTab('preferences')}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-light)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '8px', color: '#0369a1' }}>
                <Sliders size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>System Preferences</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Configure company-wide workspace defaults, date layouts, and time display notations.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#0369a1', alignSelf: 'flex-end' }}>
              Configure Preferences <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 5: Security & Activity Locks */}
          <div 
            onClick={() => setActiveTab('security')}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-light)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', color: '#dc2626' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Security & Audit Locks</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Configure DB audit levels, draft editing constraints, soft delete policies, and session auto-timeouts.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#dc2626', alignSelf: 'flex-end' }}>
              Configure Security <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 6: Audit Log Registry Trails */}
          <div 
            onClick={() => setActiveTab('audit')}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-light)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#faf5ff', padding: '12px', borderRadius: '8px', color: '#7e22ce' }}>
                <History size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Audit Log Trails</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Inspect immutable database adjustments, logins history, override logs, and module action logs.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#7e22ce', alignSelf: 'flex-end' }}>
              Inspect Audit Trails <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 7: Database & System Diagnostics */}
          <div 
            onClick={() => setActiveTab('health')}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-light)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', color: '#059669' }}>
                <Heart size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Database & Diagnostics</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Monitor MySQL performance indicators, run file system diagnostic wizard, rebuild indexes, and defragment tables.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#059669', alignSelf: 'flex-end' }}>
              Defragment & Diagnostics <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 8: License & Activation Controls */}
          <div 
            onClick={() => setActiveTab('license')}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-light)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', color: '#dc2626' }}>
                <KeyRound size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>License & Activation</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Configure offline software license activation parameters, allocate profile limits, and view version release history.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#dc2626', alignSelf: 'flex-end' }}>
              Licensing & Version <ChevronRight size={14} />
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (activeTab === 'preferences') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => setActiveTab('menu')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              System Preferences
            </h1>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Configure company-wide workspace defaults, date layouts, and time display notations.
            </p>
          </div>
        </div>

        <PreferencesConfig companyId={companyId!} />
      </div>
    );
  }

  if (activeTab === 'backup') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => setActiveTab('menu')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              Backup & Recovery Management
            </h1>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Configure scheduled database backups, set retention thresholds, and perform recovery operations.
            </p>
          </div>
        </div>

        <BackupConfig companyId={companyId!} />
      </div>
    );
  }

  if (activeTab === 'print') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => setActiveTab('menu')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              Print Template Configuration
            </h1>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Configure invoice display styles, watermarks, and layout toggles per document type.
            </p>
          </div>
        </div>

        <PrintTemplateConfig companyId={companyId!} />
      </div>
    );
  }

  if (activeTab === 'security') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => setActiveTab('menu')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              Security & Audit Locks Configuration
            </h1>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Configure DB audit levels, draft editing constraints, soft delete policies, and session timeouts.
            </p>
          </div>
        </div>

        <SecurityConfig companyId={companyId!} />
      </div>
    );
  }

  if (activeTab === 'audit') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => setActiveTab('menu')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              Audit Log History Trails
            </h1>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Inspect immutable database modifications, actions, override details, and state change snapshots.
            </p>
          </div>
        </div>

        <AuditLogViewer />
      </div>
    );
  }

  if (activeTab === 'health') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => setActiveTab('menu')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              Database Health & Systems Diagnostics
            </h1>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Observe live workstation resources, evaluate index fragments, analyze query latency, and defragment records.
            </p>
          </div>
        </div>

        <HealthDashboard companyId={companyId!} />
      </div>
    );
  }

  if (activeTab === 'license') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => setActiveTab('menu')} style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              License Registration & Version Info
            </h1>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              View application activation keys, resource constraints, systems load, and release notes history.
            </p>
          </div>
        </div>

        <LicenseConfig companyId={companyId!} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" onClick={() => setActiveTab('menu')} style={{ padding: '8px' }}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
            Document Numbering & Stock ID Rules
          </h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
            Customize ID generation rules, prefixes, separators, suffixes, and counter digits for diamond packets and transactions.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Panel: List of Vouchers */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          maxHeight: '650px',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', background: '#fafafa' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Auto-Generation Rules</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Select any item to configure its naming layout.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {VOUCHER_TYPES.map((v) => {
              const config = voucherConfigs[v.type];
              const active = selectedVType === v.type;
              return (
                <button
                  key={v.type}
                  onClick={() => setSelectedVType(v.type)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px 16px',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    background: active ? '#eff6ff' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: active ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                    {v.label}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', fontFamily: 'monospace' }}>
                    Prefix: {config?.prefix || v.defaultPrefix} {config?.suffix ? `| Suffix: ${config.suffix}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Editing Form Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>
              Configure: {VOUCHER_TYPES.find(v => v.type === selectedVType)?.label}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Customize how your {VOUCHER_TYPES.find(v => v.type === selectedVType)?.label} IDs are generated.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Prefix */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Prefix *
              </label>
              <Input
                value={vPrefix}
                onChange={(e) => setVPrefix(e.target.value.toUpperCase())}
                placeholder="Prefix"
              />
            </div>

            {/* Suffix */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Suffix
              </label>
              <Input
                value={vSuffix}
                onChange={(e) => setVSuffix(e.target.value.toUpperCase())}
                placeholder="Suffix (Optional)"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Separator */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Separator *
              </label>
              <Input
                value={vSeparator}
                onChange={(e) => setVSeparator(e.target.value)}
                placeholder="e.g. - or /"
              />
            </div>

            {/* Digit Length */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Sequence Digits Length *
              </label>
              <Input
                type="number"
                value={vDigitLength || ''}
                onChange={(e) => setVDigitLength(Number(e.target.value))}
                placeholder="e.g. 5"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="includeYearCheck"
                type="checkbox"
                checked={vIncludeYear}
                onChange={(e) => setVIncludeYear(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="includeYearCheck" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Include Year in ID (Automatic)
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="includeMonthCheck"
                type="checkbox"
                checked={vIncludeMonth}
                onChange={(e) => setVIncludeMonth(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="includeMonthCheck" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Include Month in ID (Automatic)
              </label>
            </div>
          </div>

          {/* Live Preview block */}
          <div style={{
            background: '#f8fafc',
            border: '1px dashed var(--color-primary-light)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)' }}>
              <RefreshCw size={14} className="animate-spin" /> LIVE PREVIEW
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}>
              {getVoucherPreview()}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              This is a representation of the next generated ID.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <Button variant="primary" onClick={handleSaveVoucher} loading={savingVoucher} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> Save Configurations
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
