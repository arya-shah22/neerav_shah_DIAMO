// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Profit & Loss Account Page
// Phase 11.2: Income vs Expenses statement
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Download, ArrowLeft, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';

export const ProfitLossPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // IPC Hook
  const { data: plData, loading, invoke: getProfitLoss } = useIpc<any>('report:profit-loss');

  const refreshReport = useCallback(async () => {
    if (!companyId) return;
    await getProfitLoss({
      companyId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [companyId, startDate, endDate, getProfitLoss]);

  useEffect(() => {
    refreshReport();
  }, [refreshReport]);

  const triggerDirectPrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportCSV = () => {
    if (!plData) return;
    const rows = [
      ['SECTION', 'PARTICULARS', 'AMOUNT'],
      ['1. REVENUE', 'Sales Income', plData.revenue.sales],
      ['', 'Job Work Income', plData.revenue.jobWorkIncome],
      ['', 'Total Revenue (A)', plData.revenue.total],
      [],
      ['2. COST OF SALES', 'Purchases', plData.costOfGoods.purchases],
      ['', 'Job Work Expenses', plData.costOfGoods.jobWorkExpense],
      ['', 'Direct Expenses', plData.costOfGoods.directExpense],
      ['', 'Total Cost of Sales (B)', plData.costOfGoods.total],
      [],
      ['GROSS PROFIT', 'Gross Profit (A - B)', plData.grossProfit],
      [],
      ['3. OPERATING EXPENSES', 'Indirect & Operating Expenses', plData.expenses.operatingExpense],
      ['', 'Total Operating Expenses (C)', plData.expenses.total],
      [],
      ['4. OTHER INDIRECT INCOME', 'Interest & Other Incomes (D)', plData.otherIncome],
      [],
      ['NET PROFIT', 'Net Profit For The Period', plData.netProfit]
    ];

    const csvContent = rows.map(e => e.map(val => typeof val === 'string' ? `"${val}"` : val).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Profit_Loss_${endDate || 'Latest'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    setShowPrintPreview(true);
    setTimeout(async () => {
      try {
        const res = await window.api.invoke('system:print-to-pdf', {
          filename: `Profit_Loss_${startDate || 'Inception'}_to_${endDate || 'Today'}.pdf`
        }) as any;
        if (res && !res.success && res.error !== 'Cancelled') {
          alert(res.error || 'Failed to export PDF');
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setShowPrintPreview(false);
      }
    }, 500);
  };

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  // Render Print Preview Mode
  if (showPrintPreview && activeCompany && plData) {
    return (
      <div id="print-preview-root" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 15mm; }
            body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
            .no-print { display: none !important; }
            #print-preview-root {
              background: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
            }
            .print-page {
              padding: 5mm 0 !important;
              border: none !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              min-height: auto !important;
              height: auto !important;
              background: transparent !important;
              border-radius: 0 !important;
            }
          }
        `}} />
        
        {/* Preview Toolbar */}
        <div className="no-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '20px', 
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

        {/* Printable Portrait Sheet */}
        <div id="print-area" className="print-page" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          padding: '20mm',
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          color: '#1e293b',
          fontSize: '13px',
          boxSizing: 'border-box',
        }}>
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
              {activeCompany.companyName}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '12px' }}>
              {activeCompany.addressLine1} {activeCompany.addressLine2 && `, ${activeCompany.addressLine2}`} | {activeCompany.city} - {activeCompany.pincode}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-primary)' }}>PROFIT & LOSS STATEMENT</span>
              <span>PERIOD: {startDate || 'Inception'} TO {endDate || 'TODAY'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Revenue */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>1. REVENUE</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sales Income:</span>
                  <span>₹{plData.revenue.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Job Work Income:</span>
                  <span>₹{plData.revenue.jobWorkIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                  <span>Total Revenue (A):</span>
                  <span>₹{plData.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Cost of Sales */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>2. COST OF SALES</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Purchases:</span>
                  <span>₹{plData.costOfGoods.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Job Work Expenses:</span>
                  <span>₹{plData.costOfGoods.jobWorkExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Direct Expenses:</span>
                  <span>₹{plData.costOfGoods.directExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                  <span>Total Cost of Sales (B):</span>
                  <span>₹{plData.costOfGoods.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 12px', borderRadius: '4px', fontWeight: 700, fontSize: '14px' }}>
              <span>GROSS PROFIT (A - B):</span>
              <span>₹{plData.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Operating Expenses */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>3. OPERATING EXPENSES</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Indirect & Operating Expenses:</span>
                  <span>₹{plData.expenses.operatingExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                  <span>Total Operating Expenses (C):</span>
                  <span>₹{plData.expenses.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Other Income */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>4. OTHER INDIRECT INCOME</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px' }}>
                <span>Interest & Other Incomes (D):</span>
                <span>₹{plData.otherIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Net Profit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#ecfdf5', border: '1px solid #059669', padding: '14px 16px', borderRadius: '4px', fontWeight: 800, fontSize: '15px', color: '#047857' }}>
              <span>NET PROFIT FOR THE PERIOD:</span>
              <span>₹{plData.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Profit & Loss Account</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Income vs Expenses statement for {activeCompany?.companyName}
          </p>
        </div>
        {plData && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Export CSV
            </Button>
            <Button variant="secondary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Export PDF
            </Button>
            <Button variant="primary" onClick={() => setShowPrintModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print
            </Button>
          </div>
        )}
      </div>

      {/* Date Range Filters */}
      <div className="no-print" style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>From Date:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: '160px', height: '32px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>To Date:</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: '160px', height: '32px' }}
          />
        </div>
      </div>

      {/* Report Summary */}
      {loading && <p style={{ color: 'var(--color-text-secondary)' }} className="no-print">Calculating P&L statement...</p>}

      {!loading && plData && (
        <div className="no-print" style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* Revenue */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>1. REVENUE</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sales Income:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.revenue.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Job Work Income:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.revenue.jobWorkIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '6px', fontWeight: 700 }}>
                <span>Total Revenue (A):</span>
                <span>₹{plData.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Cost of Sales */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>2. COST OF SALES</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Purchases:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.costOfGoods.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Job Work Expenses:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.costOfGoods.jobWorkExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Direct Expenses:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.costOfGoods.directExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '6px', fontWeight: 700 }}>
                <span>Total Cost of Sales (B):</span>
                <span>₹{plData.costOfGoods.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Gross Margin */}
          <div style={{
            background: 'var(--color-row-alt)',
            padding: '12px 16px',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--color-success)',
          }}>
            <span>GROSS PROFIT (A - B):</span>
            <span>₹{plData.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Operating Expenses */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>3. OPERATING EXPENSES</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Indirect & Operating Expenses:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.expenses.operatingExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '6px', fontWeight: 700 }}>
                <span>Total Operating Expenses (C):</span>
                <span>₹{plData.expenses.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Other Income */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>4. OTHER INDIRECT INCOME</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px' }}>
              <span>Interest & Other Incomes (D):</span>
              <span style={{ fontWeight: 600 }}>₹{plData.otherIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Net Profit */}
          <div style={{
            background: 'var(--color-accent-light)',
            padding: '16px 20px',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '16px',
            fontWeight: 800,
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent)',
          }}>
            <span>NET PROFIT FOR THE PERIOD:</span>
            <span>₹{plData.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Choose Print Destination Modal */}
      {showPrintModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Choose Print Destination</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Select "Preview on Screen" to see the copy first, or "System Print Dialog" to print directly.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => { setShowPrintModal(false); setShowPrintPreview(true); }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Preview on Screen
              </button>
              <button 
                onClick={triggerDirectPrint}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                System Print Dialog
              </button>
              <button 
                onClick={() => setShowPrintModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '12px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
