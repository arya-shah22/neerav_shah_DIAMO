// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Cash & Bank Vouchers Page (Phase 9)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, AlertTriangle, Plus, Minus, Wallet, FileText, CheckSquare, Square, Printer } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, Select, useToast } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { IAccount } from '../account/account.types';
import { PrintTemplate } from '../../components/ui/PrintTemplate';

import { useCompanyStore } from '../../state/company-store';

export const CashBankPage: React.FC = () => {
  const { showToast } = useToast();
  const { companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);
  const [printData, setPrintData] = useState<any | null>(null);
  const [printConfig, setPrintConfig] = useState<any>(null);
  const { invoke: getTemplateConfig } = useIpc<any>('print:get-template-config');

  const handlePrintClick = async (row: any) => {
    if (!companyId) return;
    const res = await getTemplateConfig({ companyId, voucherType: row.transactionType });
    if (res.success && res.data) {
      setPrintConfig(res.data);
    }
    setPrintData(row);
  };

  // IPC hooks
  const { invoke: fetchAccounts } = useIpc<IAccount[]>('account:list');
  const { invoke: createVoucher } = useIpc('cashbank:create');
  const { data: vouchers, loading, invoke: refreshVouchers } = useIpc<any[]>('cashbank:list');
  const { invoke: deleteVoucher } = useIpc('cashbank:delete');
  const { invoke: getBalance } = useIpc<number>('cashbank:balance');
  const { invoke: fetchUnpaidPurchases } = useIpc<any[]>('cashbank:unpaid-purchases');
  const { invoke: fetchUnpaidSales } = useIpc<any[]>('cashbank:unpaid-sales');
  const { invoke: fetchPartyNotes } = useIpc<any[]>('cashbank:party-notes');
  const { invoke: fetchPreviewNo } = useIpc<string>('cashbank:preview-number');

  // Form states
  const [transactionType, setTransactionType] = useState<'CASH_PAYMENT' | 'CASH_RECEIPT' | 'BANK_PAYMENT' | 'BANK_RECEIPT'>('CASH_PAYMENT');
  const [isManualBillNumber, setIsManualBillNumber] = useState(false);
  const [previewVoucherNo, setPreviewVoucherNo] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualVoucherNo, setManualVoucherNo] = useState('');
  const [partyId, setPartyId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [referenceBillNo, setReferenceBillNo] = useState('');
  
  // Credit/Debit Note adjustments (Cumulative)
  const [applyCreditAdjustment, setApplyCreditAdjustment] = useState(false);
  const [applyDebitAdjustment, setApplyDebitAdjustment] = useState(false);
  const [creditAdjustmentAmount, setCreditAdjustmentAmount] = useState<number>(0);
  const [debitAdjustmentAmount, setDebitAdjustmentAmount] = useState<number>(0);

  const [totalCreditNotesVal, setTotalCreditNotesVal] = useState<number>(0);
  const [totalDebitNotesVal, setTotalDebitNotesVal] = useState<number>(0);

  // Dynamic remarks array
  const [remarks, setRemarks] = useState<string[]>(['']);

  // Dropdown lists
  const [accountsList, setAccountsList] = useState<IAccount[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [bankBalance, setBankBalance] = useState<number>(0);

  const refreshData = useCallback(async () => {
    if (!companyId) return;
    await refreshVouchers({ companyId });
    const accs = await fetchAccounts({ companyId });
    if (accs.success) {
      setAccountsList(accs.data || []);
    }
  }, [companyId, refreshVouchers, fetchAccounts]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!companyId) return;
    if (activeFinancialYear) {
      fetchPreviewNo({ companyId, financialYearId: activeFinancialYear.id, type: transactionType }).then((res) => {
        if (res.success && res.data) {
          setPreviewVoucherNo(res.data);
          setManualVoucherNo(res.data);
        }
      });
    }
  }, [companyId, transactionType, activeFinancialYear, fetchPreviewNo]);

  // Handoff default Cash vs Bank account selection
  const getAssetAccountId = useCallback((): number | null => {
    const isCash = transactionType === 'CASH_PAYMENT' || transactionType === 'CASH_RECEIPT';
    const matchKeyword = isCash ? 'cash' : 'bank';
    const matched = accountsList.find(a => 
      a.accountName.toLowerCase().includes(matchKeyword)
    );
    return matched ? matched.id : null;
  }, [transactionType, accountsList]);

  const assetAccountId = getAssetAccountId();

  // Load unpaid bills & credit/debit notes when party or type changes
  useEffect(() => {
    const loadUnpaidBillsAndNotes = async () => {
      if (!companyId || !partyId) {
        setUnpaidBills([]);
        setTotalCreditNotesVal(0);
        setTotalDebitNotesVal(0);
        return;
      }
      const isPurchase = transactionType === 'CASH_PAYMENT' || transactionType === 'BANK_PAYMENT';
      if (isPurchase) {
        const res = await fetchUnpaidPurchases({ companyId, supplierId: partyId });
        if (res.success) setUnpaidBills(res.data || []);
      } else {
        const res = await fetchUnpaidSales({ companyId, customerId: partyId });
        if (res.success) setUnpaidBills(res.data || []);
      }

      // Load Credit/Debit return adjustments
      const notesRes = await fetchPartyNotes({ companyId, partyId });
      if (notesRes.success) {
        const list = notesRes.data || [];
        
        // Cumulative Sums
        let creditSum = 0;
        let debitSum = 0;

        if (isPurchase) {
          // Payments: CREDIT adjustment is PURCHASE_DEBIT_NOTE, DEBIT adjustment is PURCHASE_RETURN
          creditSum = list
            .filter((n: any) => n.invoiceType === 'PURCHASE_DEBIT_NOTE')
            .reduce((sum: number, n: any) => sum + (Number(n.outstandingAmount) || 0), 0);
          debitSum = list
            .filter((n: any) => n.invoiceType === 'PURCHASE_RETURN')
            .reduce((sum: number, n: any) => sum + (Number(n.outstandingAmount) || 0), 0);
        } else {
          // Receipts: CREDIT adjustment is SALE_RETURN, DEBIT adjustment is SALE_DEBIT_NOTE
          creditSum = list
            .filter((n: any) => n.invoiceType === 'SALE_RETURN')
            .reduce((sum: number, n: any) => sum + (Number(n.outstandingAmount) || 0), 0);
          debitSum = list
            .filter((n: any) => n.invoiceType === 'SALE_DEBIT_NOTE')
            .reduce((sum: number, n: any) => sum + (Number(n.outstandingAmount) || 0), 0);
        }

        setTotalCreditNotesVal(creditSum);
        setTotalDebitNotesVal(debitSum);
      }
    };
    loadUnpaidBillsAndNotes();
  }, [companyId, partyId, transactionType, fetchUnpaidPurchases, fetchUnpaidSales, fetchPartyNotes, vouchers]);

  // Fetch running balances for Cash and Bank side-by-side
  useEffect(() => {
    const fetchBalances = async () => {
      if (!companyId) return;
      
      const cashAcc = accountsList.find(a => a.accountName.toLowerCase().includes('cash'));
      if (cashAcc) {
        const res = await getBalance({ companyId, cashBankAccountId: cashAcc.id });
        if (res.success) {
          setCashBalance(Number(res.data) || 0);
        }
      } else {
        setCashBalance(0);
      }

      const bankAcc = accountsList.find(a => a.accountName.toLowerCase().includes('bank'));
      if (bankAcc) {
        const res = await getBalance({ companyId, cashBankAccountId: bankAcc.id });
        if (res.success) {
          setBankBalance(Number(res.data) || 0);
        }
      } else {
        setBankBalance(0);
      }
    };
    fetchBalances();
  }, [companyId, accountsList, getBalance, vouchers]);

  // Handle bill selection auto-fill
  const handleBillChange = (billNo: string) => {
    setReferenceBillNo(billNo);
    const matched = unpaidBills.find(b => b.voucherNumber === billNo);
    if (matched) {
      setAmount(Number(matched.outstandingAmount) || 0);
    } else {
      setAmount(0);
    }
  };

  // Net cash physically flowing out/in
  // Credit Note reduces final cash flow amount, Debit Note increases final cash flow amount
  const activeCreditOffset = applyCreditAdjustment ? creditAdjustmentAmount : 0;
  const activeDebitOffset = applyDebitAdjustment ? debitAdjustmentAmount : 0;
  const netAmountFlow = Math.max(0, amount - activeCreditOffset + activeDebitOffset);

  const isCashType = transactionType === 'CASH_PAYMENT' || transactionType === 'CASH_RECEIPT';
  const runningBalance = isCashType ? cashBalance : bankBalance;

  const isPayment = transactionType === 'CASH_PAYMENT' || transactionType === 'BANK_PAYMENT';
  const expectedBalance = isPayment ? runningBalance - netAmountFlow : runningBalance + netAmountFlow;
  const isNegative = expectedBalance < 0;

  const isCreditOverLimit = applyCreditAdjustment && creditAdjustmentAmount > totalCreditNotesVal;
  const isDebitOverLimit = applyDebitAdjustment && debitAdjustmentAmount > totalDebitNotesVal;
  const isAnyOverLimit = isCreditOverLimit || isDebitOverLimit;

  // Remarks management
  const handleAddRemark = () => {
    setRemarks([...remarks, '']);
  };

  const handleRemoveRemark = (index: number) => {
    const next = remarks.filter((_, i) => i !== index);
    setRemarks(next.length === 0 ? [''] : next);
  };

  const handleRemarkChange = (index: number, val: string) => {
    const next = [...remarks];
    next[index] = val;
    setRemarks(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    if (!assetAccountId) {
      const isCash = transactionType === 'CASH_PAYMENT' || transactionType === 'CASH_RECEIPT';
      showToast(`No matching ${isCash ? 'Cash' : 'Bank'} ledger found. Please create one first in Accounts Master.`, 'error');
      return;
    }
    if (!partyId) {
      showToast('Please select the party account', 'error');
      return;
    }
    if (partyId === assetAccountId) {
      showToast('Party and Asset accounts cannot be the same', 'error');
      return;
    }
    if (netAmountFlow <= 0 && amount <= 0) {
      showToast('Amount must be greater than zero', 'error');
      return;
    }

    if (applyCreditAdjustment && creditAdjustmentAmount > totalCreditNotesVal) {
      showToast(`Credit adjustment amount cannot be greater than total credit note balance (Max: ₹${totalCreditNotesVal})`, 'error');
      return;
    }
    if (applyDebitAdjustment && debitAdjustmentAmount > totalDebitNotesVal) {
      showToast(`Debit adjustment amount cannot be greater than total debit note balance (Max: ₹${totalDebitNotesVal})`, 'error');
      return;
    }

    const payload = {
      financialYearId: activeFinancialYear?.id,
      voucherDate,
      transactionType,
      partyId,
      cashBankAccountId: assetAccountId,
      amount: netAmountFlow,
      isManualBillNumber,
      billNumber: isManualBillNumber ? manualVoucherNo : previewVoucherNo,
      manualVoucherNo: isManualBillNumber ? manualVoucherNo : previewVoucherNo,
      referenceBillNo,
      adjustedNoteAmount: applyCreditAdjustment ? creditAdjustmentAmount : (applyDebitAdjustment ? debitAdjustmentAmount : 0),
      isCreditAdjustment: applyCreditAdjustment,
      narration: JSON.stringify(remarks.filter(r => r.trim() !== '')),
    };

    const res = await createVoucher({ companyId, data: payload });
    if (res.success) {
      showToast('Voucher saved successfully', 'success');
      setAmount(0);
      setManualVoucherNo('');
      setReferenceBillNo('');
      setApplyCreditAdjustment(false);
      setApplyDebitAdjustment(false);
      setCreditAdjustmentAmount(0);
      setDebitAdjustmentAmount(0);
      setRemarks(['']);
      await refreshData();
    } else {
      showToast(res.error || 'Failed to save voucher', 'error');
    }
  };

  const handleDelete = async (id: number, number: string) => {
    if (!companyId || !confirm(`Delete Voucher ${number}? This will reverse double-entry ledger postings and restore outstanding invoice and credit note balances.`)) return;
    const res = await deleteVoucher({ id, companyId });
    if (res.success) {
      showToast('Voucher deleted successfully', 'success');
      await refreshData();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const parseRemarksNarration = (narrationStr: string | null) => {
    try {
      if (!narrationStr) return '—';
      const parsed = JSON.parse(narrationStr);
      if (Array.isArray(parsed)) {
        return parsed.join(', ') || '—';
      }
      return narrationStr || '—';
    } catch {
      return narrationStr || '—';
    }
  };

  const partyOptions = accountsList.map(a => ({ value: String(a.id), label: a.accountName }));
  const billOptions = unpaidBills.map(b => ({
    value: b.voucherNumber,
    label: `${b.billNumber || b.voucherNumber} (Outstanding: ₹${Number(b.outstandingAmount).toLocaleString('en-IN')})`
  }));

  const columns: Column<any>[] = [
    {
      key: 'voucherNumber',
      header: 'VOUCHER NO',
      render: (row) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.voucherNumber}</span>
    },
    {
      key: 'manualVoucherNo',
      header: 'VOUCHER NO (MANUAL)',
      render: (row) => row.manualVoucherNo || '—'
    },
    {
      key: 'voucherDate',
      header: 'DATE',
      render: (row) => new Date(row.voucherDate).toLocaleDateString('en-IN')
    },
    {
      key: 'transactionType',
      header: 'TYPE',
      render: (row) => (
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          background: row.transactionType.includes('RECEIPT') ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
          color: row.transactionType.includes('RECEIPT') ? '#2ecc71' : '#e74c3c'
        }}>
          {row.transactionType.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'party',
      header: 'A/C NAME',
      render: (row) => row.party?.accountName || '—'
    },
    {
      key: 'referenceBillNo',
      header: 'BILL NUMBER',
      render: (row) => row.referenceBillNo || '—'
    },
    {
      key: 'amount',
      header: 'NET CASH',
      render: (row) => `₹ ${Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    },
    {
      key: 'remarks',
      header: 'REMARKS',
      render: (row) => parseRemarksNarration(row.narration)
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

  const hasAnyNotes = totalCreditNotesVal > 0 || totalDebitNotesVal > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header Title with Left Corner Balance Display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
            Cash & Bank Book
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Record payment receipts and cash entries against outstanding bills.
          </p>
        </div>
        
        {/* On-Hand Money Display on the Right Header side */}
        {/* Cash and Bank Balances displayed side-by-side */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* On-Hand Money (Cash) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--color-surface)',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Wallet size={20} color="var(--color-primary)" />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                On-Hand (Cash)
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                ₹ {cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* In Bank Balance */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--color-surface)',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Wallet size={20} color="var(--color-success)" />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                In Bank
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-success)' }}>
                ₹ {bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning banner if no Cash/Bank account exists in the system */}
      {!assetAccountId && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--color-danger)',
          fontSize: '13px',
          fontWeight: 600,
          background: 'rgba(231, 76, 60, 0.08)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(231, 76, 60, 0.2)'
        }}>
          <AlertTriangle size={18} />
          <span>
            Please create an account containing "{transactionType.includes('CASH') ? 'Cash' : 'Bank'}" in its name under Accounts Master to enable ledger postings.
          </span>
        </div>
      )}

      {/* Entry Form Grid */}
      <form onSubmit={handleSave} style={{
        background: 'var(--color-surface)',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        opacity: assetAccountId ? 1 : 0.6,
        pointerEvents: assetAccountId ? 'auto' : 'none'
      }}>
        {/* Transaction Type toggles */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setTransactionType(type);
                setPartyId(null);
                setReferenceBillNo('');
                setAmount(0);
                setApplyCreditAdjustment(false);
                setApplyDebitAdjustment(false);
                setCreditAdjustmentAmount(0);
                setDebitAdjustmentAmount(0);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: transactionType === type ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: transactionType === type ? 'var(--color-primary)' : 'transparent',
                color: transactionType === type ? '#ffffff' : 'var(--color-text)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all 0.2s',
              }}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Bill Number Config Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--color-row-alt)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <input type="checkbox" checked={isManualBillNumber} onChange={(e) => setIsManualBillNumber(e.target.checked)} />
            Enter bill number manually
          </label>
          <div style={{ flex: 1, maxWidth: '300px' }}>
            <Input 
              placeholder={previewVoucherNo || "Auto-Generated sequential number"} 
              disabled={!isManualBillNumber} 
              value={manualVoucherNo}
              onChange={(e) => setManualVoucherNo(e.target.value)}
            />
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          <Input
            label="Date *"
            type="date"
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
          />

          <Select
            label="A/C Name *"
            value={partyId ? String(partyId) : ''}
            onChange={(val) => {
              setPartyId(Number(val) || null);
              setReferenceBillNo('');
              setAmount(0);
              setApplyCreditAdjustment(false);
              setApplyDebitAdjustment(false);
              setCreditAdjustmentAmount(0);
              setDebitAdjustmentAmount(0);
            }}
            options={partyOptions}
            placeholder="Select party account"
          />

          <Select
            label="Bill Number"
            value={referenceBillNo}
            onChange={(val) => handleBillChange(val)}
            options={billOptions}
            placeholder="Select unpaid bill"
          />

          <Input
            label="Gross Settlement Amount *"
            type="number"
            placeholder="0.00"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
          />

          <Input
            label="Voucher Number (Optional)"
            placeholder="Enter manual voucher number"
            value={manualVoucherNo}
            onChange={(e) => setManualVoucherNo(e.target.value)}
          />
        </div>

        {/* Dynamic Credit/Debit Note Adjustments Box (Accumulated) */}
        {partyId && (
          <div style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {hasAnyNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Credit note section */}
                {totalCreditNotesVal > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      onClick={() => {
                        setApplyCreditAdjustment(!applyCreditAdjustment);
                        setApplyDebitAdjustment(false); // Only apply one type at once
                      }}
                    >
                      {applyCreditAdjustment ? (
                        <CheckSquare size={18} color="var(--color-primary)" />
                      ) : (
                        <Square size={18} color="var(--color-text-secondary)" />
                      )}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                        Apply Credit Note Offset? (Available: <span style={{ color: 'var(--color-success)' }}>₹ {totalCreditNotesVal.toLocaleString('en-IN')}</span>)
                      </span>
                    </div>

                    {applyCreditAdjustment && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Input
                          label={`Adjust Credit Amount (Max: ₹${totalCreditNotesVal.toLocaleString('en-IN')})`}
                          type="number"
                          placeholder="0.00"
                          value={creditAdjustmentAmount || ''}
                          onChange={(e) => setCreditAdjustmentAmount(Number(e.target.value))}
                          style={{
                            borderColor: isCreditOverLimit ? 'var(--color-danger)' : undefined
                          }}
                        />
                        {isCreditOverLimit && (
                          <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>
                            ⚠️ Warning: Adjustment amount exceeds available Credit Notes balance (Max: ₹{totalCreditNotesVal.toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Debit note section */}
                {totalDebitNotesVal > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      onClick={() => {
                        setApplyDebitAdjustment(!applyDebitAdjustment);
                        setApplyCreditAdjustment(false); // Only apply one type at once
                      }}
                    >
                      {applyDebitAdjustment ? (
                        <CheckSquare size={18} color="var(--color-primary)" />
                      ) : (
                        <Square size={18} color="var(--color-text-secondary)" />
                      )}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                        Apply Debit Note Addition? (Available: <span style={{ color: 'var(--color-danger)' }}>₹ {totalDebitNotesVal.toLocaleString('en-IN')}</span>)
                      </span>
                    </div>

                    {applyDebitAdjustment && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Input
                          label={`Adjust Debit Amount (Max: ₹${totalDebitNotesVal.toLocaleString('en-IN')})`}
                          type="number"
                          placeholder="0.00"
                          value={debitAdjustmentAmount || ''}
                          onChange={(e) => setDebitAdjustmentAmount(Number(e.target.value))}
                          style={{
                            borderColor: isDebitOverLimit ? 'var(--color-danger)' : undefined
                          }}
                        />
                        {isDebitOverLimit && (
                          <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>
                            ⚠️ Warning: Adjustment amount exceeds available Debit Notes balance (Max: ₹{totalDebitNotesVal.toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Net Summary Calculation */}
                {(applyCreditAdjustment || applyDebitAdjustment) && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginTop: '8px',
                    background: 'var(--color-surface)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)'
                  }}>
                    <span>Gross Settlement Amount:</span>
                    <span>₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    
                    {applyCreditAdjustment && (
                      <>
                        <span>Less Credit Offset:</span>
                        <span style={{ color: 'var(--color-success)' }}>
                          - ₹ {creditAdjustmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </>
                    )}

                    {applyDebitAdjustment && (
                      <>
                        <span>Add Debit Offset:</span>
                        <span style={{ color: 'var(--color-danger)' }}>
                          + ₹ {debitAdjustmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </>
                    )}

                    <span>Net Cash Flow:</span>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                      ₹ {netAmountFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                <AlertTriangle size={16} />
                <span>No outstanding Credit/Debit Notes available for this party.</span>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Remarks Box - Premium Card Design */}
        <div style={{
          background: 'var(--color-surface-hover)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="var(--color-primary)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                Voucher Remarks & Details
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddRemark}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-primary)' }}
            >
              <Plus size={14} /> Add Line
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {remarks.map((remark, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', width: '70px' }}>
                  Remark #{index + 1}
                </span>
                <input
                  type="text"
                  placeholder="Enter custom narration note..."
                  value={remark}
                  onChange={(e) => handleRemarkChange(index, e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'border 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                />
                {remarks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRemark(index)}
                    title="Remove remark line"
                  >
                    <Minus size={14} color="var(--color-danger)" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Projected Negative warning banner ONLY (no large cards) */}
        {isNegative && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-danger)',
            fontSize: '12px',
            background: 'rgba(231, 76, 60, 0.05)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(231, 76, 60, 0.15)'
          }}>
            <AlertTriangle size={16} />
            <span>Warning: Projected running balance (₹ {expectedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) will drop below 0.00. Proceed with caution.</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          {isAnyOverLimit && (
            <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>
              Fix offset limit warning before saving
            </span>
          )}
          <Button variant="primary" type="submit" disabled={isAnyOverLimit}>Save Voucher</Button>
        </div>
      </form>

      {/* Recent Entries Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>Recent Transactions</h3>
        <DataGrid
          columns={columns}
          data={vouchers || []}
          keyField="id"
          loading={loading}
          emptyTitle="No recent transactions found"
          emptyDescription="Create a payment or receipt to post cash/bank entries."
        />
      </div>

      {printData && (
        <PrintTemplate
          type="VOUCHER"
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
