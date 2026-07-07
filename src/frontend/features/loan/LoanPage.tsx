// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Loan Management Page (Professional Edition)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { useCompanyStore } from '../../state/company-store';
import { Button, Input, Select, useToast } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Trash2, Briefcase, FileText, IndianRupee } from 'lucide-react';
import { IAccount } from '../account/account.types';

export const LoanPage: React.FC = () => {
  const { showToast } = useToast();
  const { companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  // IPC Hooks
  const { invoke: fetchAccounts } = useIpc<IAccount[]>('account:list');
  const { data: loans, loading, invoke: refreshLoans } = useIpc<any[]>('loan:list');
  const { invoke: createLoan } = useIpc('loan:create');
  const { invoke: repayLoan } = useIpc('loan:repay');
  const { invoke: deleteLoan } = useIpc('loan:delete');
  const { invoke: getOnHandMoney } = useIpc<number>('loan:onhand');
  const { invoke: generatePdf } = useIpc<{ pdfBase64: string }>('loan:pdf');
  const { invoke: getBalance } = useIpc<number>('cashbank:balance');

  // Page level lists
  const [parties, setParties] = useState<IAccount[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<IAccount[]>([]);
  const [onHandCash, setOnHandCash] = useState<number>(0);
  const [bankMoney, setBankMoney] = useState<number>(0);

  // Form states (Create Loan)
  const [partyId, setPartyId] = useState<string>('');
  const [cashBankAccountId, setCashBankAccountId] = useState<string>('');
  const [loanType, setLoanType] = useState<string>('GIVEN');
  const [principalAmount, setPrincipalAmount] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [interestType, setInterestType] = useState<string>('SIMPLE');
  const [compoundingFrequency, setCompoundingFrequency] = useState<string>('MONTHLY');
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [loanDate, setLoanDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState<string>('');

  // Repayment Modal states
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [repayCashBankAccountId, setRepayCashBankAccountId] = useState<string>('');
  const [repayDate, setRepayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [repayNarration, setRepayNarration] = useState<string>('');

  // Real-time calculation states
  const [previewInterest, setPreviewInterest] = useState<number>(0);
  const [previewRepayable, setPreviewRepayable] = useState<number>(0);

  // Load dependency data
  const loadData = useCallback(async () => {
    if (!companyId) return;
    refreshLoans(companyId);

    const cashRes = await getOnHandMoney(companyId);
    if (cashRes.success) {
      setOnHandCash(cashRes.data || 0);
    }

    // Fetch and sum all Bank Account balances
    const accsRes = await fetchAccounts({ companyId });
    if (accsRes.success) {
      const allAccs = accsRes.data || [];
      const cb = allAccs.filter((a: IAccount) => {
        const groupName = (a as any).accountGroup?.groupName?.toLowerCase() || '';
        return groupName.includes('cash') || groupName.includes('bank');
      });
      setCashBankAccounts(cb);
      setParties(allAccs);

      const bankAccs = cb.filter((a: IAccount) => {
        const groupName = (a as any).accountGroup?.groupName?.toLowerCase() || '';
        const name = a.accountName.toLowerCase();
        return groupName.includes('bank') || name.includes('bank');
      });

      let bankSum = 0;
      for (const bAcc of bankAccs) {
        const res = await getBalance({ companyId, cashBankAccountId: bAcc.id });
        if (res.success) {
          bankSum += Number(res.data) || 0;
        }
      }
      setBankMoney(bankSum);
    }
  }, [companyId, refreshLoans, fetchAccounts, getOnHandMoney, getBalance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time preview calculation
  useEffect(() => {
    const t = durationMonths / 12;
    let interest = 0;

    if (interestType === 'SIMPLE') {
      interest = (principalAmount * interestRate * t) / 100;
    } else {
      let n = 1;
      if (compoundingFrequency === 'MONTHLY') n = 12;
      else if (compoundingFrequency === 'QUARTERLY') n = 4;

      const r = interestRate / 100;
      const amount = principalAmount * Math.pow(1 + r / n, n * t);
      interest = amount - principalAmount;
    }

    interest = Math.round(interest * 100) / 100;
    setPreviewInterest(interest);
    setPreviewRepayable(principalAmount + interest);
  }, [principalAmount, interestRate, interestType, compoundingFrequency, durationMonths]);

  // Select options
  const loanTypeOptions = useMemo(() => [
    { value: 'GIVEN', label: 'Loan Given (Receivable)' },
    { value: 'TAKEN', label: 'Loan Taken (Payable)' },
  ], []);

  const interestTypeOptions = useMemo(() => [
    { value: 'SIMPLE', label: 'Simple Interest' },
    { value: 'COMPOUND', label: 'Compound Interest' },
  ], []);

  const frequencyOptions = useMemo(() => [
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'YEARLY', label: 'Yearly' },
  ], []);

  const partyOptions = useMemo(() =>
    parties.map((p) => ({ value: String(p.id), label: `${p.accountName} (${(p as any).accountGroup?.groupName || ''})` })),
    [parties]
  );

  const cashBankOptions = useMemo(() =>
    cashBankAccounts.map((c) => ({ value: String(c.id), label: c.accountName })),
    [cashBankAccounts]
  );

  // Save Loan
  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      showToast('Error: Company not set', 'error');
      return;
    }

    if (!partyId || !cashBankAccountId || principalAmount <= 0 || interestRate < 0) {
      showToast('Please fill all required fields correctly', 'warning');
      return;
    }

    if (loanType === 'GIVEN' && principalAmount > onHandCash) {
      showToast(`Warning: Principal exceeds available on-hand cash (Available: ₹${onHandCash.toLocaleString('en-IN')})`, 'error');
      return;
    }

    const res = await createLoan({
      companyId,
      financialYearId: activeFinancialYear?.id || 1,
      partyId: Number(partyId),
      cashBankAccountId: Number(cashBankAccountId),
      loanType,
      principalAmount,
      interestRate,
      interestType,
      compoundingFrequency: interestType === 'COMPOUND' ? compoundingFrequency : null,
      durationMonths,
      loanDate,
      narration
    });

    if (res.success) {
      showToast('Loan saved successfully', 'success');
      setPrincipalAmount(0);
      setInterestRate(0);
      setNarration('');
      loadData();
    } else {
      showToast(res.error || 'Failed to save loan', 'error');
    }
  };

  // Record Repayment
  const handleRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || repayAmount <= 0 || !repayCashBankAccountId) {
      showToast('Please enter repayment details', 'warning');
      return;
    }

    const res = await repayLoan({
      companyId,
      loanId: selectedLoan.id,
      amount: repayAmount,
      cashBankAccountId: Number(repayCashBankAccountId),
      paymentDate: repayDate,
      narration: repayNarration
    });

    if (res.success) {
      showToast('Repayment recorded successfully', 'success');
      setSelectedLoan(null);
      setRepayAmount(0);
      setRepayNarration('');
      loadData();
    } else {
      showToast(res.error || 'Failed to record repayment', 'error');
    }
  };

  // Delete Loan
  const handleDeleteLoan = async (id: number) => {
    if (!confirm('Are you sure you want to delete this loan? This will reverse all ledger entries.')) return;
    const res = await deleteLoan({ id, companyId });
    if (res.success) {
      showToast('Loan deleted successfully', 'success');
      loadData();
    } else {
      showToast(res.error || 'Failed to delete loan', 'error');
    }
  };

  // Export Statement PDF
  const handleExportPdf = async () => {
    if (!companyId) return;
    const res = await generatePdf(companyId);
    if (res.success && res.data?.pdfBase64) {
      const linkSource = `data:application/pdf;base64,${res.data.pdfBase64}`;
      const downloadLink = document.createElement("a");
      downloadLink.href = linkSource;
      downloadLink.download = `Loan_Statement_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadLink.click();
      showToast('Statement PDF exported successfully', 'success');
    } else {
      showToast(res.error || 'Failed to export PDF statement', 'error');
    }
  };

  const isOverLimit = loanType === 'GIVEN' && principalAmount > onHandCash;

  // DataGrid columns definition
  const columns: Column<any>[] = useMemo(() => [
    { key: 'voucherNumber', header: 'Voucher No', width: '130px' },
    { key: 'loanType', header: 'Type', width: '90px', render: (row) => (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        background: row.loanType === 'GIVEN' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)',
        color: row.loanType === 'GIVEN' ? 'var(--color-primary)' : 'var(--color-warning)'
      }}>
        {row.loanType}
      </span>
    )},
    { key: 'party.accountName', header: 'Party', width: '160px', render: (row) => row.party?.accountName || '—' },
    { key: 'principalAmount', header: 'Principal', width: '120px', align: 'right', render: (row) => `₹${Number(row.principalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { key: 'interestRate', header: 'Rate', width: '70px', align: 'right', render: (row) => `${row.interestRate}%` },
    { key: 'totalInterest', header: 'Interest', width: '110px', align: 'right', render: (row) => `₹${Number(row.totalInterest).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { key: 'balanceRemaining', header: 'Balance', width: '120px', align: 'right', render: (row) => `₹${Number(row.balanceRemaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { key: 'status', header: 'Status', width: '90px', render: (row) => (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        background: row.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : row.status === 'PARTIAL' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(107, 114, 128, 0.1)',
        color: row.status === 'ACTIVE' ? 'var(--color-success)' : row.status === 'PARTIAL' ? 'var(--color-warning)' : 'var(--color-text-secondary)'
      }}>
        {row.status}
      </span>
    )},
    { key: 'actions', header: 'Actions', width: '120px', render: (row) => (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {row.status !== 'CLOSED' && (
          <Button size="sm" variant="secondary" onClick={() => {
            setSelectedLoan(row);
            setRepayCashBankAccountId(String(row.cashBankAccountId));
          }}>
            Repay
          </Button>
        )}
        <button
          onClick={() => handleDeleteLoan(row.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-danger)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    )},
  ], []);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'var(--color-surface-hover)',
            padding: '10px',
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Briefcase size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Loan Book</h1>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Manage and track Given & Taken loans with automated Simple and Compound interest calculations
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            padding: '6px 14px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <IndianRupee size={15} style={{ color: 'var(--color-success)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>On-Hand Cash:</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success)' }}>
              ₹ {onHandCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            padding: '6px 14px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <IndianRupee size={15} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Bank Money:</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
              ₹ {bankMoney.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <Button variant="secondary" onClick={handleExportPdf} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} /> Export Statement
          </Button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 380px) 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Creation Form Panel */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Create Loan Entry</h2>
          
          <form onSubmit={handleSaveLoan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Select
              label="Loan Direction *"
              options={loanTypeOptions}
              value={loanType}
              onChange={(val) => setLoanType(val)}
              required
            />

            <Select
              label="Select Party Account *"
              options={partyOptions}
              value={partyId}
              onChange={(val) => setPartyId(val)}
              placeholder="Select account"
              required
            />

            <Select
              label="Cash / Bank Account *"
              options={cashBankOptions}
              value={cashBankAccountId}
              onChange={(val) => setCashBankAccountId(val)}
              placeholder="Select asset account"
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                type="number"
                label="Principal Amount *"
                value={principalAmount || ''}
                onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                required
                error={isOverLimit ? 'Principal exceeds available cash' : undefined}
              />
              <Input
                type="number"
                step="0.01"
                label="Rate (Annual %)"
                value={interestRate ?? 0}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                required
              />
            </div>

            {isOverLimit && (
              <p style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: 600, margin: 0 }}>
                ⚠️ Principal exceeds available Cash on Hand!
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Select
                label="Interest Type *"
                options={interestTypeOptions}
                value={interestType}
                onChange={(val) => setInterestType(val)}
                required
              />
              <Input
                type="number"
                label="Duration (Months) *"
                value={durationMonths || ''}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                required
              />
            </div>

            {interestType === 'COMPOUND' && (
              <Select
                label="Compounding Frequency *"
                options={frequencyOptions}
                value={compoundingFrequency}
                onChange={(val) => setCompoundingFrequency(val)}
                required
              />
            )}

            <Input
              type="date"
              label="Loan Date *"
              value={loanDate}
              onChange={(e) => setLoanDate(e.target.value)}
              required
            />

            <Input
              type="text"
              label="Narration / Remarks"
              placeholder="Enter remarks"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />

            {/* Calculations Preview Panel */}
            <div style={{
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Preview Calculation
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text)' }}>
                <span>Principal:</span>
                <span style={{ fontWeight: 600 }}>₹ {principalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text)' }}>
                <span>Interest:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>₹ {previewInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0', padding: '4px 0 0 0', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: 'var(--color-success)' }}>
                <span>Repayable:</span>
                <span>₹ {previewRepayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <Button type="submit" disabled={isOverLimit} style={{ width: '100%' }}>
              Save Loan Voucher
            </Button>
          </form>
        </div>

        {/* Listing Grid Panel */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Loans Ledger</h2>
          <DataGrid
            columns={columns}
            data={loans || []}
            keyField="id"
            loading={loading}
            emptyTitle="No Loan Entries"
            emptyDescription="Create a given or taken loan entry to start tracking ledger balances."
          />
        </div>
      </div>

      {/* Repayments Modal */}
      {selectedLoan && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-modal)'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '24px',
            width: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Record Repayment</h3>
              <button
                onClick={() => setSelectedLoan(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>

            {/* Dynamic calculations for pro-rata interest preview inside Repayment popup */}
            {(() => {
              const startDate = new Date(selectedLoan.loanDate);
              const endDate = new Date(repayDate);
              const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const elapsedMonths = Math.max(0.1, (diffDays / 365) * 12);

              const principal = Number(selectedLoan.principalAmount);
              const rate = Number(selectedLoan.interestRate);
              const type = selectedLoan.interestType;
              const freq = selectedLoan.compoundingFrequency;
              
              const t = elapsedMonths / 12;
              let computedInterest = 0;
              if (type === 'SIMPLE') {
                computedInterest = (principal * rate * t) / 100;
              } else {
                let n = 1;
                if (freq === 'MONTHLY') n = 12;
                else if (freq === 'QUARTERLY') n = 4;
                
                const r = rate / 100;
                const amount = principal * Math.pow(1 + r / n, n * t);
                computedInterest = amount - principal;
              }
              
              computedInterest = Math.round(computedInterest * 100) / 100;
              const adjustedRepayable = principal + computedInterest;
              const adjustedRemaining = Math.max(0, adjustedRepayable - Number(selectedLoan.amountRepaid));

              const selectedAcc = cashBankAccounts.find(a => String(a.id) === repayCashBankAccountId);
              const isBankMode = selectedAcc ? (selectedAcc.accountName.toLowerCase().includes('bank') || (selectedAcc as any).accountGroup?.groupName?.toLowerCase().includes('bank')) : false;

              return (
                <>
                  <div style={{
                    background: 'var(--color-surface-hover)',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px'
                  }}>
                    <div><strong>Voucher:</strong> {selectedLoan.voucherNumber}</div>
                    <div><strong>Party:</strong> {selectedLoan.party?.accountName}</div>
                    <div><strong>Interest Rate:</strong> {selectedLoan.interestRate}% ({selectedLoan.interestType})</div>
                    <div><strong>Duration Elapsed:</strong> {diffDays} Days ({elapsedMonths.toFixed(1)} Months)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                      <span>Pro-Rata Repayable:</span>
                      <strong>₹ {adjustedRepayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                      <span>Remaining Balance:</span>
                      <strong>₹ {adjustedRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  <form onSubmit={handleRepayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Select
                      label="Payment Method (Cash / Bank Account) *"
                      options={cashBankOptions}
                      value={repayCashBankAccountId}
                      onChange={(val) => setRepayCashBankAccountId(val)}
                      placeholder="Select Cash or Bank account"
                      required
                    />

                    {selectedAcc && (
                      <div style={{ fontSize: '11px', fontWeight: 600, color: isBankMode ? 'var(--color-primary)' : 'var(--color-success)', marginTop: '-8px' }}>
                        ℹ️ Transaction will post to Cash & Bank Book as a {isBankMode ? 'BANK' : 'CASH'} Repayment Entry.
                      </div>
                    )}

                    <Input
                      type="date"
                      label="Repayment Date *"
                      value={repayDate}
                      onChange={(e) => setRepayDate(e.target.value)}
                      required
                    />

                    <Input
                      type="number"
                      label="Repayment Amount *"
                      value={repayAmount || ''}
                      onChange={(e) => setRepayAmount(Number(e.target.value))}
                      required
                    />

                    <Input
                      type="text"
                      label="Remarks"
                      placeholder="Narration notes"
                      value={repayNarration}
                      onChange={(e) => setRepayNarration(e.target.value)}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                      <Button type="submit">
                        Record Payment
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setSelectedLoan(null)}>
                        Close
                      </Button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
