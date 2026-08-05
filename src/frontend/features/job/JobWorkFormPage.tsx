import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { useCompanyStore } from '../../state/company-store';
import { Button, Input, Select, useToast } from '../../components/ui';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { invokeIpc } from '../../../shared/utils/ipc';

export const JobWorkFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<Array<{ value: string; label: string }>>([]);
  const [contractors, setContractors] = useState<Array<{ value: string; label: string }>>([]);

  // Form State
  const [customerId, setCustomerId] = useState<string>('');
  const [subcontractorId, setSubcontractorId] = useState<string>('');
  const [autoPacketId, setAutoPacketId] = useState<string>('JW-2627-000001');
  const [isManualId, setIsManualId] = useState<boolean>(false);
  const [manualPacketId, setManualPacketId] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('DIAMOND_CONVERSION');
  const [inwardRoughCarats, setInwardRoughCarats] = useState<number>(10);
  const [inwardPieceCount, setInwardPieceCount] = useState<number>(1);
  const [clientBilledRate, setClientBilledRate] = useState<number>(100);
  const [contractorExpenseRate, setContractorExpenseRate] = useState<number>(50);
  const [gstRate, setGstRate] = useState<number>(0);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [exchangeRate, setExchangeRate] = useState<number>(83.50);

  // Fetch party dropdowns and auto continuous preview ID
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        if (companyId) {
          const res = await invokeIpc<any[]>('account:list', { companyId });
          if (isMounted && res?.success && Array.isArray(res.data)) {
            const list = res.data.map((a: any) => ({
              value: String(a.id),
              label: `${a.accountName} (${a.accountGroup?.groupName || 'Account'})`,
            }));
            setParties(list);
            setContractors(list);
          }
        }

        // Preview next continuous packet/voucher ID using configured System Settings rule
        const previewRes = await invokeIpc<string>('job:preview-number', {
          companyId: companyId || 1,
          financialYearId: activeFinancialYear?.id,
          type: 'JOB_INCOME',
        });
        if (isMounted && previewRes?.success && previewRes.data) {
          setAutoPacketId(previewRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch initial data for jobwork:', err);
      }
    };
    fetchInitialData();

    // Listen for Ctrl+A master quick creation success
    const handleShortcutSuccess = async () => {
      if (companyId) {
        const res = await invokeIpc<any[]>('account:list', { companyId });
        if (isMounted && res?.success && Array.isArray(res.data)) {
          const list = res.data.map((a: any) => ({
            value: String(a.id),
            label: `${a.accountName} (${a.accountGroup?.groupName || 'Account'})`,
          }));
          setParties(list);
          setContractors(list);
        }
      }
    };

    window.addEventListener('shortcut-master-success', handleShortcutSuccess);

    return () => {
      isMounted = false;
      window.removeEventListener('shortcut-master-success', handleShortcutSuccess);
    };
  }, [companyId, activeFinancialYear?.id]);

  // Derived effective Packet ID
  const effectivePacketId = isManualId ? manualPacketId : autoPacketId;

  // Derived financial previews
  const clientTotal = (inwardRoughCarats || 0) * (clientBilledRate || 0);
  const contractorTotal = (inwardRoughCarats || 0) * (contractorExpenseRate || 0);
  const netCommission = clientTotal - contractorTotal;
  const marginPct = clientTotal > 0 ? (netCommission / clientTotal) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      showToast('Please select a Customer / Party', 'error');
      return;
    }
    if (!companyId) {
      showToast('Active company context required', 'error');
      return;
    }
    setLoading(true);
    try {
      showToast('Issuing Job Work Ticket (Stage 1)...', 'info');

      // Call backend via Electron IPC to save to MySQL
      const res = await invokeIpc<any>('job:create-unified', {
        companyId,
        data: {
          partyId: Number(customerId),
          subcontractorPartyId: Number(subcontractorId),
          stockPacketId: effectivePacketId || undefined,
          serviceType,
          inwardRoughCarats: Number(inwardRoughCarats),
          inwardPieceCount: Number(inwardPieceCount),
          clientBilledRate: Number(clientBilledRate),
          contractorExpenseRate: Number(contractorExpenseRate),
          gstRate: Number(gstRate),
          transactionCurrency: currency,
          exchangeRate: Number(exchangeRate),
          voucherDate: new Date().toISOString(),
        },
      });

      if (res?.success) {
        showToast('✅ Job Work Ticket Issued & Saved in Database!', 'success');
        navigate('/transactions/jobs/billing');
      } else {
        showToast(`Failed: ${res?.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      showToast('Failed to issue job work ticket', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Button variant="ghost" onClick={() => navigate('/transactions/jobs/billing')} style={{ padding: '8px' }}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            Issue New Job Work Ticket (Stage 1)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
            Record client inward rough diamond receipt, specify processing contractor, and lock in agreed billing rates.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* ── Section 1: Party Details ── */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: '#0284c7', letterSpacing: '0.5px' }}>
            1. Party & Processor Information
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <Select
                label="Customer / Client Account (Billed Party)"
                options={parties}
                value={customerId}
                onChange={(val) => setCustomerId(val)}
                placeholder="Search party account..."
                searchable
                required
                shortcutType="account"
                shortcutGroup="Sundry Debtors"
              />
            </div>

            <div>
              <Select
                label="Factory / Subcontractor Unit (Processing Vendor)"
                options={contractors}
                value={subcontractorId}
                onChange={(val) => setSubcontractorId(val)}
                placeholder="Search vendor account..."
                searchable
                required
                shortcutType="account"
                shortcutGroup="Sundry Creditors"
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Inward Rough Details ── */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: '#0284c7', letterSpacing: '0.5px' }}>
            2. Inward Rough & Service Details
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '16px', alignItems: 'flex-start' }}>
            
            {/* Smart Packet ID Field with Manual Tick Option */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Stock / Packet ID *
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: isManualId ? '#2563eb' : 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isManualId}
                    onChange={(e) => setIsManualId(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Manual Edit
                </label>
              </div>

              {isManualId ? (
                <Input
                  type="text"
                  placeholder="Enter Custom Lot / Packet ID..."
                  value={manualPacketId}
                  onChange={(e) => setManualPacketId(e.target.value)}
                  required
                />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '32px',
                  padding: '0 10px',
                  background: 'var(--color-disabled-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: '#0284c7',
                }}>
                  <span>{autoPacketId}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    AUTO
                  </span>
                </div>
              )}
            </div>

            <div>
              <Select
                label="Service Type"
                options={[
                  { value: 'MAKEABLE_TO_POLISH', label: 'Makeable to Polish' },
                  { value: 'ROUGH_TO_4P', label: 'Rough to 4P' },
                  { value: 'ROUGH_TO_POLISH', label: 'Rough to Polish' },
                  { value: 'DIAMOND_CONVERSION', label: 'Diamond Conversion (1 Rough → N Diamonds)' },
                ]}
                value={serviceType}
                onChange={(val) => setServiceType(val)}
                required
                clearable={false}
              />
            </div>

            <Input
              label="Inward Carats *"
              type="number"
              step="0.001"
              value={inwardRoughCarats}
              onChange={(e) => setInwardRoughCarats(Number(e.target.value) || 0)}
            />

            <Input
              label="Inward Pieces *"
              type="number"
              value={inwardPieceCount}
              onChange={(e) => setInwardPieceCount(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        {/* ── Section 3: Financial Commission Rates & Currency ── */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: '#0284c7', letterSpacing: '0.5px' }}>
            3. Agreed Rates, Currency & Net Commission Preview
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: currency === 'USD' ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <Select
                label="Billing Currency"
                options={[
                  { value: 'INR', label: 'INR (₹ - Indian Rupee)' },
                  { value: 'USD', label: 'USD ($ - US Dollar)' },
                ]}
                value={currency}
                onChange={(val) => setCurrency(val as 'INR' | 'USD')}
                required
                clearable={false}
              />
            </div>

            {currency === 'USD' && (
              <Input
                label="Exchange Rate (₹/$1) *"
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value) || 83.50)}
              />
            )}

            <Input
              label={`Client Billed Rate (${currency === 'USD' ? '$/ct' : '₹/ct'}) *`}
              type="number"
              step="0.01"
              value={clientBilledRate}
              onChange={(e) => setClientBilledRate(Number(e.target.value) || 0)}
            />

            <Input
              label={`Contractor Expense Rate (${currency === 'USD' ? '$/ct' : '₹/ct'}) *`}
              type="number"
              step="0.01"
              value={contractorExpenseRate}
              onChange={(e) => setContractorExpenseRate(Number(e.target.value) || 0)}
            />

            <div>
              <Select
                label="GST Applicable (%)"
                options={[
                  { value: '0', label: '0% (Exempt Jobwork Service)' },
                  { value: '1.5', label: '1.5% (Special GST Rate)' },
                  { value: '5', label: '5% (GST Job Work Standard)' },
                  { value: '12', label: '12% (12% GST Category)' },
                  { value: '18', label: '18% (18% Standard Service)' },
                ]}
                value={String(gstRate)}
                onChange={(val) => {
                  const parsed = parseFloat(val);
                  setGstRate(isNaN(parsed) ? 0 : parsed);
                }}
                searchable
                creatable
                clearable={false}
                placeholder="Select or type custom GST %"
              />
            </div>
          </div>

          {/* Live Financial Margin Box */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px 18px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                Gross Billed to Client: <strong>{currency === 'USD' ? '$' : '₹'}{clientTotal.toLocaleString('en-IN')}</strong> {currency === 'USD' && `(₹${(clientTotal * exchangeRate).toLocaleString('en-IN')})`} {gstRate > 0 && `(+ GST @ ${gstRate}%)`}
              </div>
              <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                Gross Contractor Expense: <strong>{currency === 'USD' ? '$' : '₹'}{contractorTotal.toLocaleString('en-IN')}</strong> {currency === 'USD' && `(₹${(contractorTotal * exchangeRate).toLocaleString('en-IN')})`}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>Net Margin Retained</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>
                {currency === 'USD' ? '$' : '₹'}{netCommission.toLocaleString('en-IN')} <span style={{ fontSize: '12px', fontWeight: 600 }}>({marginPct.toFixed(0)}% Profit)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="ghost" onClick={() => navigate('/transactions/jobs/billing')}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            <CheckCircle2 size={16} style={{ marginRight: '6px' }} /> Issue Job Work Ticket
          </Button>
        </div>

      </form>
    </div>
  );
};
