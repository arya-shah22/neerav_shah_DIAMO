import React from 'react';
import { Printer, X } from 'lucide-react';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button } from './Button';
import { IPrintLayoutConfig, mergeWithDefaults } from '../../../shared/types/print-template.types';

const isValidImageSrc = (src: any): src is string => {
  if (!src || typeof src !== 'string') return false;
  return src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('file://') || src.startsWith('/');
};

interface PrintTemplateProps {
  type: 'INVOICE' | 'VOUCHER' | 'JOURNAL' | 'JOB' | 'LOAN';
  data: any;
  onClose: () => void;
  layoutConfig?: IPrintLayoutConfig;
}

export const PrintTemplate: React.FC<PrintTemplateProps> = ({ type, data, onClose, layoutConfig: rawConfig }) => {
  const { activeCompany } = useActiveCompany();
  const cfg = mergeWithDefaults(rawConfig || null);

  // Resolve custom declarations and terms from bill items' qualities if configured
  const qualityDeclarations = Array.from(
    new Set(
      (data?.items || [])
        .map((it: any) => it.quality?.declarationText || it.declarationText)
        .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
        .map((t: any) => t.trim())
    )
  );

  const qualityTerms = Array.from(
    new Set(
      (data?.items || [])
        .map((it: any) => it.quality?.termsConditions || it.termsConditions)
        .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
        .map((t: any) => t.trim())
    )
  );

  const resolvedTermsText = qualityTerms.length > 0
    ? qualityTerms.join('\n')
    : (cfg.footer.customTermsText || 'Goods on memo are held at recipient risk. Subject to Surat jurisdiction.');

  const resolvedDeclarationText = qualityDeclarations.length > 0
    ? qualityDeclarations.join('\n')
    : (cfg.footer.declarationText || 'We declare that this invoice shows the actual price of the goods described.');

  // Helper to convert number to currency words (USD / INR)
  const numberToWords = (num: number, currency: 'USD' | 'INR' = 'INR'): string => {
    try {
      const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
      const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

      const g = ['', 'thousand', 'lakh', 'crore'];

      const chunk = (n: number) => {
        let str = '';
        if (n > 99) {
          str += a[Math.floor(n / 100)] + 'hundred ';
          n %= 100;
        }
        if (n > 19) {
          str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
        } else {
          str += a[n];
        }
        return str;
      };

      let n = Math.floor(num);
      if (n === 0) return currency === 'USD' ? 'US Dollars Zero Only' : 'Rupees Zero Only';

      let i = 0;
      let word = '';

      // First chunk is thousand (hundreds + tens + ones)
      let temp = n % 1000;
      if (temp > 0) {
        word = chunk(temp);
      }
      n = Math.floor(n / 1000);

      // Remaining chunks are Lakh, Crore, etc.
      while (n > 0) {
        temp = n % 100;
        if (temp > 0) {
          word = chunk(temp) + g[i + 1] + ' ' + word;
        }
        n = Math.floor(n / 100);
        i++;
      }

      const prefix = currency === 'USD' ? 'US Dollars ' : 'Rupees ';
      return prefix + word.trim().replace(/\s+/g, ' ') + ' Only';
    } catch {
      return '';
    }
  };

  const getFinalAmount = () => {
    if (type === 'JOURNAL') {
      return Number(data.totalDebit || 0);
    }
    if (type === 'LOAN') {
      return Number((data.principalAmount || 0) + (data.totalInterest || 0));
    }
    return Number(data.netAmount || data.amount || 0);
  };

  const getDocTitle = () => {
    switch (type) {
      case 'INVOICE':
        return data.invoiceType?.replace('_', ' ') || 'TAX INVOICE';
      case 'VOUCHER':
        return data.transactionType?.replace('_', ' ') || 'CASH/BANK VOUCHER';
      case 'JOURNAL':
        return 'JOURNAL VOUCHER';
      case 'JOB':
        return 'JOB CARD / WORK ORDER';
      case 'LOAN':
        return data.loanType === 'GIVEN' ? 'LOAN VOUCHER (GIVEN)' : 'LOAN VOUCHER (TAKEN)';
      default:
        return 'DOCUMENT';
    }
  };

  const chunkSignatures = (sigs: string[], count: number) => {
    const activeSigs = sigs.slice(0, count);
    const chunks = [];
    for (let i = 0; i < activeSigs.length; i += 3) {
      chunks.push(activeSigs.slice(i, i + 3));
    }
    return chunks;
  };

  const party = data.party || data.customer || data.supplier;
  const isBankTx = type === 'VOUCHER' && (data.transactionType === 'BANK_PAYMENT' || data.transactionType === 'BANK_RECEIPT');

  // Config-driven layout variables
  const fontSizeMap = { small: '10px', medium: '12px', large: '14px' } as const;
  const marginMap = { tight: '10mm', normal: '20mm', wide: '30mm' } as const;
  const baseFontSize = fontSizeMap[cfg.pageSettings.fontSize] || '12px';
  const pageMargin = marginMap[cfg.pageSettings.margins] || '20mm';
  const pageBorder = cfg.pageSettings.showPageBorder ? '3px double #000' : 'none';

  // Paper size and orientation dimensions
  const paperSizeMap = {
    A4: { portrait: { width: '210mm', minHeight: '297mm' }, landscape: { width: '297mm', minHeight: '210mm' } },
    A5: { portrait: { width: '148mm', minHeight: '210mm' }, landscape: { width: '210mm', minHeight: '148mm' } },
    LETTER: { portrait: { width: '216mm', minHeight: '279mm' }, landscape: { width: '279mm', minHeight: '216mm' } },
  };

  const selectedSize = cfg.pageSettings.paperSize || 'A4';
  const selectedOrientation = cfg.pageSettings.orientation || 'portrait';
  const sheetDimensions = paperSizeMap[selectedSize]?.[selectedOrientation] || paperSizeMap.A4.portrait;
  const isTwinLayout = cfg.pageSettings.layoutMode === 'SIDE_BY_SIDE_TWIN';

  return (
    <div className="print-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      zIndex: 9999,
      padding: '40px 20px',
      overflowY: 'auto'
    }}>
      {/* Styles for print layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${selectedSize} ${selectedOrientation};
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          .print-modal-overlay, .print-modal-overlay * {
            visibility: visible !important;
          }
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: none !important;
            padding: 0 !important;
          }
          .print-no-display {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: ${pageMargin} !important;
            width: 100% !important;
            background: #fff !important;
            color: #000 !important;
            min-height: auto !important;
            height: auto !important;
            border-radius: 0 !important;
          }
        }
      ` }} />

      {/* Floating Toolbar */}
      <div className="print-no-display" style={{
        width: '100%',
        maxWidth: isTwinLayout ? '1000px' : '800px',
        background: '#1e293b',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>
          Print Preview — {selectedSize} {selectedOrientation.toUpperCase()} {isTwinLayout ? '(Side-by-Side Twin Copy)' : ''}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" size="sm" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={14} /> Print Document
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1' }}>
            <X size={14} /> Close
          </Button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="print-container" style={{
        width: sheetDimensions.width,
        minHeight: sheetDimensions.minHeight,
        boxSizing: 'border-box',
        background: '#ffffff',
        color: '#000000',
        padding: pageMargin,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: isTwinLayout ? 'row' : 'column',
        justifyContent: isTwinLayout ? 'space-between' : 'flex-start',
        gap: isTwinLayout ? '16px' : '24px',
        border: pageBorder !== 'none' ? pageBorder : '1px solid #cbd5e1',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: isTwinLayout ? `calc(${baseFontSize} - 1px)` : baseFontSize,
        position: 'relative',
      }}>
        {(() => {
          const isA5 = cfg.pageSettings.paperSize === 'A5';
          const isLandscape = cfg.pageSettings.orientation === 'landscape';
          const isCompact = isA5 || (isTwinLayout && isLandscape);

          const renderSingleVoucherCopy = (copyTitle: string) => (
            <div style={{
              width: isTwinLayout ? '48.5%' : '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: isCompact ? '6px' : isTwinLayout ? '12px' : '20px',
              padding: isTwinLayout ? (isCompact ? '6px' : '12px') : '0',
              border: isTwinLayout ? '1px solid #cbd5e1' : 'none',
              borderRadius: isTwinLayout ? '6px' : '0',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
              zIndex: 2,
            }}>
              {/* Individual Slip Watermark Overlay */}
              {cfg.watermark.enabled && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: `translate(-50%, -50%) rotate(${cfg.watermark.rotation}deg)`,
                  opacity: cfg.watermark.opacity, pointerEvents: 'none', zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: '100%', overflow: 'hidden',
                }}>
                  {cfg.watermark.type === 'text' ? (
                    <span style={{
                      fontSize: isCompact ? `${Math.round((cfg.watermark.fontSize || 48) * 0.45)}px` : isTwinLayout ? `${Math.round((cfg.watermark.fontSize || 48) * 0.65)}px` : `${cfg.watermark.fontSize || 48}px`,
                      fontWeight: 900,
                      color: '#000', whiteSpace: 'nowrap', letterSpacing: '4px',
                      textTransform: 'uppercase',
                    }}>
                      {cfg.watermark.text || 'WATERMARK'}
                    </span>
                  ) : cfg.watermark.imagePath ? (
                    <img src={cfg.watermark.imagePath} alt="Watermark" style={{ maxWidth: '60%', maxHeight: '60%', objectFit: 'contain' }} />
                  ) : null}
                </div>
              )}
              {/* Copy Badge / Label */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isTwinLayout && (
                  <span style={{ fontSize: isCompact ? '8px' : '9px', fontWeight: 700, padding: '1px 5px', border: '1px solid #94a3b8', borderRadius: '3px', color: '#475569', textTransform: 'uppercase' }}>
                    {copyTitle}
                  </span>
                )}
                {cfg.copyLabel.enabled && !isTwinLayout && (
                  <div style={{
                    fontSize: isCompact ? '0.75em' : '0.85em', fontWeight: 700, color: '#1e40af',
                    background: '#dbeafe', padding: '2px 8px', borderRadius: '4px',
                    border: '1px solid #93c5fd',
                  }}>
                    {cfg.copyLabel.copies[0] || 'Original'}
                  </div>
                )}
              </div>

              {/* Company Letterhead */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: isCompact ? '4px' : '12px',
                ...(cfg.header.headerAlignment === 'center' ? { flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const } : {}),
              }}>
                <div style={{ display: 'flex', gap: isCompact ? '6px' : '12px', alignItems: 'center', ...(cfg.header.headerAlignment === 'center' ? { flexDirection: 'column' as const } : {}) }}>
                  {cfg.header.showCompanyLogo && isValidImageSrc(cfg.header.logoPath || activeCompany?.logoPath) && (
                    <img
                      src={cfg.header.logoPath || activeCompany?.logoPath || undefined}
                      alt="Company Logo"
                      style={{
                        maxHeight: isCompact ? (isTwinLayout ? '24px' : '35px') : isTwinLayout ? '40px' : '60px',
                        maxWidth: '120px',
                        objectFit: 'contain',
                        marginBottom: cfg.header.headerAlignment === 'center' ? (isCompact ? '4px' : '8px') : 0
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '3px' : '6px', ...(cfg.header.headerAlignment === 'center' ? { alignItems: 'center', textAlign: 'center' } : {}) }}>
                    {cfg.header.showCompanyName && (
                      <h1 style={{ fontSize: isCompact ? (isTwinLayout ? '0.95em' : '1.2em') : isTwinLayout ? '1.3em' : '1.8em', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, marginBottom: isCompact ? '3px' : '6px' }}>
                        {activeCompany?.companyName || 'DIAMO ERP'}
                      </h1>
                    )}
                    {cfg.header.showAddress && (
                      <span style={{ fontSize: isCompact ? '0.68em' : '0.85em', color: '#475569', lineHeight: 1.45 }}>
                        {activeCompany?.addressLine1 || 'Surat, Gujarat, India'} {activeCompany?.addressLine2 || ''}
                      </span>
                    )}
                    <span style={{ fontSize: isCompact ? '0.68em' : '0.85em', color: '#475569', lineHeight: 1.45 }}>
                      {cfg.header.showGstin && `GSTIN: ${activeCompany?.gstinNumber || '24AAAAA0000A1Z0'}`}
                      {cfg.header.showGstin && cfg.header.showPan && ' | '}
                      {cfg.header.showPan && `PAN: ${activeCompany?.panNumber || 'AAAAA0000A'}`}
                      {cfg.header.showTan && ` | TAN: ${(activeCompany as any)?.tanNumber || '—'}`}
                      {cfg.header.showMsme && ` | MSME: ${(activeCompany as any)?.udyamMsme || '—'}`}
                    </span>
                    {cfg.header.showContact && (
                      <span style={{ fontSize: isCompact ? '0.68em' : '0.85em', color: '#475569', lineHeight: 1.45 }}>
                        {activeCompany?.mobile && `Mob: ${activeCompany.mobile}`}
                        {activeCompany?.email && ` | Email: ${activeCompany.email}`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: cfg.header.headerAlignment === 'center' ? 'center' : 'flex-end', justifyContent: 'center', marginTop: cfg.header.headerAlignment === 'center' ? (isCompact ? '4px' : '8px') : 0 }}>
                  <div style={{
                    background: '#000000', color: '#ffffff', padding: isCompact ? '0.2em 0.4em' : '0.3em 0.6em',
                    fontSize: isCompact ? '0.7em' : isTwinLayout ? '0.9em' : '1.05em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px'
                  }}>
                    {getDocTitle()}
                  </div>
                </div>
              </div>

              {/* E-Invoice Section */}
              {(cfg.eInvoice.showIrnNumber || cfg.eInvoice.showEInvoiceQr) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px dashed #cbd5e1', fontSize: isCompact ? '0.7em' : '0.8em', color: '#475569' }}>
                  {cfg.eInvoice.showIrnNumber && <span><strong>IRN:</strong> {data.irnNumber || 'e89f3a2b-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}</span>}
                  {cfg.eInvoice.showEInvoiceQr && <div style={{ width: isCompact ? '32px' : '45px', height: isCompact ? '32px' : '45px', background: '#f8fafc', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55em' }}>QR Code</div>}
                </div>
              )}

              {/* Party Details & Document Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: cfg.party.showShippingAddress || cfg.party.showTransportDetails ? (isCompact ? '1fr 1fr' : '1fr 1fr 1fr') : isTwinLayout ? '1.2fr 1fr' : '1.5fr 1fr', gap: isCompact ? '4px' : '10px', fontSize: isCompact ? '0.75em' : '0.9em' }}>
                {cfg.party.showBillingAddress && (
                  <div style={{ border: '1px solid #cbd5e1', padding: isCompact ? '4px 6px' : '8px', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 1px 0', fontSize: isCompact ? '0.7em' : '0.85em', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Party / Client
                    </h3>
                    <div style={{ fontWeight: 700, fontSize: isCompact ? '0.85em' : '1em' }}>
                      {party?.accountName || 'Cash Account'}
                    </div>
                    {party && (
                      <div style={{ color: '#334155', fontSize: '0.75em', lineHeight: '1.2' }}>
                        {cfg.party.showPartyGstin && party.gstinNumber && <div>GSTIN: {party.gstinNumber}</div>}
                        {party.addressLine1 && <div>{party.addressLine1} {party.addressLine2 || ''}</div>}
                        {party.city && <div>{party.city}, {party.stateCode || ''}</div>}
                        {cfg.party.showPartyContact && party.mobile && <div>Mob: {party.mobile}</div>}
                      </div>
                    )}
                  </div>
                )}

                {cfg.party.showShippingAddress && (
                  <div style={{ border: '1px solid #cbd5e1', padding: isCompact ? '4px 6px' : '8px', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 1px 0', fontSize: isCompact ? '0.7em' : '0.85em', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Shipped To
                    </h3>
                    <div style={{ color: '#334155', fontSize: '0.75em', lineHeight: '1.2' }}>
                      <div>{data.shippingAddress || party?.addressLine1 || 'Same as Billing'}</div>
                    </div>
                  </div>
                )}

                {cfg.party.showTransportDetails && (
                  <div style={{ border: '1px solid #cbd5e1', padding: isCompact ? '4px 6px' : '8px', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 1px 0', fontSize: isCompact ? '0.7em' : '0.85em', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Transport
                    </h3>
                    <div style={{ color: '#334155', fontSize: '0.75em', lineHeight: '1.2' }}>
                      {data.transporterName && <div>Transporter: {data.transporterName}</div>}
                      {data.lrNumber && <div>LR: {data.lrNumber}</div>}
                      {data.vehicleNumber && <div>Vehicle: {data.vehicleNumber}</div>}
                    </div>
                  </div>
                )}

                <div style={{ border: '1px solid #cbd5e1', padding: isCompact ? '4px 6px' : '8px', borderRadius: '4px', fontSize: isCompact ? '0.75em' : '0.85em' }}>
                  <div><strong>VOUCHER NO:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{data.voucherNumber || data.invoiceNumber || '—'}</span></div>
                  <div style={{ marginTop: '1px' }}><strong>DATE:</strong> {data.voucherDate || data.invoiceDate ? new Date(data.voucherDate || data.invoiceDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</div>
                  {data.expectedReturnDate && (
                    <div style={{ marginTop: '1px', color: '#dc2626' }}><strong>VALID UPTO:</strong> {new Date(data.expectedReturnDate).toLocaleDateString('en-IN')}</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {type === 'LOAN' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.78em' : '0.95em' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #000' }}>
                          <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'left', fontWeight: 700 }}>Voucher Details</th>
                          <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>Value / Narration</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Loan Type</td>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', textTransform: 'uppercase', fontWeight: 700 }}>
                            {data.loanType === 'GIVEN' ? 'Loan Given (Receivable)' : 'Loan Taken (Payable)'}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Principal Amount</td>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>
                            ₹{Number(data.principalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Interest Rate</td>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right' }}>
                            {data.interestRate || 0}% P.A. ({data.interestType || 'Simple'} Interest)
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Duration</td>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right' }}>
                            {data.durationMonths || 0} Month(s)
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Total Estimated Interest</td>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right' }}>
                            ₹{Number(data.totalInterest || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Repayable Balance</td>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                            ₹{Number((data.principalAmount || 0) + (data.totalInterest || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {data.remarks && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Remarks / Narration</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontStyle: 'italic', color: '#475569' }}>
                              {data.remarks}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : type === 'VOUCHER' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.78em' : '0.95em' }}>
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
                            {data.transactionType?.replace('_', ' ') || 'CASH/BANK VOUCHER'}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Party / Account Name</td>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700 }}>
                            {party?.accountName || 'Cash Account'}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Amount</td>
                          <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                            ₹{Number(data.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {data.referenceBillNo && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Reference Bill Number</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                              {data.referenceBillNo}
                            </td>
                          </tr>
                        )}
                        {(data.narration || data.remarks) && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 600 }}>Remarks / Narration</td>
                            <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontStyle: 'italic', color: '#475569' }}>
                              {data.narration || data.remarks}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : type === 'JOURNAL' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.78em' : '0.95em' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #000' }}>
                          <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'left', fontWeight: 700 }}>Particulars (Account Name)</th>
                          <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700, width: '120px' }}>Debit (₹)</th>
                          <th style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: 700, width: '120px' }}>Credit (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.lines || []).map((line: any, idx: number) => {
                          const isDr = line.debitCreditType === 'DEBIT';
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: isCompact ? '4px 6px' : '8px', fontWeight: 500, paddingLeft: isDr ? '8px' : '24px' }}>
                                {isDr ? line.account?.accountName : `To ${line.account?.accountName || 'Account'}`}
                                {!isDr && <span style={{ float: 'right', fontSize: '0.85em', color: '#64748b', marginRight: '8px' }}>Cr</span>}
                                {isDr && <span style={{ float: 'right', fontSize: '0.85em', color: '#64748b', marginRight: '8px' }}>Dr</span>}
                              </td>
                              <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: isDr ? 700 : 400 }}>
                                {isDr ? `₹${Number(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td style={{ padding: isCompact ? '4px 6px' : '8px', textAlign: 'right', fontWeight: !isDr ? 700 : 400 }}>
                                {!isDr ? `₹${Number(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {(() => {
                      try {
                        if (!data.narration) return null;
                        const parsed = JSON.parse(data.narration);
                        const remarks = [parsed.remark1, parsed.remark2, parsed.remark3].filter(Boolean).join(' | ');
                        const taxes = [];
                        if (parsed.sgst) taxes.push(`SGST: ${parsed.sgst}`);
                        if (parsed.cgst) taxes.push(`CGST: ${parsed.cgst}`);
                        if (parsed.igst) taxes.push(`IGST: ${parsed.igst}`);
                        if (parsed.tds) taxes.push(`TDS: ${parsed.tds}`);
                        
                        if (!remarks && taxes.length === 0) return null;
                        
                        return (
                          <div style={{ fontSize: '0.8em', color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                            {remarks && <div><strong>Remarks:</strong> {remarks}</div>}
                            {taxes.length > 0 && <div style={{ marginTop: '2px' }}><strong>Adjustments:</strong> {taxes.join(', ')}</div>}
                          </div>
                        );
                      } catch {
                        return (
                          <div style={{ fontSize: '0.8em', color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                            <strong>Narration:</strong> {data.narration}
                          </div>
                        );
                      }
                    })()}
                  </div>
                ) : (
                  (() => {
                    const isDocUsd = data.transactionCurrency === 'USD';
                    const docExchRate = Number(data.exchangeRate) || 90;
                    const finalAmt = getFinalAmount();
                    const altInrVal = data.totalAmountAlt ? Number(data.totalAmountAlt) : Math.round(finalAmt * docExchRate * 100) / 100;

                    const extraChargesList: Array<{ name: string; hsn?: string; amount: number }> = (() => {
                      if (Array.isArray(data.extraCharges) && data.extraCharges.length > 0) {
                        return data.extraCharges;
                      }
                      const narr = data.narration || data.remarks || '';
                      if (typeof narr === 'string' && narr.includes('__EXTRA_CHARGES__:')) {
                        try {
                          const m = narr.match(/__EXTRA_CHARGES__:(.*?)(?:__END__|$)/);
                          if (m && m[1]) return JSON.parse(m[1]);
                        } catch {}
                      }
                      return [];
                    })();

                    return (
                      <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.72em' : '0.9em' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #000' }}>
                              {cfg.itemTable.showSrNoColumn && <th style={{ padding: isCompact ? '2px' : '6px', textAlign: 'left' }}>#</th>}
                              <th style={{ padding: isCompact ? '2px' : '6px', textAlign: 'left' }}>Item / Quality</th>
                              {cfg.itemTable.showHsnColumn && <th style={{ padding: isCompact ? '2px' : '6px', textAlign: 'center' }}>HSN</th>}
                              {cfg.itemTable.showQuantityColumn && <th style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>Qty</th>}
                              {cfg.itemTable.showPurityColumn && <th style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>Carats</th>}
                              <th style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>Pcs</th>
                              <th style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>Rate ({isDocUsd ? '$' : '₹'})</th>
                              {cfg.itemTable.showDiscountColumn && <th style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>Disc %</th>}
                              <th style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>Amount ({isDocUsd ? '$' : '₹'})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data.items || []).map((item: any, idx: number) => {
                              const itemRate = Number(item.rate || 0);
                              const itemAmt = Number(item.amount || item.grossAmount || 0);

                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  {cfg.itemTable.showSrNoColumn && <td style={{ padding: isCompact ? '2px' : '6px' }}>{idx + 1}</td>}
                                  <td style={{ padding: isCompact ? '2px' : '6px', fontWeight: 600 }}>
                                    {item.quality?.qualityName || item.qualityName || item.itemName || 'Item'}
                                    {cfg.itemTable.showPacketIdColumn && (item.stockPacket?.stockIdNumber || item.packetNo) && (
                                      <div style={{ fontSize: '0.75em', color: '#475569', fontWeight: 400, marginTop: '1px', fontFamily: 'monospace' }}>
                                        Pkt: {item.stockPacket?.stockIdNumber || item.packetNo}
                                      </div>
                                    )}
                                  </td>
                                  {cfg.itemTable.showHsnColumn && <td style={{ padding: isCompact ? '2px' : '6px', textAlign: 'center', fontSize: '0.85em' }}>{item.hsnCode || item.hsnNumber || '—'}</td>}
                                  {cfg.itemTable.showQuantityColumn && <td style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>{Number(item.quantity || 0) > 0 ? Number(item.quantity).toFixed(2) : '—'}</td>}
                                  {cfg.itemTable.showPurityColumn && <td style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>{Number(item.carats || 0).toFixed(2)}</td>}
                                  <td style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>
                                    {item.pieces === 0 || item.pieces === null || item.pieces === undefined ? '—' : item.pieces}
                                  </td>
                                  <td style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>
                                    {isDocUsd ? `$${itemRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${itemRate.toLocaleString('en-IN')}`}
                                  </td>
                                  {cfg.itemTable.showDiscountColumn && <td style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right' }}>{item.discountPercent || 0}%</td>}
                                  <td style={{ padding: isCompact ? '2px' : '6px', textAlign: 'right', fontWeight: 700 }}>
                                    {isDocUsd ? `$${itemAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${itemAmt.toLocaleString('en-IN')}`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {extraChargesList.length > 0 && (cfg.itemTable.showExtraChargesTable ?? true) && (
                          <div style={{ marginTop: isCompact ? '4px' : '8px', marginBottom: '4px' }}>
                            <div style={{ fontSize: isCompact ? '0.72em' : '0.82em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', color: '#1e293b' }}>
                              Supplementary & Extra Charges:
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isCompact ? '0.7em' : '0.85em' }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                  <th style={{ padding: isCompact ? '2px 4px' : '4px 6px', textAlign: 'left', width: '30px' }}>#</th>
                                  <th style={{ padding: isCompact ? '2px 4px' : '4px 6px', textAlign: 'left' }}>Charge Description</th>
                                  <th style={{ padding: isCompact ? '2px 4px' : '4px 6px', textAlign: 'center', width: '90px' }}>SAC / HSN</th>
                                  <th style={{ padding: isCompact ? '2px 4px' : '4px 6px', textAlign: 'right', width: '130px' }}>Amount ({isDocUsd ? '$' : '₹'})</th>
                                </tr>
                              </thead>
                              <tbody>
                                {extraChargesList.map((chg: any, cIdx) => {
                                  const chgCurr = chg.currency || (isDocUsd ? 'USD' : 'INR');
                                  const chgAmt = Number(chg.amount || 0);
                                  const isSameCurr = (chgCurr === 'USD' && isDocUsd) || (chgCurr === 'INR' && !isDocUsd);
                                  let finalChgAmt = chgAmt;
                                  if (chgCurr === 'USD' && !isDocUsd) finalChgAmt = Math.round(chgAmt * docExchRate * 100) / 100;
                                  if (chgCurr === 'INR' && isDocUsd) finalChgAmt = Math.round((chgAmt / (docExchRate > 0 ? docExchRate : 1)) * 100) / 100;

                                  return (
                                    <tr key={cIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                      <td style={{ padding: isCompact ? '2px 4px' : '4px 6px' }}>{cIdx + 1}</td>
                                      <td style={{ padding: isCompact ? '2px 4px' : '4px 6px', fontWeight: 600 }}>
                                        {chg.name}
                                        {!isSameCurr && (
                                          <span style={{ fontSize: '0.85em', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                                            ({chgCurr === 'USD' ? `$${chgAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${chgAmt.toLocaleString('en-IN')}`})
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: isCompact ? '2px 4px' : '4px 6px', textAlign: 'center', fontSize: '0.85em' }}>{chg.hsn || '9968'}</td>
                                      <td style={{ padding: isCompact ? '2px 4px' : '4px 6px', textAlign: 'right', fontWeight: 700 }}>
                                        {isDocUsd ? `$${finalChgAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${finalChgAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Total & Summary */}
                        {(() => {
                          const currSym = isDocUsd ? '$' : '₹';
                          const grossTotal = Number(data.totalGrossAmount || (data.items || []).reduce((acc: number, it: any) => acc + Number(it.grossAmount || it.amount || 0), 0));
                          const totalDisc = Number(data.totalDiscount || 0);
                          const cgstAmt = Number(data.totalCgst || 0);
                          const sgstAmt = Number(data.totalSgst || 0);
                          const igstAmt = Number(data.totalIgst || 0);
                          const hasTax = cgstAmt > 0 || sgstAmt > 0 || igstAmt > 0;
                          const hasDisc = totalDisc > 0;
                          const roundOffAmt = Number(data.roundOff || 0);

                          // Derive unique GST rates from items
                          const gstRates: number[] = Array.from(
                            new Set(
                              (data.items || [])
                                .map((it: any) => Number(it.gstPct || it.gstRate || 0))
                                .filter((r: number) => r > 0)
                            )
                          );
                          const gstRateLabel = gstRates.length === 1 ? `${gstRates[0]}%` : gstRates.length > 1 ? 'Mixed' : '';
                          const halfGstRateLabel = gstRates.length === 1 ? `${Math.round(((gstRates[0] as number) / 2) * 100) / 100}%` : gstRates.length > 1 ? 'Mixed' : '';

                          const totalCarats = Number(data.totalCarats || (data.items || []).reduce((acc: number, it: any) => acc + Number(it.carats || 0), 0));
                          const totalPieces = data.totalPieces !== undefined ? data.totalPieces : (data.items || []).reduce((acc: number, it: any) => acc + Number(it.pieces || 0), 0);
                          const taxableVal = Math.round((grossTotal - totalDisc) * 100) / 100;

                          return (
                            <div style={{ borderTop: '2px solid #000', paddingTop: isCompact ? '4px' : '8px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', fontSize: isCompact ? '0.75em' : '0.88em' }}>
                              {/* Left Side: Summary Meta & Words */}
                              <div style={{ flex: 1, color: '#334155', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {(totalCarats > 0 || totalPieces > 0) && (
                                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                                    {totalCarats > 0 && <span>Total Carats: <strong>{totalCarats.toFixed(3)} ct</strong></span>}
                                    {totalCarats > 0 && totalPieces > 0 && <span style={{ margin: '0 6px' }}>|</span>}
                                    {totalPieces > 0 && <span>Total Pieces: <strong>{totalPieces}</strong></span>}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.92em', fontWeight: 500 }}>
                                  <strong>Amount in Words:</strong> {numberToWords(finalAmt, isDocUsd ? 'USD' : 'INR')}
                                </div>
                                {isDocUsd && (
                                  <div style={{ fontSize: '0.85em', fontStyle: 'italic', color: '#64748b' }}>
                                    INR Equivalent: {numberToWords(altInrVal, 'INR')}
                                  </div>
                                )}
                                {isBankTx && party?.bankName && (
                                  <div style={{ fontSize: '0.88em', marginTop: '1px' }}>
                                    <strong>Bank:</strong> {party.bankName}
                                  </div>
                                )}
                              </div>

                              {/* Right Side: Financial Breakdown */}
                              <div style={{ minWidth: isCompact ? '170px' : '230px', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                                {(hasDisc || hasTax || roundOffAmt !== 0) && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                    <span>Gross Amount:</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{currSym}{grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                {hasDisc && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                                    <span>Discount / Less:</span>
                                    <span style={{ fontWeight: 600 }}>-{currSym}{totalDisc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                {(hasDisc || hasTax) && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 600, borderTop: '1px dashed #cbd5e1', paddingTop: '1px' }}>
                                    <span>Taxable Value:</span>
                                    <span>{currSym}{taxableVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                {cgstAmt > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                    <span>CGST {halfGstRateLabel ? `(${halfGstRateLabel})` : ''}:</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>+{currSym}{cgstAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                {sgstAmt > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                    <span>SGST {halfGstRateLabel ? `(${halfGstRateLabel})` : ''}:</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>+{currSym}{sgstAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                {igstAmt > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                    <span>IGST {gstRateLabel ? `(${gstRateLabel})` : ''}:</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>+{currSym}{igstAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                {roundOffAmt !== 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                    <span>Round Off:</span>
                                    <span>{roundOffAmt >= 0 ? '+' : ''}{currSym}{roundOffAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #000', paddingTop: '3px', marginTop: '2px', fontSize: '1.08em', fontWeight: 800, color: '#000' }}>
                                  <span>NET AMOUNT:</span>
                                  <span>{currSym}{finalAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {isDocUsd && (
                                  <div style={{ fontSize: '0.82em', color: '#475569', fontWeight: 600, marginTop: '1px' }}>
                                    (₹{altInrVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @ ₹{docExchRate}/$)
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    );
                  })())}
              </div>
              {(cfg.footer.showBankDetails || cfg.footer.showPaymentQr) && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: isCompact ? '3px' : '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isCompact ? '0.7em' : '0.8em', color: '#334155' }}>
                  {cfg.footer.showBankDetails && (activeCompany?.bankName || activeCompany?.bankAccountNumber) ? (
                    <div>
                      <strong>Bank:</strong> {activeCompany.bankName} (A/C: {activeCompany.bankAccountNumber || '—'}, IFSC: {activeCompany.bankIfsc || '—'})
                    </div>
                  ) : <div />}
                  {cfg.footer.showPaymentQr && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginLeft: '12px' }}>
                      <div style={{
                        width: isCompact ? '50px' : '75px',
                        height: isCompact ? '50px' : '75px',
                        background: '#ffffff',
                        border: '1.5px solid #0f172a',
                        borderRadius: '4px',
                        padding: '4px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        overflow: 'hidden',
                      }}>
                        {isValidImageSrc(cfg.footer.paymentQrImagePath) ? (
                          <img
                            src={cfg.footer.paymentQrImagePath!}
                            alt="Payment QR"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ width: isCompact ? '12px' : '18px', height: isCompact ? '12px' : '18px', border: '2px solid #000', background: '#000', boxSizing: 'border-box', padding: '1px' }}>
                                <div style={{ width: '100%', height: '100%', background: '#fff' }} />
                              </div>
                              <div style={{ width: isCompact ? '12px' : '18px', height: isCompact ? '12px' : '18px', border: '2px solid #000', background: '#000', boxSizing: 'border-box', padding: '1px' }}>
                                <div style={{ width: '100%', height: '100%', background: '#fff' }} />
                              </div>
                            </div>
                            <div style={{ fontSize: isCompact ? '0.5em' : '0.68em', fontWeight: 800, textAlign: 'center', color: '#0f172a', letterSpacing: '0.5px' }}>
                              UPI QR
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                              <div style={{ width: isCompact ? '12px' : '18px', height: isCompact ? '12px' : '18px', border: '2px solid #000', background: '#000', boxSizing: 'border-box', padding: '1px' }}>
                                <div style={{ width: '100%', height: '100%', background: '#fff' }} />
                              </div>
                              <div style={{ width: isCompact ? '8px' : '12px', height: isCompact ? '8px' : '12px', background: '#000' }} />
                            </div>
                          </>
                        )}
                      </div>
                      <span style={{ fontSize: isCompact ? '0.58em' : '0.7em', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scan & Pay</span>
                    </div>
                  )}
                </div>
              )}

              {/* Terms & Conditions Block */}
              {cfg.footer.showTermsConditions && (
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: isCompact ? '2px' : '6px', fontSize: isCompact ? '0.68em' : '0.78em', color: '#0f172a', fontWeight: 600, lineHeight: 1.3, whiteSpace: 'pre-wrap' }}>
                  <strong style={{ color: '#000', fontWeight: 700 }}>Terms:</strong> {resolvedTermsText}
                </div>
              )}

              {/* Declaration */}
              {cfg.footer.showDeclaration && (
                <div style={{ fontSize: isCompact ? '0.62em' : '0.78em', color: '#1e293b', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.3, whiteSpace: 'pre-wrap' }}>
                  {resolvedDeclarationText}
                </div>
              )}

              {/* Signatures */}
              {cfg.footer.showSignatureBlock && (
                <div style={{ marginTop: 'auto', paddingTop: isCompact ? '6px' : '20px' }}>
                  {chunkSignatures(cfg.footer.signatures || [], cfg.footer.signatureCount || 3).map((rowSigs, rowIdx) => (
                    <div key={rowIdx} style={{ display: 'flex', justifyContent: 'center', gap: isCompact ? '12px' : isTwinLayout ? '20px' : '50px', marginTop: rowIdx > 0 ? (isCompact ? '4px' : '16px') : '0' }}>
                      {rowSigs.map((label, idx) => (
                        <div key={idx} style={{ width: isCompact ? (isTwinLayout ? '80px' : '100px') : (isTwinLayout ? '110px' : '150px'), textAlign: 'center' }}>
                          <div style={{ height: isCompact ? '14px' : isTwinLayout ? '28px' : '45px' }} />
                          <div style={{ borderTop: '1px dashed #64748b', paddingTop: '2px', fontSize: isCompact ? '0.7em' : '0.85em', fontWeight: 600, color: '#334155' }}>
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
                {renderSingleVoucherCopy(cfg.copyLabel.copies[0] || 'OFFICE COPY')}
                {renderSingleVoucherCopy(cfg.copyLabel.copies[1] || 'CLIENT COPY')}
              </>
            );
          }

          return renderSingleVoucherCopy('ORIGINAL');
        })()}
      </div>
    </div>
  );
};
