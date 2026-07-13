// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — GSTR-2 & ITC Reconciliation Page
// Phase 11.5: GSTR-2 & Supplier Invoice ITC reconciliation
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Calendar, RefreshCw, AlertTriangle, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';

type Gstr2Tab = 'RECONCILE' | 'INPUT_REG' | 'OUTPUT_REG';

export const Gstr2ReconciliationPage: React.FC = () => {
  const { companyId } = useActiveCompany();
  const navigate = useNavigate();

  // Get current financial year dates
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState<Gstr2Tab>('RECONCILE');
  
  // GSTR-2B Data state
  const [gstr2bList, setGstr2bList] = useState<any[]>(() => {
    const saved = localStorage.getItem('diamo_gstr2b_list');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [uploadFileName, setUploadFileName] = useState<string>(() => {
    return localStorage.getItem('diamo_gstr2b_filename') || '';
  });

  // Sync uploaded file state with localStorage
  useEffect(() => {
    localStorage.setItem('diamo_gstr2b_list', JSON.stringify(gstr2bList));
    localStorage.setItem('diamo_gstr2b_filename', uploadFileName);
  }, [gstr2bList, uploadFileName]);

  // IPC Hooks
  const { data: registersData, loading: regLoading, invoke: getGstRegisters } = useIpc<any>('report:gst-registers');
  const { data: recData, loading: recLoading, invoke: reconcileItc } = useIpc<any>('report:reconcile-itc');

  const refreshRegisters = useCallback(async () => {
    if (!companyId) return;
    await getGstRegisters({ companyId, startDate, endDate });
  }, [companyId, startDate, endDate, getGstRegisters]);

  useEffect(() => {
    refreshRegisters();
  }, [refreshRegisters]);

  // Run reconciliation whenever date filters, company, or uploaded list changes
  useEffect(() => {
    if (companyId && gstr2bList.length > 0) {
      reconcileItc({ companyId, gstr2bList, startDate, endDate });
    }
  }, [companyId, gstr2bList, startDate, endDate, reconcileItc]);

  const handleDownloadSample = () => {
    const sampleData = {
      b2b: [
        {
          ctin: "24SUPPLIER1234A",
          inv: [
            {
              inum: "PUR-001", // matches local sample invoices
              idt: "05-07-2026",
              val: 100250,
              itms: [
                {
                  itm_det: {
                    rt: 0.25,
                    txval: 100000,
                    iamt: 0,
                    camt: 125,
                    samt: 125,
                    csamt: 0
                  }
                }
              ]
            }
          ]
        }
      ]
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sampleData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "sample_gstr2b.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = "Supplier GSTIN,Invoice Number,Invoice Date,Total Value,Taxable Value,CGST,SGST,IGST\n24SUPPLIER1234A,PUR-001,05-07-2026,100250,100000,125,125,0\n";
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "sample_gstr2b.csv");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearFile = () => {
    setGstr2bList([]);
    setUploadFileName('');
    localStorage.removeItem('diamo_gstr2b_list');
    localStorage.removeItem('diamo_gstr2b_filename');
  };

  // Handle portal GSTR-2B JSON or CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        
        if (file.name.endsWith('.csv')) {
          // simple CSV parser
          const lines = text.split(/\r?\n/).map(line => {
            // Match commas outside quotes to avoid split bugs on quoted supplier names
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
            return matches.map(m => m.replace(/^"|"$/g, '').trim());
          });
          if (lines.length < 2) throw new Error('Empty CSV file');
          
          const headers = lines[0].map(h => h.toLowerCase());
          const ctinIdx = headers.findIndex(h => h.includes('gstin') || h.includes('supplier'));
          const inumIdx = headers.findIndex(h => h.includes('invoice') || h.includes('bill') || h.includes('inum'));
          const idtIdx = headers.findIndex(h => h.includes('date') || h.includes('idt'));
          const valIdx = headers.findIndex(h => h.includes('value') || h.includes('val') || h.includes('amount'));
          const txvalIdx = headers.findIndex(h => h.includes('taxable') || h.includes('txval'));
          const iamtIdx = headers.findIndex(h => h.includes('igst') || h.includes('integrated'));
          const camtIdx = headers.findIndex(h => h.includes('cgst') || h.includes('central'));
          const samtIdx = headers.findIndex(h => h.includes('sgst') || h.includes('state'));

          const invoices: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i];
            if (row.length < 2 || !row[inumIdx !== -1 ? inumIdx : 1]) continue;

            const ctin = ctinIdx !== -1 ? row[ctinIdx] : '';
            const inum = inumIdx !== -1 ? row[inumIdx] : '';
            const idt = idtIdx !== -1 ? row[idtIdx] : '';
            const val = valIdx !== -1 ? Number(row[valIdx].replace(/[^0-9.]/g, '')) || 0 : 0;
            const txval = txvalIdx !== -1 ? Number(row[txvalIdx].replace(/[^0-9.]/g, '')) || val : val;
            const iamt = iamtIdx !== -1 ? Number(row[iamtIdx].replace(/[^0-9.]/g, '')) || 0 : 0;
            const camt = camtIdx !== -1 ? Number(row[camtIdx].replace(/[^0-9.]/g, '')) || 0 : 0;
            const samt = samtIdx !== -1 ? Number(row[samtIdx].replace(/[^0-9.]/g, '')) || 0 : 0;

            invoices.push({
              ctin,
              inum,
              idt,
              val,
              txval,
              iamt,
              camt,
              samt,
              csamt: 0
            });
          }
          setGstr2bList(invoices);
          return;
        }

        const json = JSON.parse(text);
        // Standard GSTR-2B JSON contains invoices in standard arrays, e.g. json.b2b or json.data or direct arrays
        const b2bInvoices = json.b2b || json.data?.b2b || [];
        
        // Flatten invoice items
        const invoices: any[] = [];
        b2bInvoices.forEach((b2bItem: any) => {
          const ctin = b2bItem.ctin;
          const invList = b2bItem.inv || [];
          invList.forEach((inv: any) => {
            const txval = inv.itms?.[0]?.itm_det?.txval ?? inv.val;
            const iamt = inv.itms?.[0]?.itm_det?.iamt ?? 0;
            const camt = inv.itms?.[0]?.itm_det?.camt ?? 0;
            const samt = inv.itms?.[0]?.itm_det?.samt ?? 0;
            const csamt = inv.itms?.[0]?.itm_det?.csamt ?? 0;

            invoices.push({
              ctin,
              inum: inv.inum,
              idt: inv.idt,
              val: inv.val,
              txval,
              iamt,
              camt,
              samt,
              csamt
            });
          });
        });

        if (invoices.length === 0 && Array.isArray(json)) {
          // If a flat list was uploaded directly
          setGstr2bList(json);
        } else {
          setGstr2bList(invoices);
        }
      } catch (err) {
        alert('Invalid GSTR-2B JSON/CSV file structure. Ensure you are uploading a valid GST offline utility payload.');
        setUploadFileName('');
      }
    };
    reader.readAsText(file);
  };

  // Registers columns
  const registerColumns: Column<any>[] = [
    { key: 'date', header: 'DATE', sortable: true },
    { key: 'invoiceNo', header: 'BILL / INV NO', sortable: true, render: (row) => row.invoiceNo || row.billNo },
    { key: 'partyName', header: 'PARTY NAME', sortable: true },
    { key: 'partyGstin', header: 'GSTIN', align: 'center' },
    { 
      key: 'taxableValue', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${row.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    },
    { 
      key: 'cgst', 
      header: 'CGST', 
      align: 'right',
      render: (row) => row.cgst > 0 ? `₹${row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'sgst', 
      header: 'SGST', 
      align: 'right',
      render: (row) => row.sgst > 0 ? `₹${row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'igst', 
      header: 'IGST', 
      align: 'right',
      render: (row) => row.igst > 0 ? `₹${row.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'netAmount', 
      header: 'NET AMOUNT', 
      align: 'right',
      render: (row) => <span style={{ fontWeight: 600 }}>₹{row.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    },
  ];

  // Reconciliation columns
  const reconcileColumns: Column<any>[] = [
    { key: 'partyGstin', header: 'SUPPLIER GSTIN', sortable: true },
    { key: 'billNo', header: 'BILL NO', sortable: true },
    { key: 'partyName', header: 'PARTY NAME' },
    { 
      key: 'localTaxable', 
      header: 'TAXABLE (BOOKS)', 
      align: 'right',
      render: (row) => row.localTaxable != null ? `₹${row.localTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'localTax', 
      header: 'TAX (BOOKS)', 
      align: 'right',
      render: (row) => row.localTax != null ? `₹${row.localTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'portalTaxable', 
      header: 'TAXABLE (GSTR-2B)', 
      align: 'right',
      render: (row) => row.portalTaxable != null ? `₹${row.portalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'portalTax', 
      header: 'TAX (GSTR-2B)', 
      align: 'right',
      render: (row) => row.portalTax != null ? `₹${row.portalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'status', 
      header: 'STATUS', 
      align: 'center',
      render: (row) => {
        const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
          MATCHED: { bg: 'var(--color-success-light)', text: 'var(--color-success)', icon: <CheckCircle size={14} /> },
          MISMATCH: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)', icon: <AlertTriangle size={14} /> },
          MISSING_IN_PORTAL: { bg: 'var(--color-bg-card)', text: 'var(--color-text-secondary)', icon: <HelpCircle size={14} /> },
          NOT_IN_BOOKS: { bg: 'var(--color-error-light)', text: 'var(--color-error)', icon: <XCircle size={14} /> },
        };
        const cfg = statusColors[row.status] || { bg: '#f1f5f9', text: '#64748b', icon: null };
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: cfg.bg,
            color: cfg.text,
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            {cfg.icon}
            {row.status.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'ACTION',
      align: 'center',
      render: (row) => {
        if (row.status === 'NOT_IN_BOOKS') {
          return (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/transactions/purchases/new', {
                state: {
                  prefill: {
                    supplierGstin: row.partyGstin,
                    billNumber: row.billNo,
                    totalGrossAmount: row.portalTaxable,
                    totalTax: row.portalTax
                  }
                }
              })}
            >
              Record Purchase
            </Button>
          );
        }
        if (row.purchaseId) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/transactions/purchases/${row.purchaseId}`)}
            >
              View Bill
            </Button>
          );
        }
        return '—';
      }
    },
  ];

  const getGridData = () => {
    if (activeTab === 'INPUT_REG') return registersData?.inputRegister || [];
    if (activeTab === 'OUTPUT_REG') return registersData?.outputRegister || [];
    return recData?.reconciledList || [];
  };

  const getGridColumns = () => {
    if (activeTab === 'RECONCILE') return reconcileColumns;
    return registerColumns;
  };

  const s = recData?.summary ?? { matchedItc: 0, mismatchItc: 0, supplierPendingItc: 0, notInBooksItc: 0, totalLocalItc: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>GSTR-2 & ITC Reconciliation</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Reconcile recorded input tax credit (ITC) books against supplier filings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={handleDownloadSample} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UploadCloud size={16} /> Sample JSON
          </Button>
          <Button variant="ghost" onClick={handleDownloadSampleCsv} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UploadCloud size={16} /> Sample CSV
          </Button>
          <Button variant="primary" onClick={refreshRegisters} disabled={regLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} className={regLoading ? 'animate-spin' : ''} /> Refresh Registers
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <div style={{
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

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '4px' }}>
        <button
          onClick={() => setActiveTab('RECONCILE')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'RECONCILE' ? 700 : 500,
            color: activeTab === 'RECONCILE' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'RECONCILE' ? '2px solid var(--color-primary)' : 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          ITC Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('INPUT_REG')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'INPUT_REG' ? 700 : 500,
            color: activeTab === 'INPUT_REG' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'INPUT_REG' ? '2px solid var(--color-primary)' : 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          Input GST Register (Purchases)
        </button>
        <button
          onClick={() => setActiveTab('OUTPUT_REG')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'OUTPUT_REG' ? 700 : 500,
            color: activeTab === 'OUTPUT_REG' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'OUTPUT_REG' ? '2px solid var(--color-primary)' : 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          Output GST Register (Sales)
        </button>
      </div>

      {/* Tab Context Block */}
      {activeTab === 'RECONCILE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* File Upload Zone */}
          {!uploadFileName ? (
            <div style={{
              background: 'var(--color-surface)',
              border: '2px dashed var(--color-border)',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <UploadCloud size={32} style={{ color: 'var(--color-primary)' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700 }}>
                Upload GSTR-2B JSON / CSV file
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                Drag and drop the official portal offline utility JSON or CSV return file here to reconcile.
              </p>
            </div>
          ) : (
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderLeft: '4px solid var(--color-primary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={20} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>
                    Active File: {uploadFileName}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {gstr2bList.length} records successfully loaded and matched.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Button variant="ghost" size="sm" style={{ color: 'var(--color-primary)' }}>
                    Upload Different File
                  </Button>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileUpload}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearFile} style={{ color: 'var(--color-error)' }}>
                  Remove File
                </Button>
              </div>
            </div>
          )}



          {/* Reconciliation Summary Cards */}
          {gstr2bList.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', borderLeft: '4px solid var(--color-success)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Matched ITC</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px' }}>₹{s.matchedItc.toLocaleString('en-IN')}</p>
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', borderLeft: '4px solid var(--color-warning)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Mismatch ITC</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-warning)', marginTop: '4px' }}>₹{s.mismatchItc.toLocaleString('en-IN')}</p>
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', borderLeft: '4px solid #64748b' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Supplier Pending</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: '#64748b', marginTop: '4px' }}>₹{s.supplierPendingItc.toLocaleString('en-IN')}</p>
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', borderLeft: '4px solid var(--color-error)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Not in Books</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-error)', marginTop: '4px' }}>₹{s.notInBooksItc.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
        <DataGrid
          columns={getGridColumns()}
          data={getGridData()}
          keyField="id"
          loading={activeTab === 'RECONCILE' ? recLoading : regLoading}
          emptyTitle="No Records Found"
          emptyDescription={
            activeTab === 'RECONCILE' && gstr2bList.length === 0
              ? 'Please upload a GSTR-2B JSON file to start the ITC reconciliation.'
              : 'No transactions found in selected period.'
          }
        />
      </div>
    </div>
  );
};
