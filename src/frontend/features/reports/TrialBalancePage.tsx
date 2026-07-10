// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Trial Balance Page
// Phase 11.2: Double-entry arithmetic check ledger
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Download, ArrowLeft, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';

export const TrialBalancePage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // IPC Hooks
  const { data: tbData, loading, invoke: getTrialBalance } = useIpc<any>('report:trial-balance');

  const refreshReport = useCallback(async () => {
    if (!companyId) return;
    await getTrialBalance({ companyId, date: filterDate });
  }, [companyId, filterDate, getTrialBalance]);

  useEffect(() => {
    refreshReport();
  }, [refreshReport]);

  const tbColumns: Column<any>[] = [
    { key: 'groupName', header: 'ACCOUNT GROUP', sortable: true },
    {
      key: 'debit',
      header: 'DEBIT (Dr)',
      align: 'right',
      render: (row) => row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—',
    },
    {
      key: 'credit',
      header: 'CREDIT (Cr)',
      align: 'right',
      render: (row) => row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—',
    },
  ];

  const triggerDirectPrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportCSV = () => {
    if (!tbData || !tbData.groups) return;
    const headers = ['ACCOUNT GROUP', 'DEBIT (Dr)', 'CREDIT (Cr)'];
    const rows = tbData.groups.map((row: any) => [
      `"${row.groupName}"`,
      row.debit,
      row.credit
    ]);
    
    rows.push(['"Total Balance"', tbData.totalDebit, tbData.totalCredit]);
    rows.push(['"Variance"', tbData.variance, '']);

    const csvContent = [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Trial_Balance_${filterDate}.csv`);
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
          filename: `Trial_Balance_${filterDate}.pdf`
        }) as any;
        if (res && !res.success && res.error !== 'Cancelled') {
          alert(res.error || 'Failed to export PDF');
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setShowPrintPreview(false);
      }
    }, 100);
  };

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  // Render Print Preview Mode
  if (showPrintPreview && activeCompany) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 15mm; }
            body { background: #ffffff; padding: 0; margin: 0; }
            .no-print { display: none !important; }
            .print-page { padding: 0 !important; border: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; box-shadow: none !important; }
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
              <span style={{ color: 'var(--color-primary)' }}>TRIAL BALANCE STATEMENT</span>
              <span>AS OF: {new Date(filterDate).toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2.5px solid #0f172a', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>
                <th style={{ textAlign: 'left', padding: '10px' }}>Account Group</th>
                <th style={{ textAlign: 'right', padding: '10px', width: '150px' }}>Debit (Dr)</th>
                <th style={{ textAlign: 'right', padding: '10px', width: '150px' }}>Credit (Cr)</th>
              </tr>
            </thead>
            <tbody>
              {tbData?.groups?.map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 500 }}>{row.groupName}</td>
                  <td style={{ textAlign: 'right', padding: '10px' }}>{row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td style={{ textAlign: 'right', padding: '10px' }}>{row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                </tr>
              ))}
              {tbData && (
                <>
                  <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 700, background: '#f8fafc' }}>
                    <td style={{ padding: '12px 10px' }}>TOTAL BALANCE</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px' }}>₹{Number(tbData.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px' }}>₹{Number(tbData.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style={{ borderTop: '1px dashed #cbd5e1', fontWeight: 700 }}>
                    <td style={{ padding: '10px', color: '#64748b' }}>VARIANCE / ARITHMETIC DIFF</td>
                    <td style={{ padding: '10px' }}></td>
                    <td style={{ textAlign: 'right', padding: '10px', color: '#ef4444' }}>₹{Number(tbData.variance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Trial Balance</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Arithmetic check ledger for {activeCompany?.companyName}
          </p>
        </div>
        {tbData && (
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
      </div>

      {/* Statements Grid */}
      <div className="no-print" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
        <DataGrid
          columns={tbColumns}
          data={tbData?.groups || []}
          keyField="id"
          loading={loading}
          emptyTitle="No Ledger Postings"
          emptyDescription="Save some business vouchers to generate Trial Balance."
        />
        {tbData && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '2px solid var(--color-border)',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            fontSize: '14px',
            fontWeight: 700,
            textAlign: 'right',
          }}>
            <span style={{ textAlign: 'left' }}>Total Balance:</span>
            <span>₹{Number(tbData.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span>₹{Number(tbData.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

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
