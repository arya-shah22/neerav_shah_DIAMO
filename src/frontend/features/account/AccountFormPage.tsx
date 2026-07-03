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

export const AccountFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();
  const isEdit = !!id;
  const [groups, setGroups] = useState<IAccountGroup[]>([]);
  const [statesList, setStatesList] = useState<StateCodeObj[]>([]);

  const { invoke: fetchAccount } = useIpc<IAccount>('account:get');
  const { invoke: createAccount, loading: creating } = useIpc('account:create');
  const { invoke: updateAccount, loading: updating } = useIpc('account:update');
  const { invoke: fetchGroups } = useIpc<IAccountGroup[]>('account-group:list');
  const { invoke: fetchStates } = useIpc<StateCodeObj[]>('company:states');

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<AccountFormData>({
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

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Basic</h2>
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
            />
            <Input label="Account Name *" error={errors.accountName?.message} {...register('accountName')} />
            <Input label="Print Name" error={errors.printName?.message} {...register('printName')} />
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

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Address</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Address Line 1" {...register('addressLine1')} />
            <Input label="Address Line 2" {...register('addressLine2')} />
            <Input label="City" {...register('city')} />
            <FormSelect
              control={control}
              name="stateCode"
              label="State"
              placeholder="Select state"
              options={statesList.map((s) => ({
                value: s.stateCode,
                label: s.stateName,
              }))}
            />
            <Input label="Pincode" {...register('pincode')} />
            <Input label="Mobile" {...register('mobile')} />
            <Input label="Phone" {...register('phone')} />
            <Input label="Email" error={errors.email?.message} {...register('email')} />
            </div>
          </section>

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>GST / Tax</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="GSTIN" {...register('gstinNumber')} />
            <Input label="PAN" {...register('panNumber')} />
            <FormSelect
              control={control}
              name="gstRegType"
              label="GST Registration Type"
              placeholder="—"
              options={[
                { value: 'REGULAR', label: 'Regular' },
                { value: 'COMPOSITION', label: 'Composition' },
                { value: 'UNREGISTERED', label: 'Unregistered' },
                { value: 'SEZ', label: 'SEZ' },
                { value: 'DEEMED_EXPORT', label: 'Deemed Export' },
              ]}
              toValue={(v) => (v ? v : null)}
              toString={(v) => (v == null ? '' : String(v))}
            />
            <Input label="Udyam / MSME" {...register('udyamMsme')} />
            </div>
          </section>

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Bank</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Account Number" {...register('bankAccountNumber')} />
            <Input label="Bank Name" {...register('bankName')} />
            <Input label="Branch" {...register('bankBranch')} />
            <Input label="IFSC" {...register('bankIfsc')} />
            </div>
          </section>

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Credit & OB</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Credit Days" type="number" {...register('creditDays', { valueAsNumber: true })} />
            <Input label="Credit Limit" type="number" {...register('creditLimit', { valueAsNumber: true })} />
            <Input label="Opening Balance" type="number" {...register('openingBalanceAmount', { valueAsNumber: true })} />
            <FormSelect
              control={control}
              name="openingBalanceType"
              label="Opening Balance Type"
              placeholder="—"
              options={[
                { value: 'DEBIT', label: 'Debit' },
                { value: 'CREDIT', label: 'Credit' },
              ]}
              searchable={false}
              toValue={(v) => (v ? v : null)}
              toString={(v) => (v == null ? '' : String(v))}
            />
            </div>
          </section>
          </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button variant="primary" type="submit" loading={creating || updating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> Save Account
          </Button>
        </div>
      </form>
    </div>
  );
};
