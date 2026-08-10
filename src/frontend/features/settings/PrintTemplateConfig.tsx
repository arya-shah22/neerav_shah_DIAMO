// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Print Template Configuration Page
// Settings sub-page with toggle controls + live A4 preview
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, RotateCcw, Upload, Type, Image, Copy, X } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { useCompanyStore } from '../../state/company-store';
import { Button, useToast } from '../../components/ui';
import {
  IPrintLayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  mergeWithDefaults,
} from '../../../shared/types/print-template.types';

// ─── Document types for print template configuration ──────────
interface PrintDocType {
  type: string;
  label: string;
}

const PRINT_DOC_TYPES: PrintDocType[] = [
  { type: 'SALE_INVOICE', label: 'Sale Invoice' },
  { type: 'SALE_RETURN', label: 'Sale Return (Credit Note)' },
  { type: 'SALE_DEBIT_NOTE', label: 'Sale Debit Note' },
  { type: 'PURCHASE_INVOICE', label: 'Purchase Invoice' },
  { type: 'PURCHASE_RETURN', label: 'Purchase Return (Debit Note)' },
  { type: 'PURCHASE_DEBIT_NOTE', label: 'Purchase Credit Note' },
  { type: 'MEMO_TRADING', label: 'Memo — Jhanghad Trading' },
  { type: 'MEMO_JOB_WORK', label: 'Memo — Job Work Issue' },
  { type: 'MEMO_SALE_ORDER', label: 'Memo — Sale Order' },
  { type: 'MEMO_PURCHASE_ORDER', label: 'Memo — Purchase Order' },
  { type: 'JOB_INCOME', label: 'Job Work Billing — Client Copy' },
  { type: 'JOB_EXPENSE', label: 'Job Work Billing — Manufacturer Copy' },
  { type: 'CASH_PAYMENT', label: 'Cash Payment' },
  { type: 'CASH_RECEIPT', label: 'Cash Receipt' },
  { type: 'BANK_PAYMENT', label: 'Bank Payment' },
  { type: 'BANK_RECEIPT', label: 'Bank Receipt' },
  { type: 'JOURNAL_VOUCHER', label: 'Journal Voucher' },
  { type: 'LOAN_VOUCHER', label: 'Loan Voucher' },
];

// ─── Helper: Toggle Row ─────────────────────────────────────
const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
    />
    <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{label}</span>
  </div>
);

// ─── Helper: Section Header ─────────────────────────────────
const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 0 6px', borderBottom: '1px solid var(--color-border)',
    marginBottom: '8px', marginTop: '12px',
  }}>
    <span style={{ fontSize: '16px' }}>{icon}</span>
    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
  </div>
);

// ─── Helper: Radio Group ─────────────────────────────────────
const RadioGroup: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ label, options, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 0' }}>
    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</span>
    <div style={{ display: 'flex', gap: '16px' }}>
      {options.map((opt) => (
        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-primary)' }}>
          <input type="radio" name={label} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} style={{ accentColor: 'var(--color-primary)' }} />
          {opt.label}
        </label>
      ))}
    </div>
  </div>
);
const isValidImageSrc = (src: any): src is string => {
  if (!src || typeof src !== 'string') return false;
  return src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('file://') || src.startsWith('/');
};

// ─── Main Component ─────────────────────────────────────────
interface PrintTemplateConfigProps {
  companyId: number;
}

