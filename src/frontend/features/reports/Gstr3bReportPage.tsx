// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — GSTR-3B Consolidated Return Summary Page
// Phase 11.6: GSTR-3B Monthly return details
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Printer, ArrowLeft } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { useCompanyStore, formatFinancialYearLabel } from '../../state/company-store';

export const Gstr3bReportPage: React.FC = () => {
  const { activeCompany, companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  // Get current financial year dates
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const { data, loading, invoke } = useIpc<any>('report:gstr3b-summary');

  const fetchGstr3b = useCallback(async () => {
    if (!companyId) return;
    await invoke({ companyId, startDate, endDate });
  }, [companyId, startDate, endDate, invoke]);

  useEffect(() => {
    fetchGstr3b();
  }, [companyId, startDate, endDate]);

  const triggerDirectPrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  const renderAmount = (amount: number) => {
    if (!amount) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const table31Rows = data?.table31 ? [data.table31.a, data.table31.b, data.table31.c, data.table31.d, data.table31.e] : [];
  const table4Rows = data?.table4 ? [
    { ...data.table4.a1, section: '4(A) ITC Available' },
    { ...data.table4.a3, section: '4(A) ITC Available' },
    { ...data.table4.a5, section: '4(A) ITC Available' },
    { ...data.table4.b, section: '4(B) ITC Reversed' }
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>GSTR-3B Consolidated Return</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Consolidated monthly summary of outward liabilities and eligible input tax credit (ITC).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print Return
          </Button>
          <Button variant="primary" onClick={fetchGstr3b} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Summary
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="no-print" style={{
        display: 'flex',
        gap: '16px',
        padding: '16px 20px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Period Select:</span>
        </div>
        <div style={{ width: '160px' }}>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} label="" />
        </div>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>to</span>
        <div style={{ width: '160px' }}>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} label="" />
        </div>
      </div>

      {/* Print-only Header */}
      <div className="print-only" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>GSTR-3B Return Summary Report</h2>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          Period: {startDate} to {endDate}
        </p>
      </div>

      {/* Table 3.1: Details of Outward Supplies & Inward Reverse Charge Supplies */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>
            3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              <th style={{ textAlign: 'left', padding: '12px 20px' }}>Nature of Supplies</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>Total Taxable Value</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>Integrated Tax (IGST)</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>Central Tax (CGST)</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>State/UT Tax (SGST)</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>Cess</th>
            </tr>
          </thead>
          <tbody>
            {table31Rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 20px', fontWeight: 500 }}>{row?.label}</td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(row?.taxable)}</td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(row?.igst)}</td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(row?.cgst)}</td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(row?.sgst)}</td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(row?.cess)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table 4: Eligible ITC */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>
            4. Details of Eligible Input Tax Credit (ITC)
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              <th style={{ textAlign: 'left', padding: '12px 20px' }}>ITC Details</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>Integrated Tax (IGST)</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>Central Tax (CGST)</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>State/UT Tax (SGST)</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>Cess</th>
            </tr>
          </thead>
          <tbody>
            {table4Rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 20px', fontWeight: 500 }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-primary)', display: 'block', marginBottom: '2px', fontWeight: 700 }}>
                    {row?.section}
                  </span>
                  {row?.label}
                </td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(row?.igst)}</td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(row?.cgst)}</td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(row?.sgst)}</td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(row?.cess)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table 5: Interest & Late Fee */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        maxWidth: '500px'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>
            5.1 Interest & Late Fee Details
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--color-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              <th style={{ textAlign: 'left', padding: '12px 20px' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>Interest</th>
              <th style={{ textAlign: 'right', padding: '12px 20px' }}>Late Fee</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '12px 20px', fontWeight: 500 }}>System Computed Interest / Late Fees</td>
              <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(data?.interestLateFee?.interest || 0)}</td>
              <td style={{ padding: '12px 20px', textAlign: 'right' }}>{renderAmount(data?.interestLateFee?.lateFee || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Print Preview Overlay */}
      {showPrintPreview && activeCompany && data && (
        <div id="print-preview-root" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#f8fafc',
          zIndex: 9999,
          overflowY: 'auto',
          padding: '24px'
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
              .no-print { display: none !important; }
              #print-preview-root {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                width: auto !important;
                height: auto !important;
                overflow: visible !important;
              }
              .print-page {
                padding: 5mm 0 !important;
                border: none !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                min-height: auto !important;
                background: transparent !important;
              }
            }
          `}} />

          <div className="no-print" style={{
            display: 'flex',
            justifyContent: 'space-between',
            maxWidth: '210mm',
            margin: '0 auto 20px auto',
            padding: '12px 24px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px'
          }}>
            <Button variant="ghost" onClick={() => setShowPrintPreview(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeft size={16} /> Back to Page
            </Button>
            <Button variant="primary" onClick={triggerDirectPrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print / Save PDF
            </Button>
          </div>

          <div id="print-area" className="print-page" style={{
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            padding: '20mm',
            width: '210mm',
            margin: '0 auto',
            boxSizing: 'border-box',
            color: '#1e293b'
          }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                {activeCompany.companyName}
              </h2>
              <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0' }}>
                GSTIN: {activeCompany.gstinNumber || 'Unregistered'} | Financial Year: {activeFinancialYear ? formatFinancialYearLabel(activeFinancialYear) : ''}
              </p>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '12px 0 0 0', color: 'var(--color-primary)' }}>
                GSTR-3B Consolidated Return Summary
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Period: {startDate} to {endDate}
              </p>
            </div>

            {/* Table 3.1 print view */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #0f172a', fontWeight: 600, color: '#334155' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Nature of Supplies</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Taxable Value</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>IGST</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>CGST</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>SGST</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Cess</th>
                  </tr>
                </thead>
                <tbody>
                  {table31Rows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: 500 }}>{row?.label}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(row?.taxable)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(row?.igst)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(row?.cgst)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(row?.sgst)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(row?.cess)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table 4 print view */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                4. Details of Eligible Input Tax Credit (ITC)
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #0f172a', fontWeight: 600, color: '#334155' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>ITC Details</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>IGST</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>CGST</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>SGST</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Cess</th>
                  </tr>
                </thead>
                <tbody>
                  {table4Rows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: 500 }}>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#475569', display: 'block', fontWeight: 700 }}>
                          {row?.section}
                        </span>
                        {row?.label}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(row?.igst)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(row?.cgst)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(row?.sgst)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(row?.cess)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table 5 print view */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                5.1 Interest & Late Fee Details
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', maxWidth: '400px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #0f172a', fontWeight: 600, color: '#334155' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Interest</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Late Fee</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 500 }}>System Computed Interest / Late Fees</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(data?.interestLateFee?.interest || 0)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(data?.interestLateFee?.lateFee || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
              <span>Generated on: {new Date().toLocaleDateString()}</span>
              <span style={{ borderTop: '1px solid #94a3b8', width: '150px', textAlign: 'center', paddingTop: '4px' }}>Authorised Signatory</span>
            </div>

          </div>
        </div>
      )}
      {/* Choose Print Destination Dialog */}
      {showPrintDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
                Choose Print Destination
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
                Select "Preview on Screen" to see the copy first, or "System Print Dialog" to print directly.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  setShowPrintDialog(false);
                  setShowPrintPreview(true);
                }}
              >
                Preview on Screen
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowPrintDialog(false);
                  triggerDirectPrint();
                }}
              >
                System Print Dialog
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setShowPrintDialog(false)}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
