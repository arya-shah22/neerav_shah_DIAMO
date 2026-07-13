// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Balance Sheet Page
// Phase 11.2: Assets vs Liabilities statement
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Download, ArrowLeft, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';

export const BalanceSheetPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // IPC Hook
  const { data: bsData, loading, invoke: getBalanceSheet } = useIpc<any>('report:balance-sheet');

  const refreshReport = useCallback(async () => {
    if (!companyId) return;
    await getBalanceSheet({ companyId, date: filterDate });
  }, [companyId, filterDate, getBalanceSheet]);

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
    if (!bsData) return;
    const rows = [
      ['LIABILITIES & CAPITAL', '', 'ASSETS', ''],
      ['Group Name', 'Amount', 'Group Name', 'Amount'],
    ];

    const maxLength = Math.max(
      bsData.capital.length + bsData.liabilities.length,
      bsData.assets.length
    );

    const liabList = [
      ...bsData.capital.map((c: any) => ({ name: c.groupName, amount: c.amount })),
      ...bsData.liabilities.map((l: any) => ({ name: l.groupName, amount: l.amount }))
    ];

    for (let i = 0; i < maxLength; i++) {
      const liab = liabList[i] || { name: '', amount: '' };
      const asset = bsData.assets[i] || { name: '', amount: '' };
      rows.push([
        liab.name ? `"${liab.name}"` : '',
        liab.amount,
        asset.name ? `"${asset.name}"` : '',
        asset.amount
      ]);
    }

    rows.push([]);
    rows.push([
      '"Total Liabilities & Capital"',
      bsData.totalLiabilities + bsData.totalCapital,
      '"Total Assets"',
      bsData.totalAssets
    ]);

    if (bsData.profitLossDetails) {
      const pl = bsData.profitLossDetails;
      rows.push([]);
      rows.push(['TRADING & PROFIT & LOSS SUMMARY']);
      rows.push(['Opening Stock', 0, 'Sales', pl.revenue.sales]);
      rows.push(['Purchases', pl.costOfGoods.purchases, 'Direct Income', pl.revenue.jobWorkIncome]);
      rows.push(['Direct Expenses', pl.costOfGoods.jobWorkExpense + pl.costOfGoods.directExpense, 'Indirect Income', pl.otherIncome]);
      rows.push(['Indirect Expenses', pl.expenses.operatingExpense, 'Closing Stock', 0]);
      rows.push([
        pl.netProfit < 0 ? 'NET LOSS' : '',
        pl.netProfit < 0 ? Math.abs(pl.netProfit) : '',
        pl.netProfit >= 0 ? 'NET PROFIT' : '',
        pl.netProfit >= 0 ? pl.netProfit : ''
      ]);
    }

    const csvContent = rows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Balance_Sheet_${filterDate}.csv`);
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
          filename: `Balance_Sheet_${filterDate}.pdf`
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
  if (showPrintPreview && activeCompany && bsData) {
    const pl = bsData.profitLossDetails;
    const plTotalLeft = (pl?.costOfGoods?.purchases || 0) + (pl?.costOfGoods?.jobWorkExpense || 0) + (pl?.costOfGoods?.directExpense || 0) + (pl?.expenses?.operatingExpense || 0) + (pl?.netProfit > 0 ? pl.netProfit : 0);
    const plTotalRight = (pl?.revenue?.sales || 0) + (pl?.revenue?.jobWorkIncome || 0) + (pl?.otherIncome || 0) + (pl?.netProfit < 0 ? Math.abs(pl.netProfit) : 0);

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
              <span style={{ color: 'var(--color-primary)' }}>BALANCE SHEET STATEMENT</span>
              <span>AS OF: {new Date(filterDate).toLocaleDateString('en-IN')}</span>
            </div>
            {bsData.variance > 0.01 && (
              <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 'bold', marginTop: '8px' }}>
                * Balance Sheet Difference: ₹{bsData.variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Section 1: Liabilities & Assets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Liabilities Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: 0 }}>LIABILITIES & CAPITAL</h3>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Capital & Reserves</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {bsData.capital.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.groupName}</span>
                      <span>₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Liabilities</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {bsData.liabilities.map((l: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{l.groupName}</span>
                      <span>₹{l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1.5px solid #0f172a', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total Liabilities & Capital:</span>
                <span>₹{(bsData.totalLiabilities + bsData.totalCapital).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Assets Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '2px solid #059669', paddingBottom: '6px', margin: 0, color: '#059669' }}>ASSETS</h3>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Assets</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {bsData.assets.map((a: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{a.groupName}</span>
                      <span>₹{a.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1.5px solid #059669', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#059669' }}>
                <span>Total Assets:</span>
                <span>₹{bsData.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Trading & Profit & Loss Account Summary */}
          {pl && (
            <div style={{ marginTop: '30px', borderTop: '1px solid #cbd5e1', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', textAlign: 'center' }}>
                TRADING & PROFIT & LOSS ACCOUNT SUMMARY
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Expenses & Purchases */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Opening Stock:</span>
                    <span>₹0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Purchases:</span>
                    <span>₹{pl.costOfGoods.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Direct Expenses:</span>
                    <span>₹{(pl.costOfGoods.jobWorkExpense + pl.costOfGoods.directExpense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Indirect Expenses:</span>
                    <span>₹{pl.expenses.operatingExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {pl.netProfit > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 600 }}>
                      <span>NET PROFIT:</span>
                      <span>₹{pl.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1.5px solid #0f172a', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total:</span>
                    <span>₹{plTotalLeft.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Income & Sales */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sales:</span>
                    <span>₹{pl.revenue.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Direct Income:</span>
                    <span>₹{pl.revenue.jobWorkIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Indirect Income:</span>
                    <span>₹{pl.otherIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Closing Stock:</span>
                    <span>₹0.00</span>
                  </div>
                  {pl.netProfit < 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 600 }}>
                      <span>NET LOSS:</span>
                      <span>₹{Math.abs(pl.netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1.5px solid #0f172a', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total:</span>
                    <span>₹{plTotalRight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const pl = bsData?.profitLossDetails;
  const plTotalLeft = pl ? (pl.costOfGoods.purchases + pl.costOfGoods.jobWorkExpense + pl.costOfGoods.directExpense + pl.expenses.operatingExpense + (pl.netProfit > 0 ? pl.netProfit : 0)) : 0;
  const plTotalRight = pl ? (pl.revenue.sales + pl.revenue.jobWorkIncome + pl.otherIncome + (pl.netProfit < 0 ? Math.abs(pl.netProfit) : 0)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Balance Sheet</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Assets vs Liabilities statement for {activeCompany?.companyName}
          </p>
        </div>
        {bsData && (
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

      {/* Date Filter */}
      <div className="no-print" style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>As Of Date:</span>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ width: '160px', height: '32px' }}
          />
        </div>
        {bsData && bsData.variance > 0.01 && (
          <span style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '13px' }}>
            Balance Sheet Difference: ₹{bsData.variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Balance Sheet Content */}
      {loading && <p style={{ color: 'var(--color-text-secondary)' }} className="no-print">Calculating Balance Sheet statement...</p>}

      {!loading && bsData && (
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Liabilities & Capital column */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid var(--color-primary)', paddingBottom: '8px', color: 'var(--color-primary)' }}>LIABILITIES & CAPITAL</h3>
              
              {/* Capital accounts */}
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Capital & Reserves</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                  {bsData.capital.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.groupName}</span>
                      <span style={{ fontWeight: 600 }}>₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liability accounts */}
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Current & Non-Current Liabilities</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                  {bsData.liabilities.map((l: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{l.groupName}</span>
                      <span style={{ fontWeight: 600 }}>₹{l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                marginTop: 'auto',
                paddingTop: '16px',
                borderTop: '2px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: '14px',
              }}>
                <span>Total Liabilities & Capital:</span>
                <span>₹{(bsData.totalLiabilities + bsData.totalCapital).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Assets column */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid var(--color-success)', paddingBottom: '8px', color: 'var(--color-success)' }}>ASSETS</h3>
              
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Assets schedule</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                  {bsData.assets.map((a: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{a.groupName}</span>
                      <span style={{ fontWeight: 600 }}>₹{a.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                marginTop: 'auto',
                paddingTop: '16px',
                borderTop: '2px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: '14px',
              }}>
                <span>Total Assets:</span>
                <span>₹{bsData.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Trading & Profit & Loss Summary Section */}
          {pl && (
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '20px',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid var(--color-primary)', paddingBottom: '8px', color: 'var(--color-primary)', marginBottom: '16px' }}>
                TRADING & PROFIT & LOSS ACCOUNT SUMMARY
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Opening Stock:</span>
                    <span>₹0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Purchases:</span>
                    <span style={{ fontWeight: 600 }}>₹{pl.costOfGoods.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Direct Expenses:</span>
                    <span style={{ fontWeight: 600 }}>₹{(pl.costOfGoods.jobWorkExpense + pl.costOfGoods.directExpense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Indirect Expenses:</span>
                    <span style={{ fontWeight: 600 }}>₹{pl.expenses.operatingExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {pl.netProfit > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 700 }}>
                      <span>NET PROFIT:</span>
                      <span>₹{pl.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total:</span>
                    <span>₹{plTotalLeft.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sales:</span>
                    <span style={{ fontWeight: 600 }}>₹{pl.revenue.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Direct Income:</span>
                    <span style={{ fontWeight: 600 }}>₹{pl.revenue.jobWorkIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Indirect Income:</span>
                    <span style={{ fontWeight: 600 }}>₹{pl.otherIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Closing Stock:</span>
                    <span>₹0.00</span>
                  </div>
                  {pl.netProfit < 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)', fontWeight: 700 }}>
                      <span>NET LOSS:</span>
                      <span>₹{Math.abs(pl.netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total:</span>
                    <span>₹{plTotalRight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
