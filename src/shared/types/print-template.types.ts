// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Print Template Configuration Types
// Shared between backend & frontend for layout config JSON shape
// ═══════════════════════════════════════════════════════════════

/** Header & branding section toggles */
export interface IPrintHeaderConfig {
  showCompanyLogo: boolean;
  logoPath?: string | null;
  showCompanyName: boolean;
  showAddress: boolean;
  showContact: boolean;
  showGstin: boolean;
  showPan: boolean;
  showTan: boolean;
  showMsme: boolean;
  headerAlignment: 'left' | 'center';
}

/** Party & shipment section toggles */
export interface IPrintPartyConfig {
  showBillingAddress: boolean;
  showShippingAddress: boolean;
  showPartyGstin: boolean;
  showPartyContact: boolean;
  showTransportDetails: boolean;
}

/** Item table column visibility toggles */
export interface IPrintItemTableConfig {
  showSrNoColumn: boolean;
  showHsnColumn: boolean;
  showQuantityColumn: boolean;
  showDiscountColumn: boolean;
  showPurityColumn: boolean;
  showPacketIdColumn: boolean;
}

/** Footer section toggles and custom text */
export interface IPrintFooterConfig {
  showBankDetails: boolean;
  showPaymentQr: boolean;
  paymentQrImagePath?: string | null;
  showTermsConditions: boolean;
  customTermsText: string;
  showDeclaration: boolean;
  declarationText: string;
  showSignatureBlock: boolean;
  signatory1Label: string;
  signatory2Label: string;
  signatory3Label: string;
  signatureCount: number;
  signatures: string[];
}

/** Watermark overlay configuration (text or image) */
export interface IPrintWatermarkConfig {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  imagePath: string | null;
  opacity: number;
  rotation: number;
  fontSize: number;
}

/** Invoice copy label configuration */
export interface IPrintCopyLabelConfig {
  enabled: boolean;
  copies: string[];
  defaultCopyCount: number;
}

/** Page layout settings (border, font size, margins, paper size, layout mode) */
export interface IPrintPageSettingsConfig {
  showPageBorder: boolean;
  fontSize: 'small' | 'medium' | 'large';
  margins: 'tight' | 'normal' | 'wide';
  paperSize: 'A4' | 'A5' | 'LETTER';
  orientation: 'portrait' | 'landscape';
  layoutMode: 'SINGLE_PAGE' | 'SIDE_BY_SIDE_TWIN';
}

/** E-Invoice / GST compliance placeholders */
export interface IPrintEInvoiceConfig {
  showIrnNumber: boolean;
  showEInvoiceQr: boolean;
}

/** Full layout configuration stored as JSON in the PrintTemplate table */
export interface IPrintLayoutConfig {
  header: IPrintHeaderConfig;
  party: IPrintPartyConfig;
  itemTable: IPrintItemTableConfig;
  footer: IPrintFooterConfig;
  watermark: IPrintWatermarkConfig;
  copyLabel: IPrintCopyLabelConfig;
  pageSettings: IPrintPageSettingsConfig;
  eInvoice: IPrintEInvoiceConfig;
}

/** Default layout config — used when no saved config exists (backward compatibility) */
export const DEFAULT_LAYOUT_CONFIG: IPrintLayoutConfig = {
  header: {
    showCompanyLogo: false,
    logoPath: null,
    showCompanyName: true,
    showAddress: true,
    showContact: true,
    showGstin: true,
    showPan: true,
    showTan: false,
    showMsme: false,
    headerAlignment: 'left',
  },
  party: {
    showBillingAddress: true,
    showShippingAddress: false,
    showPartyGstin: true,
    showPartyContact: true,
    showTransportDetails: false,
  },
  itemTable: {
    showSrNoColumn: true,
    showHsnColumn: true,
    showQuantityColumn: false,
    showDiscountColumn: false,
    showPurityColumn: true,
    showPacketIdColumn: true,
  },
  footer: {
    showBankDetails: true,
    showPaymentQr: false,
    paymentQrImagePath: null,
    showTermsConditions: true,
    customTermsText: '1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to Surat jurisdiction only.\n3. We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.',
    showDeclaration: true,
    declarationText: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    showSignatureBlock: true,
    signatory1Label: 'Prepared By',
    signatory2Label: 'Checked By',
    signatory3Label: 'Authorized Signatory',
    signatureCount: 3,
    signatures: ['Prepared By', 'Checked By', 'Authorized Signatory', 'Partner', 'Director', 'Auditor', 'Manager', 'Accountant', 'Verified By', 'Approved By'],
  },
  watermark: {
    enabled: false,
    type: 'text',
    text: 'ORIGINAL',
    imagePath: null,
    opacity: 0.08,
    rotation: -35,
    fontSize: 72,
  },
  copyLabel: {
    enabled: false,
    copies: ['Original for Buyer', 'Duplicate for Transporter', 'Triplicate for Supplier'],
    defaultCopyCount: 1,
  },
  pageSettings: {
    showPageBorder: false,
    fontSize: 'medium',
    margins: 'normal',
    paperSize: 'A4',
    orientation: 'portrait',
    layoutMode: 'SINGLE_PAGE',
  },
  eInvoice: {
    showIrnNumber: false,
    showEInvoiceQr: false,
  },
};

/** Merge partial config from DB with defaults (handles missing keys gracefully) */
export function mergeWithDefaults(
  partial: Partial<IPrintLayoutConfig> | null | undefined,
  voucherType?: string
): IPrintLayoutConfig {
  const isMemoType = Boolean(voucherType && (voucherType.startsWith('MEMO_') || voucherType.startsWith('CHALLAN_')));
  const defaultLayoutMode = isMemoType ? 'SIDE_BY_SIDE_TWIN' : 'SINGLE_PAGE';
  const defaultOrientation = isMemoType ? 'landscape' : 'portrait';

  const mergedPageSettings: IPrintPageSettingsConfig = {
    ...DEFAULT_LAYOUT_CONFIG.pageSettings,
    layoutMode: defaultLayoutMode,
    orientation: defaultOrientation,
    ...(partial?.pageSettings || {}),
  };

  if (!partial) {
    return {
      ...DEFAULT_LAYOUT_CONFIG,
      pageSettings: mergedPageSettings,
    };
  }

  return {
    header: { ...DEFAULT_LAYOUT_CONFIG.header, ...(partial.header || {}) },
    party: { ...DEFAULT_LAYOUT_CONFIG.party, ...(partial.party || {}) },
    itemTable: { ...DEFAULT_LAYOUT_CONFIG.itemTable, ...(partial.itemTable || {}) },
    footer: {
      ...DEFAULT_LAYOUT_CONFIG.footer,
      ...(partial.footer || {}),
      signatures: partial.footer?.signatures || [
        partial.footer?.signatory1Label || 'Prepared By',
        partial.footer?.signatory2Label || 'Checked By',
        partial.footer?.signatory3Label || 'Authorized Signatory',
        'Partner',
        'Director',
        'Auditor',
        'Manager',
        'Accountant',
        'Verified By',
        'Approved By'
      ]
    },
    watermark: { ...DEFAULT_LAYOUT_CONFIG.watermark, ...(partial.watermark || {}) },
    copyLabel: { ...DEFAULT_LAYOUT_CONFIG.copyLabel, ...(partial.copyLabel || {}) },
    pageSettings: mergedPageSettings,
    eInvoice: { ...DEFAULT_LAYOUT_CONFIG.eInvoice, ...(partial.eInvoice || {}) },
  };
}
