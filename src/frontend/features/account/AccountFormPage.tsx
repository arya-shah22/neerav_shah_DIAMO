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
import { Button, Input, useToast } from '../../components/ui';
import type { IAccountGroup } from '../account-group/account-group.types';
import type { IAccount } from './account.types';

const LIST_ROUTE = '/masters/accounting/accounts';
type Tab = 'basic' | 'address' | 'gst' | 'bank' | 'credit';

interface StateCodeObj {
  stateCode: string;
  stateName: string;
}

export const AccountFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();
  const isEdit = !!id;
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [groups, setGroups] = useState<IAccountGroup[]>([]);
  const [statesList, setStatesList] = useState<StateCodeObj[]>([]);

  const { invoke: fetchAccount } = useIpc<IAccount>('account:get');
  const { invoke: createAccount, loading: creating } = useIpc('account:create');
  const { invoke: updateAccount, loading: updating } = useIpc('account:update');
  const { invoke: fetchGroups } = useIpc<IAccountGroup[]>('account-group:list');
  const { invoke: fetchStates } = useIpc<StateCodeObj[]>('company:states');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountGroupId: undefined,
      accountName: '',
      printName: '',
      status: 'ACTIVE',
      gstinNumber: '',
      panNumber: '',
      gstRegType: null,
      udyamMsme: '',
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
    },
  });

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      const [groupsRes, statesRes] = await Promise.all([
        fetchGroups(companyId),
        fetchStates(),
      ]);
      if (groupsRes.success && groupsRes.data) setGroups(groupsRes.data);
      if (statesRes.success && statesRes.data) setStatesList(statesRes.data);

      if (isEdit && id) {
        const res = await fetchAccount({ id: Number(id), companyId });
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
            udyamMsme: a.udyamMsme || '',
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
          });
        }
      }
    };
    load();
  }, [companyId, id, isEdit, fetchAccount, fetchGroups, fetchStates, reset]);

  const onSubmit = async (data: AccountFormData) => {
    if (!companyId) return;
    const res = isEdit
      ? await updateAccount({ id: Number(id), companyId, data })
      : await createAccount({ companyId, data });
    if (res.success) {
      showToast(isEdit ? 'Account updated' : 'Account created', 'success');
      navigate(LIST_ROUTE);
    } else {
      showToast(res.error || 'Save failed', 'error');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'basic', label: 'Basic' },
    { key: 'address', label: 'Address' },
    { key: 'gst', label: 'GST / Tax' },
    { key: 'bank', label: 'Bank' },
    { key: 'credit', label: 'Credit & OB' },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    height: '32px',
    padding: '0 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    fontSize: 'var(--text-body)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" onClick={() => navigate(LIST_ROUTE)}><ArrowLeft size={18} /></Button>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
          {isEdit ? 'Edit Account' : 'New Account'}
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
      >
        {activeTab === 'basic' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Account Group *</label>
              <select style={selectStyle} {...register('accountGroupId', { valueAsNumber: true })}>
                <option value="">Select group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.groupName}</option>
                ))}
              </select>
              {errors.accountGroupId && <span style={{ color: 'var(--color-danger)', fontSize: '12px' }}>{errors.accountGroupId.message}</span>}
            </div>
            <Input label="Account Name *" error={errors.accountName?.message} {...register('accountName')} />
            <Input label="Print Name" error={errors.printName?.message} {...register('printName')} />
            <div>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Status</label>
              <select style={selectStyle} {...register('status')}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'address' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Address Line 1" {...register('addressLine1')} />
            <Input label="Address Line 2" {...register('addressLine2')} />
            <Input label="City" {...register('city')} />
            <div>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>State</label>
              <select style={selectStyle} {...register('stateCode')}>
                <option value="">Select state</option>
                {statesList.map((s) => (
                  <option key={s.stateCode} value={s.stateCode}>{s.stateName}</option>
                ))}
              </select>
            </div>
            <Input label="Pincode" {...register('pincode')} />
            <Input label="Mobile" {...register('mobile')} />
            <Input label="Phone" {...register('phone')} />
            <Input label="Email" error={errors.email?.message} {...register('email')} />
          </div>
        )}

        {activeTab === 'gst' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="GSTIN" {...register('gstinNumber')} />
            <Input label="PAN" {...register('panNumber')} />
            <div>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>GST Registration Type</label>
              <select style={selectStyle} {...register('gstRegType')}>
                <option value="">—</option>
                <option value="REGULAR">Regular</option>
                <option value="COMPOSITION">Composition</option>
                <option value="UNREGISTERED">Unregistered</option>
                <option value="SEZ">SEZ</option>
                <option value="DEEMED_EXPORT">Deemed Export</option>
              </select>
            </div>
            <Input label="Udyam / MSME" {...register('udyamMsme')} />
          </div>
        )}

        {activeTab === 'bank' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Account Number" {...register('bankAccountNumber')} />
            <Input label="Bank Name" {...register('bankName')} />
            <Input label="Branch" {...register('bankBranch')} />
            <Input label="IFSC" {...register('bankIfsc')} />
          </div>
        )}

        {activeTab === 'credit' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Credit Days" type="number" {...register('creditDays', { valueAsNumber: true })} />
            <Input label="Credit Limit" type="number" {...register('creditLimit', { valueAsNumber: true })} />
            <Input label="Opening Balance" type="number" {...register('openingBalanceAmount', { valueAsNumber: true })} />
            <div>
              <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Opening Balance Type</label>
              <select style={selectStyle} {...register('openingBalanceType')}>
                <option value="">—</option>
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button variant="primary" type="submit" loading={creating || updating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> Save Account
          </Button>
        </div>
      </form>
    </div>
  );
};
