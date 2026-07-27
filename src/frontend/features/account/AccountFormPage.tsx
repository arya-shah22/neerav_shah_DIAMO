// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Form Page
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft } from 'lucide-react';
import { accountSchema, AccountFormData } from './account.schema';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, FormSelect, useToast } from '../../components/ui';
import type { IAccountGroup } from '../account-group/account-group.types';
import type { IAccount } from './account.types';

const LIST_ROUTE = '/masters/accounting/accounts';

interface StateCodeObj {
  stateCode: string;
  stateName: string;
}

interface CompanyObj {
  id: number;
  companyName: string;
}

export interface AccountFormProps {
  modalId?: number;
  isModalMode?: boolean;
  initialSearchName?: string;
  onSuccessCallback?: (id: number, name: string) => void;
  onCancelCallback?: () => void;
  modalGroupFilter?: string | null;
}

export const AccountFormPage: React.FC<AccountFormProps> = ({
  modalId,
  isModalMode = false,
  initialSearchName = '',
  onSuccessCallback,
  onCancelCallback,
  modalGroupFilter,
}) => {
  const { id: routeId } = useParams<{ id: string }>();
  const activeId = modalId ?? (routeId ? Number(routeId) : undefined);
  const isEdit = !!activeId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();

  const [groups, setGroups] = useState<IAccountGroup[]>([]);
  const [statesList, setStatesList] = useState<StateCodeObj[]>([]);
  const [brokers, setBrokers] = useState<IAccount[]>([]);
  const [companies, setCompanies] = useState<CompanyObj[]>([]);
  const [addAllFirms, setAddAllFirms] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  
  // Buy/Sell both flag
  const [canBuySellBoth, setCanBuySellBoth] = useState(true);

  const { invoke: fetchAccount } = useIpc<IAccount>('account:get');
  const { invoke: createAccount, loading: creating } = useIpc<IAccount>('account:create');
  const { invoke: updateAccount, loading: updating } = useIpc<IAccount>('account:update');
  const { invoke: fetchGroups } = useIpc<IAccountGroup[]>('account-group:list');
  const { invoke: fetchStates } = useIpc<StateCodeObj[]>('company:states');
  const { invoke: fetchBrokers } = useIpc<IAccount[]>('account:list');
  const { invoke: fetchCompanies } = useIpc<CompanyObj[]>('company:list');

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountGroupId: undefined,
      accountName: initialSearchName,
      printName: initialSearchName,
      status: 'ACTIVE',
      gstinNumber: '',
      panNumber: '',
      gstRegType: null,
      gstPct: null,
      brokerId: null,
      udyamMsme: '',
      tdsPct: null,
      tcsPct: null,
      creditDays: 0,
      creditLimit: 0,
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateCode: '',
      pincode: '',
      country: 'India',
      mobile: '',
      phone: '',
      email: '',
      bankAccountNumber: '',
      bankName: '',
      bankBranch: '',
      bankIfsc: '',
      openingBalanceAmount: 0,
      openingBalanceType: null,
      addAllFirms: true,
      targetCompanyIds: [],
    },
  });

  const watchedGroupId = watch('accountGroupId');
  const selectedGroup = groups.find(g => g.id === Number(watchedGroupId));
  const isDebtorOrCreditor = selectedGroup && (
    selectedGroup.groupName.toLowerCase().includes('debtor') || 
    selectedGroup.groupName.toLowerCase().includes('creditor') ||
    selectedGroup.groupName.toLowerCase().includes('customer') ||
    selectedGroup.groupName.toLowerCase().includes('supplier')
  );

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      const [groupsRes, statesRes, brokersRes, companiesRes] = await Promise.all([
        fetchGroups(companyId),
        fetchStates(),
        fetchBrokers({ companyId, isBroker: true }),
        fetchCompanies(),
      ]);

      if (groupsRes.success && groupsRes.data) {
        setGroups(groupsRes.data);
        if (!isEdit && modalGroupFilter) {
          const matchedGroup = groupsRes.data.find(
            g => g.groupName.toLowerCase().includes(modalGroupFilter.toLowerCase())
          );
          if (matchedGroup) {
            setValue('accountGroupId', matchedGroup.id);
          }
        }
      }
      if (statesRes.success && statesRes.data) setStatesList(statesRes.data);
      if (brokersRes.success && brokersRes.data) setBrokers(brokersRes.data);
      if (companiesRes.success && companiesRes.data) setCompanies(companiesRes.data);

      if (isEdit && activeId) {
        const res = await fetchAccount({ id: Number(activeId), companyId });
        if (res.success && res.data) {
          const a = res.data;
          reset({
            accountGroupId: a.accountGroupId,
            accountName: a.accountName,
            printName: a.printName || '',
            status: a.status,
            gstinNumber: a.gstinNumber || '',
            panNumber: a.panNumber || '',
            gstRegType: a.gstRegType,
            gstPct: a.gstPct != null ? Number(a.gstPct) : null,
            brokerId: a.brokerId,
            udyamMsme: a.udyamMsme || '',
            tdsPct: a.tdsPct != null ? Number(a.tdsPct) : null,
            tcsPct: a.tcsPct != null ? Number(a.tcsPct) : null,
            creditDays: a.creditDays,
            creditLimit: Number(a.creditLimit),
            addressLine1: a.addressLine1 || '',
            addressLine2: a.addressLine2 || '',
            city: a.city || '',
            stateCode: a.stateCode || '',
            pincode: a.pincode || '',
            country: a.country || 'India',
            mobile: a.mobile || '',
            phone: a.phone || '',
            email: a.email || '',
            bankAccountNumber: a.bankAccountNumber || '',
            bankName: a.bankName || '',
            bankBranch: a.bankBranch || '',
            bankIfsc: a.bankIfsc || '',
            openingBalanceAmount: Number(a.openingBalanceAmount),
            openingBalanceType: a.openingBalanceType,
            addAllFirms: false,
            targetCompanyIds: [],
          });
        }
      }
    };
    load();
  }, [companyId, activeId, isEdit, fetchAccount, fetchGroups, fetchStates, fetchBrokers, fetchCompanies, reset, setValue, modalGroupFilter]);

  useEffect(() => {
    if (!companyId) return;
    const handleShortcutSuccess = async () => {
      const res = await fetchGroups(companyId);
      if (res.success && res.data) {
        setGroups(res.data);
      }
    };
    window.addEventListener('shortcut-master-success', handleShortcutSuccess);
    return () => window.removeEventListener('shortcut-master-success', handleShortcutSuccess);
  }, [companyId, fetchGroups]);

  const toggleCompanySelection = (id: number) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((coId) => coId !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: AccountFormData) => {
    if (!companyId) return;

    const submissionData = {
      ...data,
      addAllFirms: addAllFirms,
      targetCompanyIds: selectedCompanies,
      canBuySellBoth: isDebtorOrCreditor ? canBuySellBoth : false,
    };

    const res = isEdit
      ? await updateAccount({ id: Number(activeId), companyId, data: submissionData })
      : await createAccount({ companyId, data: submissionData });

    if (res.success) {
      showToast(isEdit ? 'Account updated' : 'Account created', 'success');
      if (onSuccessCallback && res.data) {
        onSuccessCallback(res.data.id, res.data.accountName);
      } else {
        navigate(LIST_ROUTE);
      }
    } else {
      showToast(res.error || 'Save failed', 'error');
    }
  };

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  const FormContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* GENERAL SECTION */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Basic Info</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <FormSelect
            control={control}
            name="accountGroupId"
            label="Account Group *"
            placeholder="Select group"
            error={errors.accountGroupId?.message}
            required
            options={groups.map((g) => ({
              value: String(g.id),
              label: g.groupName,
            }))}
            toValue={(v) => Number(v)}
            toString={(v) => String(v ?? '')}
            shortcutType="account-group"
          />
          <Input label="Account Name *" error={errors.accountName?.message} {...register('accountName')} />
          
          <FormSelect
            control={control}
            name="brokerId"
            label="Broker (Reference Only)"
            placeholder="Select broker"
            options={brokers.map((b) => ({
              value: String(b.id),
              label: b.accountName,
            }))}
            toValue={(v) => (v ? Number(v) : null)}
            toString={(v) => String(v ?? '')}
          />

          <FormSelect
            control={control}
            name="status"
            label="Status"
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'BLOCKED', label: 'Blocked' },
            ]}
            searchable={false}
            clearable={false}
          />
        </div>
      </section>

      {/* DUAL RELATIONSHIP: BUY/SELL BOTH */}
      {isDebtorOrCreditor && (
        <>
          <div style={{ borderTop: '1px solid var(--color-border)' }} />
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Trade Partnership Type</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id={`canBuySellBoth-${isModalMode ? 'modal' : 'page'}`}
                checked={canBuySellBoth}
                onChange={(e) => setCanBuySellBoth(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
              />
              <label htmlFor={`canBuySellBoth-${isModalMode ? 'modal' : 'page'}`} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Can this party buy & sell both? (Enable unified Customer & Supplier transactions)
              </label>
            </div>
          </section>
        </>
      )}

      {/* MULTI-FIRM/COMPANY ASSIGNMENT */}
      {true && (
        <>
          <div style={{ borderTop: '1px solid var(--color-border)' }} />
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Firm Assignment</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id={`addAllFirms-${isModalMode ? 'modal' : 'page'}`}
                  checked={addAllFirms}
                  onChange={(e) => {
                    setAddAllFirms(e.target.checked);
                    if (e.target.checked) setSelectedCompanies([]);
                  }}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
                />
                <label htmlFor={`addAllFirms-${isModalMode ? 'modal' : 'page'}`} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Add this account in all firms / companies (Auto-Tick)
                </label>
              </div>

              {!addAllFirms && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '24px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Select Companies to add this Account to:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {companies.map((c) => {
                      const isActive = c.id === companyId;
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id={`co-${isModalMode ? 'modal-' : ''}${c.id}`}
                            checked={isActive || selectedCompanies.includes(c.id)}
                            disabled={isActive}
                            onChange={() => toggleCompanySelection(c.id)}
                            style={{ width: '14px', height: '14px' }}
                          />
                          <label
                            htmlFor={`co-${isModalMode ? 'modal-' : ''}${c.id}`}
                            style={{
                              fontSize: '14px',
                              color: isActive ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                              fontWeight: isActive ? 600 : 400
                            }}
                          >
                            {c.companyName} {isActive && '(Current)'}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* CONTACT INFO */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Contact Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <Input label="Mobile" {...register('mobile')} />
          <Input label="Phone" {...register('phone')} />
          <Input label="Email" type="email" {...register('email')} />
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* ADDRESS SECTION */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Address</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Input label="Address Line 1" {...register('addressLine1')} />
          <Input label="Address Line 2" {...register('addressLine2')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
          <Input label="City" {...register('city')} />
          <FormSelect
            control={control}
            name="stateCode"
            label="State"
            placeholder="Select state"
            options={statesList.map((s) => ({
              value: s.stateCode,
              label: `${s.stateCode} - ${s.stateName}`,
            }))}
          />
          <Input label="Pincode" {...register('pincode')} />
          <Input label="Country" {...register('country')} />
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* GST & TAX */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Tax & GST</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <FormSelect
            control={control}
            name="gstRegType"
            label="GST Registration Type"
            placeholder="Select type"
            options={[
              { value: 'REGISTERED', label: 'Registered' },
              { value: 'COMPOSITION', label: 'Composition' },
              { value: 'UNREGISTERED', label: 'Unregistered' },
              { value: 'SEZ_DEVELOPER', label: 'SEZ Developer' },
              { value: 'SEZ_UNIT', label: 'SEZ Unit' },
            ]}
          />
          <Input label="GSTIN" {...register('gstinNumber')} />
          <Input label="PAN" {...register('panNumber')} />
          <Input
            label="TDS Rate (%)"
            placeholder="e.g. 0.10"
            type="number"
            step="0.01"
            error={errors.tdsPct?.message}
            {...register('tdsPct', { valueAsNumber: true })}
          />
          <Input
            label="TCS Rate (%)"
            placeholder="e.g. 0.10"
            type="number"
            step="0.01"
            error={errors.tcsPct?.message}
            {...register('tcsPct', { valueAsNumber: true })}
          />
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* BANK DETAILS */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Bank Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
          <Input label="Bank Name" {...register('bankName')} />
          <Input label="Branch" {...register('bankBranch')} />
          <Input label="Account Number" {...register('bankAccountNumber')} />
          <Input label="IFSC Code" {...register('bankIfsc')} />
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* OPENING BALANCE */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Opening Balance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Input label="Opening Balance" type="number" step="0.01" error={errors.openingBalanceAmount?.message} {...register('openingBalanceAmount', { valueAsNumber: true })} />
          <FormSelect
            control={control}
            name="openingBalanceType"
            label="Balance Type"
            placeholder="Select Dr / Cr"
            options={[
              { value: 'DEBIT', label: 'Debit (Dr)' },
              { value: 'CREDIT', label: 'Credit (Cr)' },
            ]}
          />
        </div>
      </section>
    </div>
  );

  if (isModalMode) {
    return (
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '65vh', paddingRight: '12px' }}>
          <FormContent />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <Button variant="ghost" type="button" onClick={onCancelCallback}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={creating || updating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> {isEdit ? 'Update Account' : 'Create Account'}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" onClick={() => navigate(LIST_ROUTE)}><ArrowLeft size={18} /></Button>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
          {isEdit ? 'Edit Account' : 'New Account'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
      >
        <FormContent />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button variant="ghost" type="button" onClick={() => navigate(LIST_ROUTE)}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={creating || updating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> {isEdit ? 'Update Account' : 'Create Account'}
          </Button>
        </div>
      </form>
    </div>
  );
};
