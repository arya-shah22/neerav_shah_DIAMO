// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Journal Voucher (JV Book) Page (Stage 7 / Phase 8)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Printer } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, Select, useToast } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { IAccount } from '../account/account.types';
import { PrintTemplate } from '../../components/ui/PrintTemplate';

import { useCompanyStore } from '../../state/company-store';

export const JVBookPage: React.FC = () => {
  const { showToast } = useToast();
  const { companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);
  const [printData, setPrintData] = useState<any | null>(null);
  const [printConfig, setPrintConfig] = useState<any>(null);
  const { invoke: getTemplateConfig } = useIpc<any>('print:get-template-config');

  const handlePrintClick = async (row: any) => {
    if (!companyId) return;
    const res = await getTemplateConfig({ companyId, voucherType: 'JOURNAL_VOUCHER' });
    if (res.success && res.data) {
      setPrintConfig(res.data);
    }
    setPrintData(row);
  };

  // IPC hooks
  const { invoke: fetchAccounts } = useIpc<IAccount[]>('account:list');
  const { invoke: createJournal } = useIpc('journal:create');
  const { data: journals, loading, invoke: refreshJournals } = useIpc<any[]>('journal:list');
  const { invoke: deleteJournal } = useIpc('journal:delete');
  const { invoke: fetchPreviewNo } = useIpc<string>('journal:preview-number');

  // Form states
  const [billNumber, setBillNumber] = useState('');
  const [isManualBillNumber, setIsManualBillNumber] = useState(false);
  const [previewVoucherNo, setPreviewVoucherNo] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [drAccountId, setDrAccountId] = useState<number | null>(null);
  const [crAccountId, setCrAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  
  // Taxes adjustments percentage & amount states
  const [sgstPct, setSgstPct] = useState<number>(0);
  const [sgstAmt, setSgstAmt] = useState<number>(0);
  const [cgstPct, setCgstPct] = useState<number>(0);
  const [cgstAmt, setCgstAmt] = useState<number>(0);
  const [igstPct, setIgstPct] = useState<number>(0);
  const [igstAmt, setIgstAmt] = useState<number>(0);
  const [tdsPct, setTdsPct] = useState<number>(0);
  const [tdsAmt, setTdsAmt] = useState<number>(0);

  // Remarks
  const [remark1, setRemark1] = useState('');
  const [remark2, setRemark2] = useState('');
  const [remark3, setRemark3] = useState('');

  // Dropdown list
  const [accountsList, setAccountsList] = useState<IAccount[]>([]);

  const refreshData = useCallback(async () => {
    if (!companyId) return;
    await refreshJournals({ companyId });
    const accs = await fetchAccounts({ companyId });
    if (accs.success) {
      setAccountsList(accs.data || []);
    }
  }, [companyId, refreshJournals, fetchAccounts]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!companyId) return;
    if (activeFinancialYear) {
      fetchPreviewNo({ companyId, financialYearId: activeFinancialYear.id }).then((res) => {
        if (res.success && res.data) {
          setPreviewVoucherNo(res.data);
          setBillNumber(res.data);
        }
      });
    }
  }, [companyId, activeFinancialYear, fetchPreviewNo]);

  // Bidirectional calculations
  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (val > 0) {
      setSgstAmt(Number((val * (sgstPct / 100)).toFixed(2)));
      setCgstAmt(Number((val * (cgstPct / 100)).toFixed(2)));
      setIgstAmt(Number((val * (igstPct / 100)).toFixed(2)));
      setTdsAmt(Number((val * (tdsPct / 100)).toFixed(2)));
    } else {
      setSgstAmt(0);
      setCgstAmt(0);
      setIgstAmt(0);
      setTdsAmt(0);
    }
  };

  const handlePctChange = (type: 'sgst' | 'cgst' | 'igst' | 'tds', pct: number) => {
    if (type === 'sgst') {
      setSgstPct(pct);
      setSgstAmt(Number((amount * (pct / 100)).toFixed(2)));
    } else if (type === 'cgst') {
      setCgstPct(pct);
      setCgstAmt(Number((amount * (pct / 100)).toFixed(2)));
    } else if (type === 'igst') {
      setIgstPct(pct);
      setIgstAmt(Number((amount * (pct / 100)).toFixed(2)));
    } else if (type === 'tds') {
      setTdsPct(pct);
      setTdsAmt(Number((amount * (pct / 100)).toFixed(2)));
    }
  };

  const handleAmtChange = (type: 'sgst' | 'cgst' | 'igst' | 'tds', amt: number) => {
    if (type === 'sgst') {
      setSgstAmt(amt);
      if (amount > 0) {
        setSgstPct(Number(((amt / amount) * 100).toFixed(4)));
      }
    } else if (type === 'cgst') {
      setCgstAmt(amt);
      if (amount > 0) {
        setCgstPct(Number(((amt / amount) * 100).toFixed(4)));
      }
    } else if (type === 'igst') {
      setIgstAmt(amt);
      if (amount > 0) {
        setIgstPct(Number(((amt / amount) * 100).toFixed(4)));
      }
    } else if (type === 'tds') {
      setTdsAmt(amt);
      if (amount > 0) {
        setTdsPct(Number(((amt / amount) * 100).toFixed(4)));
      }
    }
  };

  // Bill Adjustment / Kasar Settlement states
  const [isBillAdjustment, setIsBillAdjustment] = useState(false);
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const { invoke: fetchPendingBills } = useIpc<any[]>('journal:pending-bills');

  // Load pending bills when party account changes (checking both Cr and Dr accounts)
  const partyAccountId = crAccountId || drAccountId;

  useEffect(() => {
    if (!companyId || !partyAccountId || !isBillAdjustment) {
      setPendingBills([]);
      setSelectedBillId(null);
      return;
    }
    fetchPendingBills({ companyId, accountId: partyAccountId }).then((res) => {
      if (res.success && res.data) {
        setPendingBills(res.data);
      }
    });
  }, [companyId, partyAccountId, isBillAdjustment, fetchPendingBills]);

  // When a bill is selected, auto-fill amount with its pending balance if amount is 0
  const handleSelectBill = (billIdStr: string) => {
    const bId = Number(billIdStr) || null;
    setSelectedBillId(bId);
    if (bId) {
      const target = pendingBills.find((b) => b.id === bId);
      if (target && (!amount || amount === 0)) {
        setAmount(Number(target.outstandingAmount) || 0);
      }
    }
  };

  // Handlers
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    if (!drAccountId || !crAccountId) {
      showToast('Please select both Debit and Credit accounts', 'error');
      return;
    }
    if (drAccountId === crAccountId) {
      showToast('Debit and Credit accounts cannot be the same', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('Amount must be greater than zero', 'error');
      return;
    }

    const payload = {
      financialYearId: activeFinancialYear?.id,
      voucherDate,
      drAccountId,
      crAccountId,
      amount,
      isManualBillNumber,
      billNumber: isManualBillNumber ? billNumber : previewVoucherNo,
      outstandingBillId: isBillAdjustment ? selectedBillId : null,
      sgst: sgstPct,
      cgst: cgstPct,
      igst: igstPct,
      tds: tdsPct,
      remark1,
      remark2,
      remark3,
    };

    const res = await createJournal({ companyId, data: payload });
    if (res.success) {
      showToast('Journal Voucher saved successfully', 'success');
      // Reset form states
      setDrAccountId(null);
      setCrAccountId(null);
      setIsBillAdjustment(false);
      setSelectedBillId(null);
      setPendingBills([]);
      setAmount(0);
      setSgstPct(0);
      setSgstAmt(0);
      setCgstPct(0);
      setCgstAmt(0);
      setIgstPct(0);
      setIgstAmt(0);
      setTdsPct(0);
      setTdsAmt(0);
      setRemark1('');
      setRemark2('');
      setRemark3('');
      await refreshData();
    } else {
      showToast(res.error || 'Failed to save voucher', 'error');
    }
  };

  const handleDelete = async (id: number, number: string) => {
    if (!companyId || !confirm(`Delete Journal Voucher ${number}? This will reverse double-entry ledger postings.`)) return;
    const res = await deleteJournal({ id, companyId });
    if (res.success) {
      showToast('Journal Voucher deleted successfully', 'success');
      await refreshData();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const getNarrationField = (narrationStr: string | null, fieldName: string) => {
    try {
      if (!narrationStr) return '—';
      const parsed = JSON.parse(narrationStr);
      if (parsed[fieldName] !== undefined && parsed[fieldName] !== '') {
        if (typeof parsed[fieldName] === 'number') {
          return parsed[fieldName] > 0 ? `${parsed[fieldName]}%` : '0%';
        }
        return parsed[fieldName];
      }
      return '—';
    } catch {
      return '—';
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'voucherNumber',
      header: 'VOUCHER NO',
      render: (row) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.voucherNumber}</span>
    },
    {
      key: 'voucherDate',
      header: 'DATE',
      render: (row) => new Date(row.voucherDate).toLocaleDateString('en-IN')
    },
    {
      key: 'drAccount',
      header: 'DR. ACCOUNT',
      render: (row) => row.lines.find((l: any) => l.debitCreditType === 'DEBIT')?.account?.accountName || '—'
    },
    {
      key: 'crAccount',
      header: 'CR. ACCOUNT',
      render: (row) => row.lines.find((l: any) => l.debitCreditType === 'CREDIT')?.account?.accountName || '—'
    },
    {
      key: 'totalDebit',
      header: 'AMOUNT',
      render: (row) => `₹ ${Number(row.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    },
    {
      key: 'totalAmount',
      header: 'TOTAL AMOUNT',
      render: (row) => {
        try {
          const base = Number(row.totalDebit);
          if (!row.narration) return `₹ ${base.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
          const parsed = JSON.parse(row.narration);
          const sgstPct = Number(parsed.sgst) || 0;
          const cgstPct = Number(parsed.cgst) || 0;
          const igstPct = Number(parsed.igst) || 0;
          const tdsPct = Number(parsed.tds) || 0;
          
          const sgstAmt = Number((base * (sgstPct / 100)).toFixed(2));
          const cgstAmt = Number((base * (cgstPct / 100)).toFixed(2));
          const igstAmt = Number((base * (igstPct / 100)).toFixed(2));
          const tdsAmt = Number((base * (tdsPct / 100)).toFixed(2));
          
          const net = base + sgstAmt + cgstAmt + igstAmt - tdsAmt;
          return `₹ ${net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        } catch {
          return `₹ ${Number(row.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        }
      }
    },
    {
      key: 'sgst',
      header: 'SGST',
      render: (row) => getNarrationField(row.narration, 'sgst')
    },
    {
      key: 'cgst',
      header: 'CGST',
      render: (row) => getNarrationField(row.narration, 'cgst')
    },
    {
      key: 'igst',
      header: 'IGST',
      render: (row) => getNarrationField(row.narration, 'igst')
    },
    {
      key: 'tds',
      header: 'TDS',
      render: (row) => getNarrationField(row.narration, 'tds')
    },
    {
      key: 'remark1',
      header: 'REMARK 1',
      render: (row) => getNarrationField(row.narration, 'remark1')
    },
    {
      key: 'remark2',
      header: 'REMARK 2',
      render: (row) => getNarrationField(row.narration, 'remark2')
    },
    {
      key: 'remark3',
      header: 'REMARK 3',
      render: (row) => getNarrationField(row.narration, 'remark3')
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '120px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="ghost" size="sm" onClick={() => handlePrintClick(row)} title="Print A4 Layout">
            <Printer size={14} color="var(--color-primary)" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id, row.voucherNumber)} title="Delete">
            <Trash2 size={14} color="var(--color-danger)" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header Title */}
      <div>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
          Journal Voucher (JV) Book
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Record balanced adjustments and tax allocations between ledger accounts.
        </p>
      </div>

      {/* Entry Form Grid */}
      <form onSubmit={handleSave} style={{
        background: 'var(--color-surface)',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {/* Feature Checkbox Row */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: isBillAdjustment ? 'rgba(59, 130, 246, 0.04)' : 'var(--color-row-alt)',
          border: isBillAdjustment ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          transition: 'all var(--transition-fast)'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: 'var(--color-primary)' }}>
            <input
              type="checkbox"
              checked={isBillAdjustment}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsBillAdjustment(checked);
                if (!checked) {
                  setSelectedBillId(null);
                  setPendingBills([]);
                }
              }}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
            />
            <span>Adjust Specific Bill (Kasar / Discount Settlement)</span>
          </label>

          {/* Manual Bill Number Config */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <input type="checkbox" checked={isManualBillNumber} onChange={(e) => setIsManualBillNumber(e.target.checked)} />
              Enter bill number manually
            </label>
            <div style={{ flex: 1, maxWidth: '300px' }}>
              <Input 
                placeholder={previewVoucherNo || "Auto-Generated sequential number"} 
                disabled={!isManualBillNumber} 
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Inputs Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          <Input
            label="Voucher Date *"
            type="date"
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
          />

          {isBillAdjustment ? (
            <>
              {/* Party Selection in Bill Adjustment Mode */}
              <Select
                label="Party Name *"
                value={crAccountId ? String(crAccountId) : (drAccountId ? String(drAccountId) : '')}
                onChange={(val) => {
                  const pId = Number(val) || null;
                  setCrAccountId(pId);
                  setDrAccountId(null);
                }}
                options={accountsList.map(a => ({ value: String(a.id), label: a.accountName }))}
                placeholder="Select Party Name"
              />

              {/* Bill Selection in Bill Adjustment Mode */}
              <Select
                label="Select Pending Bill *"
                value={selectedBillId ? String(selectedBillId) : ''}
                onChange={handleSelectBill}
                disabled={!partyAccountId}
                options={pendingBills.map((b) => ({
                  value: String(b.id),
                  label: `${b.billNumber} (${new Date(b.billDate).toLocaleDateString('en-IN')}) — Unpaid: ₹${Number(b.outstandingAmount).toLocaleString('en-IN')}`
                }))}
                placeholder={!partyAccountId ? "Select Party first..." : (pendingBills.length === 0 ? "No pending bills found" : "Choose bill to adjust...")}
              />
            </>
          ) : (
            <>
              {/* Standard Debit & Credit Selects */}
              <Select
                label="Debit Account (Dr. A/C) *"
                value={drAccountId ? String(drAccountId) : ''}
                onChange={(val) => setDrAccountId(Number(val) || null)}
                options={accountsList.map(a => ({ value: String(a.id), label: a.accountName }))}
                placeholder="Select debit account"
              />

              <Select
                label="Credit Account (Cr. A/C) *"
                value={crAccountId ? String(crAccountId) : ''}
                onChange={(val) => setCrAccountId(Number(val) || null)}
                options={accountsList.map(a => ({ value: String(a.id), label: a.accountName }))}
                placeholder="Select credit account"
              />
            </>
          )}

          <Input
            label="Kasar / Discount Amount *"
            type="number"
            placeholder="0.00"
            value={amount || ''}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
          />
        </div>

        {/* Bill Settlement Informational Banner */}
        {isBillAdjustment && selectedBillId && (
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', color: 'var(--color-primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            💡 <strong>Bill Settlement:</strong> Deducting <strong>₹{Number(amount || 0).toLocaleString('en-IN')}</strong> from bill <strong>#{pendingBills.find(b => b.id === selectedBillId)?.billNumber}</strong> outstanding balance and marking it as settled/paid.
          </div>
        )}

        {/* Taxes and Adjustments Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          background: 'rgba(0,0,0,0.01)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px dashed var(--color-border)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input
              label="SGST %"
              type="number"
              value={sgstPct || ''}
              onChange={(e) => handlePctChange('sgst', Number(e.target.value))}
            />
            <Input
              label="SGST Value"
              type="number"
              placeholder="0.00"
              value={sgstAmt || ''}
              onChange={(e) => handleAmtChange('sgst', Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input
              label="CGST %"
              type="number"
              value={cgstPct || ''}
              onChange={(e) => handlePctChange('cgst', Number(e.target.value))}
            />
            <Input
              label="CGST Value"
              type="number"
              placeholder="0.00"
              value={cgstAmt || ''}
              onChange={(e) => handleAmtChange('cgst', Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input
              label="IGST %"
              type="number"
              value={igstPct || ''}
              onChange={(e) => handlePctChange('igst', Number(e.target.value))}
            />
            <Input
              label="IGST Value"
              type="number"
              placeholder="0.00"
              value={igstAmt || ''}
              onChange={(e) => handleAmtChange('igst', Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Input
              label="TDS %"
              type="number"
              value={tdsPct || ''}
              onChange={(e) => handlePctChange('tds', Number(e.target.value))}
            />
            <Input
              label="TDS Value"
              type="number"
              placeholder="0.00"
              value={tdsAmt || ''}
              onChange={(e) => handleAmtChange('tds', Number(e.target.value))}
            />
          </div>
        </div>

        {/* Remarks Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}>
          <Input
            label="Remark 1"
            placeholder="Internal narration / note 1"
            value={remark1}
            onChange={(e) => setRemark1(e.target.value)}
          />
          <Input
            label="Remark 2"
            placeholder="Internal narration / note 2"
            value={remark2}
            onChange={(e) => setRemark2(e.target.value)}
          />
          <Input
            label="Remark 3"
            placeholder="Internal narration / note 3"
            value={remark3}
            onChange={(e) => setRemark3(e.target.value)}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--color-surface-hover)',
          padding: '16px 24px',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          marginTop: '8px',
        }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginRight: '8px' }}>Total Amount:</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>
              ₹ {Number(amount + sgstAmt + cgstAmt + igstAmt - tdsAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <Button variant="primary" type="submit">Save Voucher</Button>
        </div>
      </form>

      {/* Recent Entries Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>Recent Journal Vouchers</h3>
        <DataGrid
          columns={columns}
          data={journals || []}
          keyField="id"
          loading={loading}
          emptyTitle="No recent JV entries found"
          emptyDescription="Create a Journal Voucher entry to post adjustments."
        />
      </div>

      {printData && (
        <PrintTemplate
          type="JOURNAL"
          data={printData}
          layoutConfig={printConfig}
          onClose={() => {
            setPrintData(null);
            setPrintConfig(null);
          }}
        />
      )}
    </div>
  );
};