export const PrintTemplateConfig: React.FC<PrintTemplateConfigProps> = ({ companyId }) => {
  const { showToast } = useToast();
  const { activeCompany } = useActiveCompany();

  const [selectedDocType, setSelectedDocType] = useState(PRINT_DOC_TYPES[0].type);
  const [config, setConfig] = useState<IPrintLayoutConfig>({ ...DEFAULT_LAYOUT_CONFIG });
  const [allTemplates, setAllTemplates] = useState<Record<string, IPrintLayoutConfig>>({});

  // Copy Modal State
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  // Company Scope State (Auto-ticked apply to all firms)
  const [applyToAllFirms, setApplyToAllFirms] = useState(true);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([companyId]);

  const { companies: storeCompanies } = useCompanyStore();
  const { data: ipcCompanies, invoke: fetchCompanies } = useIpc<any[]>('company:list');
  const { invoke: getTemplateConfig } = useIpc<IPrintLayoutConfig>('print:get-template-config');
  const { invoke: saveTemplateConfig, loading: saving } = useIpc<any>('print:save-template-config');
  const { invoke: getAllTemplates } = useIpc<Record<string, IPrintLayoutConfig>>('print:get-all-templates');
  const { invoke: resetTemplateConfig } = useIpc<any>('print:reset-template-config');
  const { invoke: copyTemplateConfig, loading: copying } = useIpc<any>('print:copy-template-config');

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    setSelectedCompanyIds([companyId]);
  }, [companyId]);

  const companyListToRender = useMemo(() => {
    let list = (ipcCompanies && ipcCompanies.length > 0) ? ipcCompanies : storeCompanies;
    if (!list || list.length === 0) {
      if (activeCompany) {
        list = [activeCompany];
      }
    }
    return list || [];
  }, [ipcCompanies, storeCompanies, activeCompany]);

  // Load all template configs
  const loadAllTemplates = useCallback(async () => {
    const res = await getAllTemplates({ companyId });
    if (res.success && res.data) {
      setAllTemplates(res.data);
    }
  }, [companyId]);

  // Load config for selected doc type
  const loadConfig = useCallback(async () => {
    const res = await getTemplateConfig({ companyId, voucherType: selectedDocType });
    if (res.success && res.data) {
      setConfig(mergeWithDefaults(res.data));
    } else {
      setConfig({ ...DEFAULT_LAYOUT_CONFIG });
    }
  }, [companyId, selectedDocType]);

  useEffect(() => { loadAllTemplates(); }, [loadAllTemplates]);
  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => {
    console.log('[PrintTemplateConfig] Current logoPath:', config.header.logoPath);
  }, [config.header.logoPath]);
  const chunkSignatures = (sigs: string[], count: number) => {
    const activeSigs = sigs.slice(0, count);
    const chunks = [];
    for (let i = 0; i < activeSigs.length; i += 3) {
      chunks.push(activeSigs.slice(i, i + 3));
    }
    return chunks;
  };

  // Update a nested config key
  const updateConfig = <K extends keyof IPrintLayoutConfig>(
    section: K,
    key: keyof IPrintLayoutConfig[K],
    value: any,
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleSave = async () => {
    const targetCompanyIds = applyToAllFirms
      ? (companyListToRender || []).map((c: any) => c.id)
      : selectedCompanyIds;

    const res = await saveTemplateConfig({
      companyId,
      voucherType: selectedDocType,
      layoutConfig: config,
      targetCompanyIds,
    });
    if (res.success) {
      showToast(res.data?.message || 'Print template saved', 'success');
      loadAllTemplates();
    } else {
      showToast(res.error || 'Failed to save', 'error');
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all print template settings to factory defaults for this document type?')) {
      const res = await resetTemplateConfig({ companyId, voucherType: selectedDocType });
      if (res.success) {
        setConfig({ ...DEFAULT_LAYOUT_CONFIG });
        showToast('Template reset to factory defaults', 'success');
        loadAllTemplates();
      } else {
        showToast(res.error || 'Failed to reset', 'error');
      }
    }
  };

  const handleOpenCopyModal = () => {
    setSelectedTargets([]);
    setShowCopyModal(true);
  };

  const handleToggleTarget = (type: string) => {
    setSelectedTargets(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSelectAllTargets = () => {
    const available = PRINT_DOC_TYPES.filter(d => d.type !== selectedDocType).map(d => d.type);
    if (selectedTargets.length === available.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(available);
    }
  };

  const handleExecuteCopy = async () => {
    if (selectedTargets.length === 0) {
      showToast('Please select at least one target document type', 'error');
      return;
    }

    const res = await copyTemplateConfig({
      companyId,
      sourceVoucherType: selectedDocType,
      targetVoucherTypes: selectedTargets,
      layoutConfig: config,
    });

    if (res.success) {
      showToast(res.data?.message || `Layout copied to ${selectedTargets.length} document types`, 'success');
      setShowCopyModal(false);
      setSelectedTargets([]);
      loadAllTemplates();
    } else {
      showToast(res.error || 'Failed to copy template layout', 'error');
    }
  };

  // Watermark image upload handler
  const handleWatermarkImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/svg+xml';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        showToast('Image must be under 500KB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateConfig('watermark', 'imagePath', ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Header company logo upload handler
  const handleHeaderLogoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/svg+xml';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        showToast('Image must be under 500KB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateConfig('header', 'logoPath', ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Payment QR Code image upload handler
  const handlePaymentQrUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/svg+xml';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 1000 * 1024) {
        showToast('QR Code image must be under 1MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateConfig('footer', 'paymentQrImagePath', ev.target?.result as string);
        showToast('Custom Payment QR Code uploaded successfully', 'success');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Font size, margin, and paper size mappings
  const fontSizeMap = { small: '10px', medium: '12px', large: '14px' };
  const marginMap = { tight: '10mm', normal: '20mm', wide: '30mm' };
  const baseFontSize = fontSizeMap[config.pageSettings.fontSize] || '12px';
  const pageMargin = marginMap[config.pageSettings.margins] || '20mm';

  const paperSizeSpecs = {
    A4: {
      portrait: { widthMm: 210, heightMm: 297, wrapperW: 460, wrapperH: 655, scale: 0.58 },
      landscape: { widthMm: 297, heightMm: 210, wrapperW: 600, wrapperH: 425, scale: 0.53 },
    },
    A5: {
      portrait: { widthMm: 148, heightMm: 210, wrapperW: 360, wrapperH: 510, scale: 0.64 },
      landscape: { widthMm: 210, heightMm: 148, wrapperW: 510, wrapperH: 360, scale: 0.64 },
    },
    LETTER: {
      portrait: { widthMm: 216, heightMm: 279, wrapperW: 460, wrapperH: 595, scale: 0.56 },
      landscape: { widthMm: 279, heightMm: 216, wrapperW: 595, wrapperH: 460, scale: 0.56 },
    },
  };

  const currentPaper = config.pageSettings.paperSize || 'A4';
  const currentOrientation = config.pageSettings.orientation || 'portrait';
  const previewSpec = paperSizeSpecs[currentPaper]?.[currentOrientation] || paperSizeSpecs.A4.portrait;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 340px 1fr', gap: '20px', alignItems: 'start', maxHeight: 'calc(100vh - 200px)' }}>
      {/* Column 1: Document Type Selector */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxHeight: '700px', overflowY: 'auto',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', background: '#fafafa' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Document Types</h3>
          <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Select to configure print layout</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {PRINT_DOC_TYPES.map((doc) => {
            const active = selectedDocType === doc.type;
            const hasConfig = !!allTemplates[doc.type];
            return (
              <button
                key={doc.type}
                onClick={() => setSelectedDocType(doc.type)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  background: active ? '#eff6ff' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.2s',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: active ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                  {doc.label}
                </span>
                {hasConfig && (
                  <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a', fontWeight: 600 }}>
                    Configured
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Column 2: Toggle Controls */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '16px', maxHeight: '700px', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 4px' }}>
          Template Options
        </h3>

        {/* Firm / Company Scope Options */}
        <SectionHeader icon="⚙️" title="Firm / Company Scope" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--color-border)', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="applyToAllFirms"
              checked={applyToAllFirms}
              onChange={(e) => setApplyToAllFirms(e.target.checked)}
              style={{ width: '15px', height: '15px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
            />
            <label htmlFor="applyToAllFirms" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
              Set this template for all firms (Auto-Ticked)
            </label>
          </div>

          {!applyToAllFirms && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '22px', paddingTop: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Select Companies to apply this layout to:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                {(companyListToRender || []).map((c: any) => {
                  const isActive = c.id === companyId;
                  const isChecked = isActive || selectedCompanyIds.includes(c.id);
                  const name = c.companyName || c.name || (isActive ? activeCompany?.companyName : null) || `Firm #${c.id}`;
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id={`co-tpl-${c.id}`}
                        checked={isChecked}
                        disabled={isActive}
                        onChange={() => {
                          if (isActive) return;
                          setSelectedCompanyIds(prev =>
                            prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        style={{ width: '14px', height: '14px', accentColor: 'var(--color-primary)', cursor: isActive ? 'not-allowed' : 'pointer' }}
                      />
                      <label
                        htmlFor={`co-tpl-${c.id}`}
                        style={{ fontSize: '11px', color: isActive ? 'var(--color-primary)' : '#1e293b', fontWeight: isActive ? 700 : 500, cursor: isActive ? 'not-allowed' : 'pointer' }}
                      >
                        {name} {isActive ? '(Current Active Firm)' : ''}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Header & Branding */}
        <SectionHeader icon="🏢" title="Header & Branding" />
        <ToggleRow label="Show Company Name" checked={config.header.showCompanyName} onChange={(v) => updateConfig('header', 'showCompanyName', v)} />
        <ToggleRow label="Show Company Logo" checked={config.header.showCompanyLogo} onChange={(v) => updateConfig('header', 'showCompanyLogo', v)} />
        {config.header.showCompanyLogo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--color-border)', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isValidImageSrc(activeCompany?.logoPath) ? (
                <>
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>✓ Logo loaded (Company Master)</span>
                  <img src={activeCompany!.logoPath!} alt="Preview" style={{ height: '24px', width: '60px', objectFit: 'contain', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '2px', padding: '1px' }} />
                </>
              ) : (
                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>✗ No logo found in Company Master</span>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={handleHeaderLogoUpload} style={{ marginTop: '6px', fontSize: '11px', padding: '4px 8px' }}>
              <Upload size={12} style={{ marginRight: '4px' }} /> Upload Custom Logo
            </Button>
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
              To change or update the logo, edit in Company Master or upload a custom template logo above.
            </p>
          </div>
        )}
        <ToggleRow label="Show Address" checked={config.header.showAddress} onChange={(v) => updateConfig('header', 'showAddress', v)} />
        <ToggleRow label="Show Contact Details" checked={config.header.showContact} onChange={(v) => updateConfig('header', 'showContact', v)} />
        <ToggleRow label="Show GSTIN" checked={config.header.showGstin} onChange={(v) => updateConfig('header', 'showGstin', v)} />
        <ToggleRow label="Show PAN" checked={config.header.showPan} onChange={(v) => updateConfig('header', 'showPan', v)} />
        <ToggleRow label="Show TAN" checked={config.header.showTan} onChange={(v) => updateConfig('header', 'showTan', v)} />
        <ToggleRow label="Show MSME / Udyam" checked={config.header.showMsme} onChange={(v) => updateConfig('header', 'showMsme', v)} />
        <RadioGroup label="Header Alignment" value={config.header.headerAlignment} onChange={(v) => updateConfig('header', 'headerAlignment', v)}
          options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]} />

        {/* Party & Shipment */}
        <SectionHeader icon="👤" title={selectedDocType === 'LOAN_VOUCHER' || ['CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER'].includes(selectedDocType) ? "Party Details" : "Party & Shipment"} />
        <ToggleRow label={selectedDocType === 'LOAN_VOUCHER' || ['CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER'].includes(selectedDocType) ? "Show Party Details Box" : "Show Billing Address"} checked={config.party.showBillingAddress} onChange={(v) => updateConfig('party', 'showBillingAddress', v)} />
        {selectedDocType !== 'LOAN_VOUCHER' && !['CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER'].includes(selectedDocType) && (
          <ToggleRow label="Show Shipping Address" checked={config.party.showShippingAddress} onChange={(v) => updateConfig('party', 'showShippingAddress', v)} />
        )}
        <ToggleRow label="Show Party GSTIN" checked={config.party.showPartyGstin} onChange={(v) => updateConfig('party', 'showPartyGstin', v)} />
        <ToggleRow label="Show Party Contact" checked={config.party.showPartyContact} onChange={(v) => updateConfig('party', 'showPartyContact', v)} />
        {selectedDocType !== 'LOAN_VOUCHER' && !['CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER'].includes(selectedDocType) && (
          <ToggleRow label="Show Transport Details" checked={config.party.showTransportDetails} onChange={(v) => updateConfig('party', 'showTransportDetails', v)} />
        )}

        {/* Item Table / Loan Summary */}
        {selectedDocType === 'LOAN_VOUCHER' ? (
          <>
            <SectionHeader icon="📋" title="Loan Voucher Details" />
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', margin: '4px 0 8px', lineHeight: 1.4 }}>
              ℹ️ <strong>Loan Voucher Mode:</strong> Principal Amount, Interest Rate, Duration, Estimated Interest, and Balance are automatically formatted into the voucher table. Item inventory columns are hidden for this template type.
            </div>
          </>
        ) : ['CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER'].includes(selectedDocType) ? (
          <>
            <SectionHeader icon="📋" title="Voucher Details" />
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', margin: '4px 0 8px', lineHeight: 1.4 }}>
              ℹ️ <strong>{selectedDocType === 'JOURNAL_VOUCHER' ? 'Journal' : 'Cash/Bank'} Voucher Mode:</strong> {selectedDocType === 'JOURNAL_VOUCHER' ? 'Debit/Credit posting lines, ledger accounts, amounts, tax adjustments, and narration are formatted automatically.' : 'Transaction details, Party name, Net Amount, reference bills, and narrations are formatted automatically.'} Item inventory columns are hidden for this template type.
            </div>
          </>
        ) : (
          <>
            <SectionHeader icon="📦" title="Item Table Columns" />
            <ToggleRow label="Show SR # Column" checked={config.itemTable.showSrNoColumn} onChange={(v) => updateConfig('itemTable', 'showSrNoColumn', v)} />
            <ToggleRow label="Show HSN/SAC Code" checked={config.itemTable.showHsnColumn} onChange={(v) => updateConfig('itemTable', 'showHsnColumn', v)} />
            <ToggleRow label="Show Quantities Column" checked={config.itemTable.showQuantityColumn} onChange={(v) => updateConfig('itemTable', 'showQuantityColumn', v)} />
            <ToggleRow label="Show Discount Column" checked={config.itemTable.showDiscountColumn} onChange={(v) => updateConfig('itemTable', 'showDiscountColumn', v)} />
            <ToggleRow label="Show Purity/Carat" checked={config.itemTable.showPurityColumn} onChange={(v) => updateConfig('itemTable', 'showPurityColumn', v)} />
            <ToggleRow label="Show Packet ID Reference" checked={config.itemTable.showPacketIdColumn} onChange={(v) => updateConfig('itemTable', 'showPacketIdColumn', v)} />
          </>
        )}

        {/* Bank & Payment */}
        <SectionHeader icon="🏦" title="Bank & Payment" />
        <ToggleRow label="Show Company Bank Details" checked={config.footer.showBankDetails} onChange={(v) => updateConfig('footer', 'showBankDetails', v)} />
        <ToggleRow label="Show Payment QR Code" checked={config.footer.showPaymentQr} onChange={(v) => updateConfig('footer', 'showPaymentQr', v)} />
        {config.footer.showPaymentQr && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--color-border)', margin: '4px 0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              {isValidImageSrc(config.footer.paymentQrImagePath) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={config.footer.paymentQrImagePath!} alt="Payment QR" style={{ height: '32px', width: '32px', objectFit: 'contain', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px' }} />
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>✓ Custom QR Uploaded</span>
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Using Default System QR</span>
              )}
              <Button variant="secondary" size="sm" onClick={handlePaymentQrUpload} style={{ fontSize: '11px', padding: '4px 8px' }}>
                <Upload size={12} style={{ marginRight: '4px' }} /> Upload Custom QR
              </Button>
            </div>
            {isValidImageSrc(config.footer.paymentQrImagePath) && (
              <button onClick={() => updateConfig('footer', 'paymentQrImagePath', null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                ✕ Remove Custom QR Code Image
              </button>
            )}
          </div>
        )}

        {/* Terms, Declaration & Signatures */}
        <SectionHeader icon="📝" title="Terms & Signatures" />
        <ToggleRow label="Show Terms & Conditions" checked={config.footer.showTermsConditions} onChange={(v) => updateConfig('footer', 'showTermsConditions', v)} />
        {config.footer.showTermsConditions && (
          <textarea
            value={config.footer.customTermsText}
            onChange={(e) => updateConfig('footer', 'customTermsText', e.target.value)}
            rows={5}
            style={{
              width: '100%',
              minHeight: '90px',
              fontSize: '12px',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              resize: 'vertical',
              fontFamily: 'inherit',
              marginTop: '6px',
              marginBottom: '6px',
              boxSizing: 'border-box',
              display: 'block'
            }}
            placeholder="Custom Terms & Conditions..."
          />
        )}
        <ToggleRow label="Show Declaration" checked={config.footer.showDeclaration} onChange={(v) => updateConfig('footer', 'showDeclaration', v)} />
        {config.footer.showDeclaration && (
          <textarea
            value={config.footer.declarationText}
            onChange={(e) => updateConfig('footer', 'declarationText', e.target.value)}
            rows={3}
            style={{
              width: '100%',
              minHeight: '70px',
              fontSize: '12px',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              resize: 'vertical',
              fontFamily: 'inherit',
              marginTop: '6px',
              marginBottom: '6px',
              boxSizing: 'border-box',
              display: 'block'
            }}
            placeholder="Custom Declaration Text..."
          />
        )}
        <ToggleRow label="Show Signature Block" checked={config.footer.showSignatureBlock} onChange={(v) => updateConfig('footer', 'showSignatureBlock', v)} />
        {config.footer.showSignatureBlock && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Signatures:</span>
              <select
                value={config.footer.signatureCount || 3}
                onChange={(e) => updateConfig('footer', 'signatureCount', parseInt(e.target.value))}
                style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
              >
                <option value={1}>1 Signature</option>
                <option value={2}>2 Signatures</option>
                <option value={3}>3 Signatures</option>
                <option value={4}>4 Signatures</option>
                <option value={5}>5 Signatures</option>
                <option value={6}>6 Signatures</option>
                <option value={7}>7 Signatures</option>
                <option value={8}>8 Signatures</option>
                <option value={9}>9 Signatures</option>
                <option value={10}>10 Signatures</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Array.from({ length: config.footer.signatureCount || 3 }).map((_, idx) => (
                <input
                  key={idx}
                  value={config.footer.signatures?.[idx] || ''}
                  onChange={(e) => {
                    const newSigs = [...(config.footer.signatures || [])];
                    newSigs[idx] = e.target.value;
                    updateConfig('footer', 'signatures', newSigs);
                    if (idx === 0) updateConfig('footer', 'signatory1Label', e.target.value);
                    if (idx === 1) updateConfig('footer', 'signatory2Label', e.target.value);
                    if (idx === 2) updateConfig('footer', 'signatory3Label', e.target.value);
                  }}
                  placeholder={`Signature ${idx + 1} Name`}
                  style={{ fontSize: '11px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Watermark */}
        <SectionHeader icon="💧" title="Watermark" />
        <ToggleRow label="Enable Watermark" checked={config.watermark.enabled} onChange={(v) => updateConfig('watermark', 'enabled', v)} />
        {config.watermark.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                <input type="radio" checked={config.watermark.type === 'text'} onChange={() => updateConfig('watermark', 'type', 'text')} style={{ accentColor: 'var(--color-primary)' }} />
                <Type size={14} /> Text
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                <input type="radio" checked={config.watermark.type === 'image'} onChange={() => updateConfig('watermark', 'type', 'image')} style={{ accentColor: 'var(--color-primary)' }} />
                <Image size={14} /> Image
              </label>
            </div>

            {config.watermark.type === 'text' ? (
              <input value={config.watermark.text} onChange={(e) => updateConfig('watermark', 'text', e.target.value)} placeholder="Watermark text" style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button variant="ghost" size="sm" onClick={handleWatermarkImageUpload} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Upload size={12} /> Upload Logo
                </Button>
                {config.watermark.imagePath && <span style={{ fontSize: '10px', color: '#16a34a' }}>✓ Image loaded</span>}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', minWidth: '50px' }}>Opacity:</span>
              <input type="range" min="0.03" max="0.25" step="0.01" value={config.watermark.opacity} onChange={(e) => updateConfig('watermark', 'opacity', parseFloat(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: '11px', fontFamily: 'monospace', minWidth: '30px' }}>{(config.watermark.opacity * 100).toFixed(0)}%</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', minWidth: '50px' }}>Rotation:</span>
              <input type="range" min="-60" max="0" step="5" value={config.watermark.rotation} onChange={(e) => updateConfig('watermark', 'rotation', parseInt(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: '11px', fontFamily: 'monospace', minWidth: '30px' }}>{config.watermark.rotation}°</span>
            </div>

            {config.watermark.type === 'text' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', minWidth: '50px' }}>Size:</span>
                <input type="range" min="40" max="120" step="4" value={config.watermark.fontSize} onChange={(e) => updateConfig('watermark', 'fontSize', parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: '11px', fontFamily: 'monospace', minWidth: '30px' }}>{config.watermark.fontSize}px</span>
              </div>
            )}
          </div>
        )}

        {/* Copy Labels */}
        <SectionHeader icon="📄" title="Invoice Copy Labels" />
        <ToggleRow label="Enable Copy Labels" checked={config.copyLabel.enabled} onChange={(v) => updateConfig('copyLabel', 'enabled', v)} />
        {config.copyLabel.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Copies:</span>
              <select value={config.copyLabel.defaultCopyCount} onChange={(e) => updateConfig('copyLabel', 'defaultCopyCount', parseInt(e.target.value))} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <option value={1}>1 Copy</option>
                <option value={2}>2 Copies</option>
                <option value={3}>3 Copies</option>
              </select>
            </div>
            {config.copyLabel.copies.slice(0, config.copyLabel.defaultCopyCount).map((label, idx) => (
              <input
                key={idx}
                value={label}
                onChange={(e) => {
                  const newCopies = [...config.copyLabel.copies];
                  newCopies[idx] = e.target.value;
                  updateConfig('copyLabel', 'copies', newCopies);
                }}
                placeholder={`Copy ${idx + 1} label`}
                style={{ fontSize: '11px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
              />
            ))}
          </div>
        )}

        {/* Page & Layout */}
        <SectionHeader icon="📐" title="Page & Layout" />
        <RadioGroup label="Layout Pattern" value={config.pageSettings.layoutMode || 'SINGLE_PAGE'} onChange={(v) => updateConfig('pageSettings', 'layoutMode', v)}
          options={[{ value: 'SINGLE_PAGE', label: 'Single Page' }, { value: 'SIDE_BY_SIDE_TWIN', label: 'Twin Slips (Side-by-Side)' }]} />
        <RadioGroup label="Paper Size" value={config.pageSettings.paperSize || 'A4'} onChange={(v) => updateConfig('pageSettings', 'paperSize', v)}
          options={[{ value: 'A4', label: 'A4' }, { value: 'A5', label: 'A5' }, { value: 'LETTER', label: 'Letter' }]} />
        <RadioGroup label="Orientation" value={config.pageSettings.orientation || 'portrait'} onChange={(v) => updateConfig('pageSettings', 'orientation', v)}
          options={[{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]} />
        <ToggleRow label="Show Page Border" checked={config.pageSettings.showPageBorder} onChange={(v) => updateConfig('pageSettings', 'showPageBorder', v)} />
        <RadioGroup label="Font Size" value={config.pageSettings.fontSize} onChange={(v) => updateConfig('pageSettings', 'fontSize', v)}
          options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} />
        <RadioGroup label="Page Margins" value={config.pageSettings.margins} onChange={(v) => updateConfig('pageSettings', 'margins', v)}
          options={[{ value: 'tight', label: 'Tight' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }]} />



        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <Button variant="primary" onClick={handleSave} loading={saving} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', padding: '8px 8px' }}>
            <Save size={14} /> Save
          </Button>
          <Button variant="secondary" onClick={handleOpenCopyModal} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '8px 10px' }}>
            <Copy size={14} /> Copy To...
          </Button>
          <Button variant="ghost" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '8px 8px' }}>
            <RotateCcw size={14} /> Reset
          </Button>
        </div>
      </div>

      {/* Column 3: Live A4 Preview */}
      <div style={{
        background: '#e2e8f0', borderRadius: 'var(--radius-lg)', padding: '20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        maxHeight: '700px', overflowY: 'auto',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Live Preview — {config.pageSettings.paperSize || 'A4'} {(config.pageSettings.orientation || 'portrait').toUpperCase()} {config.pageSettings.layoutMode === 'SIDE_BY_SIDE_TWIN' ? '(Side-by-Side Twin Slips)' : ''}
        </div>

        {/* Scaled wrapper container */}
        <div style={{
          width: `${previewSpec.wrapperW}px`,
          height: `${previewSpec.wrapperH}px`,
          overflow: 'hidden',
          position: 'relative',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          background: '#fff',
          transition: 'all 0.3s ease',
        }}>
          {/* Scaled page container */}
          <div style={{
            width: `${previewSpec.widthMm}mm`,
            minHeight: `${previewSpec.heightMm}mm`,
            transform: `scale(${previewSpec.scale})`,
            transformOrigin: 'top left',
            position: 'absolute', top: 0, left: 0,
            background: '#fff',
            padding: pageMargin, boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: baseFontSize,
            color: '#000', overflow: 'hidden',
            border: config.pageSettings.showPageBorder ? '3px double #000' : '1px solid #cbd5e1',
            display: config.pageSettings.layoutMode === 'SIDE_BY_SIDE_TWIN' ? 'flex' : 'block',
            justifyContent: 'space-between',
            gap: '16px',
            transition: 'all 0.3s ease',
          }}>
            {(() => {
              const isTwinLayout = config.pageSettings.layoutMode === 'SIDE_BY_SIDE_TWIN';
              const isA5 = config.pageSettings.paperSize === 'A5';
              const isLandscape = config.pageSettings.orientation === 'landscape';
              const isCompact = isA5 || (isTwinLayout && isLandscape);

              const renderSinglePreviewCopy = (copyTitle: string) => (
                <div style={{
                  width: isTwinLayout ? '48.5%' : '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isCompact ? '4px' : isTwinLayout ? '10px' : '16px',
                  padding: isTwinLayout ? (isCompact ? '6px' : '10px') : '0',
                  border: isTwinLayout ? '1px solid #cbd5e1' : 'none',
                  borderRadius: isTwinLayout ? '6px' : '0',
                  boxSizing: 'border-box',
                  position: 'relative',
                  overflow: 'hidden',
                  zIndex: 2,
                }}>
                  {/* Watermark Overlay for individual slip */}
                  {config.watermark.enabled && (
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: `translate(-50%, -50%) rotate(${config.watermark.rotation}deg)`,
                      opacity: config.watermark.opacity, pointerEvents: 'none', zIndex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: '100%', overflow: 'hidden',
                    }}>
                      {config.watermark.type === 'text' ? (
                        <span style={{
                          fontSize: isCompact ? `${Math.round((config.watermark.fontSize || 48) * 0.45)}px` : isTwinLayout ? `${Math.round((config.watermark.fontSize || 48) * 0.6)}px` : `${config.watermark.fontSize || 48}px`,
                          fontWeight: 900,
                          color: '#000', whiteSpace: 'nowrap', letterSpacing: '4px',
                          textTransform: 'uppercase',
                        }}>
                          {config.watermark.text || 'WATERMARK'}
                        </span>
                      ) : config.watermark.imagePath ? (
                        <img src={config.watermark.imagePath} alt="Watermark" style={{ maxWidth: '60%', maxHeight: '60%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#ccc' }}>No Image</span>
                      )}
                    </div>
                  )}
                  {/* Copy Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {isTwinLayout && (
                      <span style={{ fontSize: isCompact ? '8px' : '9px', fontWeight: 700, padding: '1px 5px', border: '1px solid #94a3b8', borderRadius: '3px', color: '#475569', textTransform: 'uppercase' }}>
                        {copyTitle}
                      </span>
                    )}
                    {config.copyLabel.enabled && !isTwinLayout && (
                      <div style={{
                        fontSize: isCompact ? '0.75em' : '0.85em', fontWeight: 700, color: '#1e40af',
                        background: '#dbeafe', padding: '2px 8px', borderRadius: '4px',
                        border: '1px solid #93c5fd',
                      }}>
                        {config.copyLabel.copies[0] || 'Original'}
                      </div>
                    )}
                  </div>

                  {/* Company Letterhead */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    borderBottom: '2px solid #000', paddingBottom: isCompact ? '4px' : '10px',
                    ...(config.header.headerAlignment === 'center' ? { flexDirection: 'column', alignItems: 'center', textAlign: 'center' as const } : {}),
                  }}>
                    <div style={{ display: 'flex', gap: isCompact ? '6px' : '12px', alignItems: 'center', ...(config.header.headerAlignment === 'center' ? { flexDirection: 'column' } : {}) }}>
                      {config.header.showCompanyLogo && isValidImageSrc(config.header.logoPath || activeCompany?.logoPath) && (
                        <img
                          src={config.header.logoPath || activeCompany?.logoPath || undefined}
                          alt="Company Logo"
                          style={{
                            maxHeight: isCompact ? (isTwinLayout ? '22px' : '32px') : isTwinLayout ? '36px' : '55px',
                            maxWidth: '120px',
                            objectFit: 'contain',
                            marginBottom: config.header.headerAlignment === 'center' ? (isCompact ? '4px' : '8px') : 0
                          }}
                        />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '3px' : '6px', ...(config.header.headerAlignment === 'center' ? { alignItems: 'center', textAlign: 'center' } : {}) }}>
                        {config.header.showCompanyName && (
                          <h1 style={{ fontSize: isCompact ? (isTwinLayout ? '0.95em' : '1.2em') : isTwinLayout ? '1.3em' : '1.7em', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, marginBottom: isCompact ? '3px' : '6px' }}>
                            {activeCompany?.companyName || 'DIAMO ERP'}
                          </h1>
                        )}
                        {config.header.showAddress && (
                          <span style={{ fontSize: isCompact ? '0.68em' : '0.8em', color: '#475569', lineHeight: 1.45 }}>
                            {activeCompany?.addressLine1 || 'Surat, Gujarat, India'} {activeCompany?.addressLine2 || ''}
                          </span>
                        )}
                        <span style={{ fontSize: isCompact ? '0.68em' : '0.8em', color: '#475569', lineHeight: 1.45 }}>
                          {config.header.showGstin && `GSTIN: ${activeCompany?.gstinNumber || '24AAAAA0000A1Z0'}`}
                          {config.header.showGstin && config.header.showPan && ' | '}
                          {config.header.showPan && `PAN: ${activeCompany?.panNumber || 'AAAAA0000A'}`}
                          {config.header.showTan && ` | TAN: ${activeCompany?.tanNumber || 'TANSR12345F'}`}
                          {config.header.showMsme && ` | MSME: ${activeCompany?.udyamMsme || 'UDYAM-GJ-00-12345'}`}
                        </span>
                        {config.header.showContact && (
                          <span style={{ fontSize: isCompact ? '0.68em' : '0.8em', color: '#475569', lineHeight: 1.45 }}>
                            {`Mobile: ${activeCompany?.mobile || '+91 98765 43210'}`}
                            {` | Email: ${activeCompany?.email || 'info@diamo.com'}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: config.header.headerAlignment === 'center' ? 'center' : 'flex-end', justifyContent: 'center', marginTop: config.header.headerAlignment === 'center' ? (isCompact ? '4px' : '8px') : 0 }}>
                      <div style={{ background: '#000', color: '#fff', padding: isCompact ? '0.2em 0.4em' : '0.3em 0.6em', fontSize: isCompact ? '0.7em' : isTwinLayout ? '0.85em' : '0.95em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {PRINT_DOC_TYPES.find(d => d.type === selectedDocType)?.label?.toUpperCase() || 'TAX INVOICE'}
                      </div>
                    </div>
                  </div>

                  {/* Party Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: (config.party.showShippingAddress || config.party.showTransportDetails) ? (isCompact ? '1fr 1fr' : '1fr 1fr 1fr') : isTwinLayout ? '1.2fr 1fr' : '1.5fr 1fr', gap: isCompact ? '4px' : '8px', fontSize: isCompact ? '0.75em' : '0.85em' }}>
                    {config.party.showBillingAddress && (
                      <div style={{ border: '1px solid #cbd5e1', padding: isCompact ? '3px 5px' : '6px', borderRadius: '4px' }}>
                        <h3 style={{ margin: '0 0 1px', fontSize: isCompact ? '0.7em' : '0.8em', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                          {selectedDocType === 'LOAN_VOUCHER' ? 'PARTY / CLIENT' : selectedDocType === 'JOB_EXPENSE' ? 'Issued To (Subcontractor / Manufacturer)' : 'Billed To'}
                        </h3>
                        <div style={{ fontWeight: 700, fontSize: isCompact ? '0.85em' : '0.95em' }}>Ajay Shah</div>
                        {config.party.showPartyGstin && <div style={{ fontSize: '0.75em', color: '#334155' }}>GSTIN: 24BBBBB0000B1Z5</div>}
                        <div style={{ fontSize: '0.75em', color: '#334155' }}>Surat, Gujarat 395003</div>
                        {config.party.showPartyContact && <div style={{ fontSize: '0.75em', color: '#334155' }}>Mob: +91 98765 43210</div>}
                      </div>
                    )}
                    {config.party.showShippingAddress && (
                      <div style={{ border: '1px solid #cbd5e1', padding: isCompact ? '3px 5px' : '6px', borderRadius: '4px' }}>
                        <h3 style={{ margin: '0 0 1px', fontSize: isCompact ? '0.7em' : '0.8em', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Shipped To</h3>
                        <div style={{ fontWeight: 700, fontSize: isCompact ? '0.85em' : '0.95em' }}>Warehouse Address</div>
                        <div style={{ fontSize: '0.75em', color: '#334155' }}>Surat 395010</div>
                      </div>
                    )}
                    {config.party.showTransportDetails && (
                      <div style={{ border: '1px solid #cbd5e1', padding: isCompact ? '3px 5px' : '6px', borderRadius: '4px' }}>
                        <h3 style={{ margin: '0 0 1px', fontSize: isCompact ? '0.7em' : '0.8em', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Transport</h3>
                        <div style={{ fontSize: '0.75em', color: '#334155' }}>ABC Express</div>
                        <div style={{ fontSize: '0.75em', color: '#334155' }}>LR: LR-2026-001</div>
                      </div>
                    )}
                    <div style={{ border: '1px solid #cbd5e1', padding: isCompact ? '3px 5px' : '6px', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                        <span style={{ color: '#64748b', fontWeight: 600, fontSize: isCompact ? '0.7em' : '0.8em' }}>Doc No:</span>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: isCompact ? '0.8em' : '0.9em' }}>DM-2627-001</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: 600, fontSize: isCompact ? '0.7em' : '0.8em' }}>Date:</span>
                        <span style={{ fontSize: isCompact ? '0.7em' : '0.8em' }}>{new Date().toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Item Table / Loan Details */}
                  {selectedDocType === 'LOAN_VOUCHER' ? (
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.78em' : '0.92em', margin: '4px 0' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #000' }}>
                            <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'left', fontWeight: 700 }}>Voucher Details</th>
                            <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>Value / Narration</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Loan Type</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>LOAN TAKEN (PAYABLE)</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Principal Amount</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>₹1,00,000.00</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Interest Rate</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right' }}>0% P.A. (SIMPLE Interest)</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Duration</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right' }}>12 Month(s)</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Total Estimated Interest</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right' }}>₹0.00</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Repayable Balance</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>₹1,00,000.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : ['CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT'].includes(selectedDocType) ? (
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.78em' : '0.92em', margin: '4px 0' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #000' }}>
                            <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'left', fontWeight: 700 }}>Transaction Details</th>
                            <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>Value / Info</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Transaction Type</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', textTransform: 'uppercase', fontWeight: 700 }}>
                              {selectedDocType.replace('_', ' ')}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Party / Account Name</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>Ajay Shah</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Amount</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                              ₹1,150.00
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Reference Bill Number</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                              SALE-2627-000015
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Remarks / Narration</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontStyle: 'italic', color: '#475569' }}>
                              Applied Notes adjustment: ₹600 (Credit Note Offset)
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : selectedDocType === 'JOURNAL_VOUCHER' ? (
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.78em' : '0.95em', margin: '4px 0' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #000' }}>
                            <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'left', fontWeight: 700 }}>Particulars (Account Name)</th>
                            <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700, width: '120px' }}>Debit (₹)</th>
                            <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700, width: '120px' }}>Credit (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 500, paddingLeft: '8px' }}>
                              Office Rent Expense <span style={{ float: 'right', fontSize: '0.85em', color: '#64748b', marginRight: '8px' }}>Dr</span>
                            </td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>₹25,000.00</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right' }}>—</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 500, paddingLeft: '24px' }}>
                              To HDFC Bank Account <span style={{ float: 'right', fontSize: '0.85em', color: '#64748b', marginRight: '8px' }}>Cr</span>
                            </td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right' }}>—</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>₹25,000.00</td>
                          </tr>
                        </tbody>
                      </table>
                      <div style={{ fontSize: '0.80em', color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                        <div><strong>Remarks:</strong> July Month Office Rent Paid | <strong>Adjustments:</strong> SGST: 9%, CGST: 9%</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.72em' : '0.85em' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #000' }}>
                            {config.itemTable.showSrNoColumn && <th style={{ padding: isCompact ? '2px' : '4px', textAlign: 'left' }}>#</th>}
                            <th style={{ padding: isCompact ? '2px' : '4px', textAlign: 'left' }}>PARTICULARS</th>
                            {config.itemTable.showHsnColumn && <th style={{ padding: isCompact ? '2px' : '4px', textAlign: 'center' }}>HSN</th>}
                            {config.itemTable.showQuantityColumn && <th style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>QTY</th>}
                            {config.itemTable.showPurityColumn && <th style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>CARATS</th>}
                            <th style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>PCS</th>
                            <th style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>RATE</th>
                            {config.itemTable.showDiscountColumn && <th style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>DISC %</th>}
                            <th style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2].map((i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              {config.itemTable.showSrNoColumn && <td style={{ padding: isCompact ? '2px' : '4px' }}>{i}</td>}
                              <td style={{ padding: isCompact ? '2px' : '4px', fontWeight: 600 }}>
                                Round VVS1 Diamond
                                {config.itemTable.showPacketIdColumn && (
                                  <div style={{ fontSize: '0.75em', color: '#475569', marginTop: '1px', fontFamily: 'monospace' }}>Pkt: DM-2026-0000{i}</div>
                                )}
                              </td>
                              {config.itemTable.showHsnColumn && <td style={{ padding: isCompact ? '2px' : '4px', textAlign: 'center', fontSize: '0.85em' }}>71023910</td>}
                              {config.itemTable.showQuantityColumn && <td style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>{(1.0 * i).toFixed(2)}</td>}
                              {config.itemTable.showPurityColumn && <td style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>{(1.5 * i).toFixed(2)}</td>}
                              <td style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>{i}</td>
                              <td style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>₹{(50000 * i).toLocaleString('en-IN')}</td>
                              {config.itemTable.showDiscountColumn && <td style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right' }}>2%</td>}
                              <td style={{ padding: isCompact ? '2px' : '4px', textAlign: 'right', fontWeight: 600 }}>₹{(50000 * i).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Summary */}
                  <div style={{ borderTop: '2px solid #000', paddingTop: isCompact ? '3px' : '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: isCompact ? '0.78em' : '0.9em' }}>
                    {selectedDocType === 'LOAN_VOUCHER' ? (
                      <>
                        <span style={{ fontSize: '0.85em', color: '#475569', fontWeight: 500 }}>Rupees one lakh Only</span>
                        <span>NET AMOUNT: ₹1,00,000.00</span>
                      </>
                    ) : ['CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT'].includes(selectedDocType) ? (
                      <>
                        <span style={{ fontSize: '0.85em', color: '#475569', fontWeight: 500 }}>Rupees one thousand one hundred fifty Only</span>
                        <span>NET AMOUNT: ₹1,150.00</span>
                      </>
                    ) : selectedDocType === 'JOURNAL_VOUCHER' ? (
                      <>
                        <span style={{ fontSize: '0.85em', color: '#475569', fontWeight: 500 }}>Rupees twenty five thousand Only</span>
                        <span>NET AMOUNT: ₹25,000.00</span>
                      </>
                    ) : (
                      <>
                        <span>NET AMOUNT:</span>
                        <span>₹1,50,000.00</span>
                      </>
                    )}
                  </div>

                  {/* Company Bank Details & Payment QR */}
                  {(config.footer.showBankDetails || config.footer.showPaymentQr) && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: isCompact ? '2px' : '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isCompact ? '0.65em' : '0.75em', color: '#334155' }}>
                      {config.footer.showBankDetails ? (
                        <div>
                          <strong>Bank:</strong> {activeCompany?.bankName || 'State Bank of India'} (A/C: {activeCompany?.bankAccountNumber || '1234567890'}, IFSC: {activeCompany?.bankIfsc || 'SBIN0000001'})
                        </div>
                      ) : <div />}
                      {config.footer.showPaymentQr && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginLeft: '12px' }}>
                          <div style={{
                            width: isCompact ? '48px' : '72px',
                            height: isCompact ? '48px' : '72px',
                            background: '#ffffff',
                            border: '1.5px solid #0f172a',
                            borderRadius: '4px',
                            padding: '3px',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            overflow: 'hidden',
                          }}>
                            {isValidImageSrc(config.footer.paymentQrImagePath) ? (
                              <img
                                src={config.footer.paymentQrImagePath!}
                                alt="Payment QR"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                  <div style={{ width: isCompact ? '10px' : '16px', height: isCompact ? '10px' : '16px', border: '2px solid #000', background: '#000', boxSizing: 'border-box', padding: '1px' }}>
                                    <div style={{ width: '100%', height: '100%', background: '#fff' }} />
                                  </div>
                                  <div style={{ width: isCompact ? '10px' : '16px', height: isCompact ? '10px' : '16px', border: '2px solid #000', background: '#000', boxSizing: 'border-box', padding: '1px' }}>
                                    <div style={{ width: '100%', height: '100%', background: '#fff' }} />
                                  </div>
                                </div>
                                <div style={{ fontSize: isCompact ? '0.45em' : '0.62em', fontWeight: 800, textAlign: 'center', color: '#0f172a', letterSpacing: '0.5px' }}>
                                  UPI QR
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                                  <div style={{ width: isCompact ? '10px' : '16px', height: isCompact ? '10px' : '16px', border: '2px solid #000', background: '#000', boxSizing: 'border-box', padding: '1px' }}>
                                    <div style={{ width: '100%', height: '100%', background: '#fff' }} />
                                  </div>
                                  <div style={{ width: isCompact ? '6px' : '10px', height: isCompact ? '6px' : '10px', background: '#000' }} />
                                </div>
                              </>
                            )}
                          </div>
                          <span style={{ fontSize: isCompact ? '0.55em' : '0.65em', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scan & Pay</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Terms & Conditions */}
                  {config.footer.showTermsConditions && (
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: isCompact ? '2px' : '4px', fontSize: isCompact ? '0.62em' : '0.72em', color: '#0f172a', fontWeight: 600, lineHeight: 1.3 }}>
                      <strong style={{ color: '#000', fontWeight: 700 }}>Terms:</strong> {config.footer.customTermsText || 'Goods on memo are held at recipient risk.'}
                    </div>
                  )}

                  {/* Declaration */}
                  {config.footer.showDeclaration && (
                    <div style={{ fontSize: isCompact ? '0.58em' : '0.68em', color: '#1e293b', fontWeight: 600, fontStyle: 'italic', marginTop: '1px', lineHeight: 1.3 }}>
                      {config.footer.declarationText || 'We declare that this invoice shows actual price.'}
                    </div>
                  )}

                  {/* Signatures */}
                  {config.footer.showSignatureBlock && (
                    <div style={{ marginTop: 'auto', paddingTop: isCompact ? '4px' : '16px' }}>
                      {chunkSignatures(config.footer.signatures || [], config.footer.signatureCount || 3).map((rowSigs, rowIdx) => (
                        <div key={rowIdx} style={{ display: 'flex', justifyContent: 'center', gap: isCompact ? '8px' : isTwinLayout ? '16px' : '40px', marginTop: rowIdx > 0 ? (isCompact ? '4px' : '12px') : '0' }}>
                          {rowSigs.map((label, idx) => (
                            <div key={idx} style={{ width: isCompact ? (isTwinLayout ? '75px' : '95px') : (isTwinLayout ? '110px' : '140px'), textAlign: 'center' }}>
                              <div style={{ height: isCompact ? '14px' : isTwinLayout ? '22px' : '36px' }} />
                              <div style={{ borderTop: '1px dashed #64748b', paddingTop: '2px', fontSize: isCompact ? '0.68em' : '0.8em', fontWeight: 600, color: '#334155' }}>
                                {label || `Signatory ${rowIdx * 3 + idx + 1}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );

              if (isTwinLayout) {
                return (
                  <>
                    {renderSinglePreviewCopy('OFFICE COPY')}
                    {renderSinglePreviewCopy('CLIENT COPY')}
                  </>
                );
              }

              return renderSinglePreviewCopy('ORIGINAL');
            })()}
          </div>
        </div>
      </div>
      {/* Copy Template Modal */}
      {showCopyModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', width: '480px', maxWidth: '90vw',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Copy Layout Configuration</h3>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Copy settings from <strong>{PRINT_DOC_TYPES.find(d => d.type === selectedDocType)?.label}</strong> to other document types.
                </p>
              </div>
              <button onClick={() => setShowCopyModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', maxHeight: '380px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Select Target Document Types</span>
                <button
                  onClick={handleSelectAllTargets}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {selectedTargets.length === PRINT_DOC_TYPES.filter(d => d.type !== selectedDocType).length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {PRINT_DOC_TYPES.filter(d => d.type !== selectedDocType).map((doc) => {
                  const isChecked = selectedTargets.includes(doc.type);
                  return (
                    <div
                      key={doc.type}
                      onClick={() => handleToggleTarget(doc.type)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 10px', borderRadius: '6px',
                        border: isChecked ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: isChecked ? '#eff6ff' : 'var(--color-surface)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--color-primary)', width: '14px', height: '14px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: isChecked ? 600 : 400, color: isChecked ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                        {doc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="ghost" onClick={() => setShowCopyModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleExecuteCopy} loading={copying}>
                <Copy size={14} style={{ marginRight: '6px' }} />
                Copy to {selectedTargets.length} Document(s)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
