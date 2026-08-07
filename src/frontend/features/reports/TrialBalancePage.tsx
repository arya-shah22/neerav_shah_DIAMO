// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Trial Balance Page
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, ArrowLeft, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { getTrialBalanceCSV } from '../../utils/reportExports';

type TbTab = 'GROUPED' | 'DETAILED';

export const TrialBalancePage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<TbTab>('GROUPED');
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

  // Grouped Schedule View Dataset
  const groupedData = useMemo(() => {
    if (!tbData?.groups) return [];
    const map: Record<string, { id: string; groupName: string; nature: string; accountCount: number; debit: number; credit: number }> = {};
    for (const r of tbData.groups) {
      const grp = r.groupName || 'Primary Group';
      if (!map[grp]) {
        map[grp] = { id: grp, groupName: grp, nature: r.nature || 'Assets', accountCount: 0, debit: 0, credit: 0 };
      }
      map[grp].accountCount++;
      map[grp].debit += Number(r.debit || 0);
      map[grp].credit += Number(r.credit || 0);
    }
    return Object.values(map);
  }, [tbData]);

  // Hierarchical Detailed View grouped by Account Group Headings
  const detailedSections = useMemo(() => {
    if (!tbData?.groups) return [];
    const map: Record<string, { groupName: string; totalDebit: number; totalCredit: number; accounts: any[] }> = {};
    for (const r of tbData.groups) {
      const grp = r.groupName || 'Primary Group';
      if (!map[grp]) {
        map[grp] = { groupName: grp, totalDebit: 0, totalCredit: 0, accounts: [] };
      }
      map[grp].accounts.push(r);
      map[grp].totalDebit += Number(r.debit || 0);
      map[grp].totalCredit += Number(r.credit || 0);
    }
    return Object.values(map);
  }, [tbData]);

  const groupedColumns: Column<any>[] = useMemo(() => [
    { key: 'groupName', header: 'ACCOUNT GROUP', sortable: true },
    { key: 'accountCount', header: 'ACCOUNTS', align: 'center', render: (row) => `${row.accountCount} Accounts` },
    {
      key: 'debit',
      header: 'DEBIT (Dr)',
      align: 'right',
      render: (row) => row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
    },
    {
      key: 'credit',
      header: 'CREDIT (Cr)',
      align: 'right',
      render: (row) => row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
    },
  ], []);

  const detailedAccountColumns: Column<any>[] = useMemo(() => [
    { key: 'accountName', header: 'ACCOUNT NAME', sortable: true },
    {
      key: 'debit',
      header: 'DEBIT (Dr)',
      align: 'right',
      render: (row) => row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
    },
    {
      key: 'credit',
      header: 'CREDIT (Cr)',
      align: 'right',
      render: (row) => row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
    },
  ], []);

  const triggerDirectPrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportCSV = () => {
    if (!tbData || !tbData.groups) return;
    const csvContent = getTrialBalanceCSV(tbData);
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
    }, 500);
  };

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  // Render Print Preview Mode mounted on document.body
  if (showPrintPreview && activeCompany) {
    return createPortal(
      <div id="print-preview-root" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: '#f1f5f9',
        zIndex: 99999,
        overflowY: 'auto',
        padding: '32px 24px 64px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box'
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
          alignItems: 'center',
          width: '100%',
          maxWidth: '960px',
          marginBottom: '20px', 
          padding: '12px 24px', 
          background: 'var(--color-surface)', 
          border: '1px solid var(--color-border)', 
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          boxSizing: 'border-box'
        }}>
          <Button variant="ghost" onClick={() => setShowPrintPreview(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Page
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Export CSV
            </Button>
            <Button variant="ghost" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Export PDF
            </Button>
            <Button variant="primary" onClick={triggerDirectPrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print
            </Button>
          </div>
        </div>

        {/* Printable Portrait Sheet */}
        <div id="print-area" className="print-page" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          padding: '20mm',
          width: '100%',
          maxWidth: '960px',
          boxSizing: 'border-box',
          color: '#1e293b'
        }}>
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a', textAlign: 'center' }}>
              {activeCompany.companyName}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '12px', textAlign: 'center' }}>
              {activeCompany.addressLine1} {activeCompany.addressLine2 && `, ${activeCompany.addressLine2}`} | {activeCompany.city} - {activeCompany.pincode}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-primary)' }}>
                TRIAL BALANCE STATEMENT ({activeTab === 'GROUPED' ? 'GROUPED SCHEDULE' : 'DETAILED ACCOUNTS'})
              </span>
              <span>AS OF: {new Date(filterDate).toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2.5px solid #0f172a', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>
                {activeTab === 'GROUPED' ? (
                  <>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Account Group</th>
                    <th style={{ textAlign: 'center', padding: '10px' }}>Accounts</th>
                  </>
                ) : (
                  <>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Account Name / Group Schedule</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Type</th>
                  </>
                )}
                <th style={{ textAlign: 'right', padding: '10px', width: '140px' }}>Debit (Dr)</th>
                <th style={{ textAlign: 'right', padding: '10px', width: '140px' }}>Credit (Cr)</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'GROUPED' ? (
                groupedData.map((row: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#0f172a' }}>{row.groupName}</td>
                    <td style={{ textAlign: 'center', padding: '10px', color: '#475569' }}>{row.accountCount}</td>
                    <td style={{ textAlign: 'right', padding: '10px' }}>{row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                    <td style={{ textAlign: 'right', padding: '10px' }}>{row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                  </tr>
                ))
              ) : (
                detailedSections.map((sec, secIdx) => (
                  <React.Fragment key={secIdx}>
                    {/* Account Group Banner Header */}
                    <tr style={{ background: '#e2e8f0', borderTop: '2px solid #cbd5e1', borderBottom: '1px solid #94a3b8' }}>
                      <td colSpan={2} style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', fontSize: '12px' }}>
                        📁 {sec.groupName} ({sec.accounts.length} Accounts)
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                        {sec.totalDebit > 0 ? `₹${sec.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                        {sec.totalCredit > 0 ? `₹${sec.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                    {/* Individual Accounts inside this group */}
                    {sec.accounts.map((row: any, accIdx: number) => (
                      <tr key={accIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px 8px 24px', color: '#1e293b' }}>
                          ↳ {row.accountName}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '11px' }}>Account</td>
                        <td style={{ textAlign: 'right', padding: '8px 10px' }}>{row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                        <td style={{ textAlign: 'right', padding: '8px 10px' }}>{row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
              {tbData && (
                <>
                  <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 700, background: '#f8fafc' }}>
                    <td colSpan={2} style={{ padding: '12px 10px' }}>TOTAL BALANCE</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px' }}>₹{Number(tbData.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px' }}>₹{Number(tbData.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style={{ borderTop: '1px dashed #cbd5e1', fontWeight: 700 }}>
                    <td colSpan={3} style={{ padding: '10px', color: '#64748b' }}>VARIANCE / ARITHMETIC DIFFERENCE</td>
                    <td style={{ textAlign: 'right', padding: '10px', color: Math.abs(tbData.variance || 0) < 0.01 ? '#16a34a' : '#ef4444' }}>
                      ₹{Number(tbData.variance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>,
      document.body
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

      {/* Date Filter & Tab Switcher Bar */}
      <div className="no-print" style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Sub-Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--color-bg)', padding: '4px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('GROUPED')}
            style={{
              padding: '6px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'GROUPED' ? 700 : 500,
              background: activeTab === 'GROUPED' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'GROUPED' ? '#ffffff' : 'var(--color-text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Grouped Schedule View
          </button>
          <button
            onClick={() => setActiveTab('DETAILED')}
            style={{
              padding: '6px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'DETAILED' ? 700 : 500,
              background: activeTab === 'DETAILED' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'DETAILED' ? '#ffffff' : 'var(--color-text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Detailed Account View
          </button>
        </div>

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
        {activeTab === 'GROUPED' ? (
          <DataGrid
            columns={groupedColumns}
            data={groupedData}
            keyField="groupName"
            loading={loading}
            emptyTitle="No Ledger Postings"
            emptyDescription="Save some business vouchers to generate Trial Balance."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {detailedSections.map((sec, idx) => (
              <div key={idx} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--color-bg)',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>📁 {sec.groupName}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                      {sec.accounts.length} accounts
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', fontWeight: 600 }}>
                    {sec.totalDebit > 0 && <span style={{ color: 'var(--color-primary)' }}>Total Dr: ₹{sec.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                    {sec.totalCredit > 0 && <span style={{ color: 'var(--color-success)' }}>Total Cr: ₹{sec.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                  </div>
                </div>
                <DataGrid
                  columns={detailedAccountColumns}
                  data={sec.accounts}
                  keyField="id"
                  loading={loading}
                />
              </div>
            ))}
          </div>
        )}

        {tbData && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '2px solid var(--color-border)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            fontSize: '14px',
            fontWeight: 700,
            textAlign: 'right',
          }}>
            <span style={{ textAlign: 'left', gridColumn: 'span 2' }}>Total Balance:</span>
            <span>₹{Number(tbData.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span>₹{Number(tbData.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
