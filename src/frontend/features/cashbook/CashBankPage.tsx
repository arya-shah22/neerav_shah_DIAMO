// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Cash & Bank Vouchers Page (Phase 9)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, AlertTriangle, Plus, Minus, Wallet, Landmark, FileText, CheckSquare, Square, Printer } from 'lucide-react';
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

  // Multi-Currency States
  const [transactionCurrency, setTransactionCurrency] = useState<'INR' | 'USD'>('INR');
  const [exchangeRate, setExchangeRate] = useState<number>(90.00);

  const { invoke: getAllConfigs } = useIpc<any>('stock:get-all-configs');
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  useEffect(() => {
    if (!companyId || !activeFinancialYear?.id) return;
    getAllConfigs({ companyId, financialYearId: activeFinancialYear.id }).then((res) => {
      if (res.success && Array.isArray(res.data)) {
        const config = res.data.find((c: any) => c.voucherType === transactionType);
        if (config?.includeMonth) {
          setShowMonthFilter(true);
        } else {
          setShowMonthFilter(false);
        }
      }
    });
  }, [companyId, activeFinancialYear?.id, transactionType, getAllConfigs]);

  const filteredVouchers = React.useMemo(() => {
    if (!vouchers) return [];
    return vouchers.filter((v) => {
      if (showMonthFilter && selectedMonth !== 'ALL') {
        const dateObj = new Date(v.voucherDate);
        if (!isNaN(dateObj.getTime())) {
          if (String(dateObj.getMonth()) !== selectedMonth) return false;
        }
      }
      return true;
    });
  }, [vouchers, showMonthFilter, selectedMonth]);

  // Dropdown lists
  const [accountsList, setAccountsList] = useState<IAccount[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [cashUsdBalance, setCashUsdBalance] = useState<number>(0);
  const [bankBalance, setBankBalance] = useState<number>(0);
  const [bankUsdBalance, setBankUsdBalance] = useState<number>(0);

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

  // Handoff default Cash vs Bank account selection based on Currency
  const getAssetAccountId = useCallback((): number | null => {
    const isCash = transactionType === 'CASH_PAYMENT' || transactionType === 'CASH_RECEIPT';
    if (isCash) {
      if (transactionCurrency === 'USD') {
        const usdMatch = accountsList.find(a => a.accountName.toLowerCase().includes('cash') && a.accountName.toLowerCase().includes('usd'));
        if (usdMatch) return usdMatch.id;
      }
      const inrMatch = accountsList.find(a => a.accountName.toLowerCase().includes('cash') && !a.accountName.toLowerCase().includes('usd'));
      if (inrMatch) return inrMatch.id;
      const anyCash = accountsList.find(a => a.accountName.toLowerCase().includes('cash'));
      return anyCash ? anyCash.id : null;
    } else {
      if (transactionCurrency === 'USD') {
        const usdBankMatch = accountsList.find(a => a.accountName.toLowerCase().includes('bank') && a.accountName.toLowerCase().includes('usd'));
        if (usdBankMatch) return usdBankMatch.id;
      }
      const inrBankMatch = accountsList.find(a => a.accountName.toLowerCase().includes('bank') && !a.accountName.toLowerCase().includes('usd'));
      if (inrBankMatch) return inrBankMatch.id;
      const anyBank = accountsList.find(a => a.accountName.toLowerCase().includes('bank'));
      return anyBank ? anyBank.id : null;
    }
  }, [transactionType, transactionCurrency, accountsList]);

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

  // Fetch running balances for Cash (INR), Cash (USD), Bank (INR), and Bank (USD)
  useEffect(() => {
    const fetchBalances = async () => {
      if (!companyId) return;
      
      let cashInrSum = 0;
      let cashUsdSum = 0;
      const cashAccs = accountsList.filter(a => {
        const groupName = (a as any).accountGroup?.groupName?.toLowerCase() || '';
        const name = a.accountName.toLowerCase();
        return groupName.includes('cash') || name.includes('cash');
      });

      for (const cAcc of cashAccs) {
        const res = await getBalance({ companyId, cashBankAccountId: cAcc.id });
        if (res.success) {
          const isUsd = cAcc.accountName.toLowerCase().includes('usd');
          if (isUsd) cashUsdSum += Number(res.data) || 0;
          else cashInrSum += Number(res.data) || 0;
        }
      }
      setCashBalance(cashInrSum);
      setCashUsdBalance(cashUsdSum);

      let bankInrSum = 0;
      let bankUsdSum = 0;
      const bankAccs = accountsList.filter(a => {
        const groupName = (a as any).accountGroup?.groupName?.toLowerCase() || '';
        const name = a.accountName.toLowerCase();
        return groupName.includes('bank') || name.includes('bank') || name.includes('hdfc') || name.includes('icici') || name.includes('sbi') || name.includes('axis') || name.includes('kotak');
      });

      for (const bAcc of bankAccs) {
        const res = await getBalance({ companyId, cashBankAccountId: bAcc.id });
        if (res.success) {
          const isUsd = bAcc.accountName.toLowerCase().includes('usd');
          if (isUsd) bankUsdSum += Number(res.data) || 0;
          else bankInrSum += Number(res.data) || 0;
        }
      }
      setBankBalance(bankInrSum);
      setBankUsdBalance(bankUsdSum);
    };
    fetchBalances();
  }, [companyId, accountsList, getBalance, vouchers]);

  // Handle bill selection auto-fill
  const handleBillChange = (billNo: string) => {
    setReferenceBillNo(billNo);
    const matched = unpaidBills.find(b => b.voucherNumber === billNo);
    if (matched) {
      const isUsd = matched.transactionCurrency === 'USD';
      setTransactionCurrency(isUsd ? 'USD' : 'INR');
      if (matched.exchangeRate) {
        setExchangeRate(Number(matched.exchangeRate));
      } else if (isUsd) {
        setExchangeRate(90.00);
      }
      setAmount(Number(matched.outstandingAmount) || 0);
    } else {
      setAmount(0);
    }
  };

  // Handle currency toggle conversion (USD <-> INR)
  const handleCurrencyChange = (newCurrency: 'INR' | 'USD') => {
    if (newCurrency === transactionCurrency) return;

    const rate = exchangeRate > 0 ? exchangeRate : 90;
    if (newCurrency === 'INR' && transactionCurrency === 'USD') {
      // Convert USD ($12,000) -> INR (₹1,080,000)
      if (amount > 0) {
        setAmount(Number((amount * rate).toFixed(2)));
      }
    } else if (newCurrency === 'USD' && transactionCurrency === 'INR') {
      // Convert INR (₹1,080,000) -> USD ($12,000)
      if (amount > 0) {
        setAmount(Number((amount / rate).toFixed(2)));
      }
    }

    setTransactionCurrency(newCurrency);
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

    const finalAmountAlt = transactionCurrency === 'USD' 
      ? Number((netAmountFlow * exchangeRate).toFixed(2))
      : netAmountFlow;

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
      transactionCurrency,
      exchangeRate,
      amountAlt: finalAmountAlt,
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
  const billOptions = unpaidBills.map(b => {
    const isUsd = b.transactionCurrency === 'USD';
    const amt = Number(b.outstandingAmount);
    const exRate = Number(b.exchangeRate) || 90;
    const alt = b.outstandingAmountAlt ? Number(b.outstandingAmountAlt) : Math.round(amt * exRate);
    const label = isUsd
      ? `${b.billNumber || b.voucherNumber} (Outstanding: $${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} / ₹${alt.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
      : `${b.billNumber || b.voucherNumber} (Outstanding: ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`;
    return { value: b.voucherNumber, label };
  });

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
      header: 'NET CASH / AMOUNT',
      render: (row) => {
        const isUsd = row.transactionCurrency === 'USD';
        const amt = Number(row.amount);
        const alt = row.amountAlt ? Number(row.amountAlt) : Math.round(amt * (Number(row.exchangeRate) || 90));
        if (isUsd) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                $ {amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                (₹ {alt.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </span>
            </div>
          );
        }
        return `₹ ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Title Section */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
          Cash & Bank Book
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Record payment receipts and cash entries against outstanding bills.
        </p>
      </div>

      {/* 4 Financial Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px',
        width: '100%'
      }}>
        {/* Card 1: Cash INR */}
        <div style={{
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Wallet size={22} color="#3b82f6" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              On-Hand (Cash - INR)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', marginTop: '2px', lineHeight: 1.2 }}>
              ₹ {cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Card 2: Cash USD */}
        <div style={{
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Wallet size={22} color="#10b981" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              On-Hand (Cash - USD)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '2px', lineHeight: 1.2 }}>
              $ {cashUsdBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              (₹ {(cashUsdBalance * exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
            </div>
          </div>
        </div>

        {/* Card 3: Bank INR */}
        <div style={{
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(139, 92, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Landmark size={22} color="#8b5cf6" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              In Bank (INR)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6', marginTop: '2px', lineHeight: 1.2 }}>
              ₹ {bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Card 4: Bank USD */}
        <div style={{
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(6, 182, 212, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Landmark size={22} color="#06b6d4" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              In Bank (USD)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#06b6d4', marginTop: '2px', lineHeight: 1.2 }}>
              $ {bankUsdBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              (₹ {(bankUsdBalance * exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
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
            shortcutType="account"
          />

          <Select
            label="Bill Number"
            value={referenceBillNo}
            onChange={(val) => handleBillChange(val)}
            options={billOptions}
            placeholder="Select unpaid bill"
          />

          <Select
            label="Currency"
            value={transactionCurrency}
            onChange={(val) => handleCurrencyChange(val as 'INR' | 'USD')}
            options={[
              { value: 'INR', label: 'INR (₹)' },
              { value: 'USD', label: 'USD ($)' },
            ]}
          />

          {transactionCurrency === 'USD' && (
            <Input
              label="Exchange Rate ($1 = ₹) *"
              type="number"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Input
              label={`Gross Settlement Amount (${transactionCurrency === 'USD' ? '$' : '₹'}) *`}
              type="number"
              placeholder="0.00"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            {transactionCurrency === 'USD' && amount > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '4px', fontWeight: 600 }}>
                Equivalent: ₹{(amount * exchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (@ ₹{exchangeRate}/$)
              </span>
            )}
          </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>Recent Transactions</h3>
          {showMonthFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Filter by Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Months</option>
                <option value="0">Jan</option>
                <option value="1">Feb</option>
                <option value="2">Mar</option>
                <option value="3">Apr</option>
                <option value="4">May</option>
                <option value="5">Jun</option>
                <option value="6">Jul</option>
                <option value="7">Aug</option>
                <option value="8">Sep</option>
                <option value="9">Oct</option>
                <option value="10">Nov</option>
                <option value="11">Dec</option>
              </select>
            </div>
          )}
        </div>
        <DataGrid
          columns={columns}
          data={filteredVouchers}
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
