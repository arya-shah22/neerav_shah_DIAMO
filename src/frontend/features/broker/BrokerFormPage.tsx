// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Broker Form Page
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft } from 'lucide-react';
import { brokerSchema, BrokerFormData } from './broker.schema';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, FormSelect, useToast } from '../../components/ui';
import type { IBroker } from './broker.types';

const LIST_ROUTE = '/masters/business/brokers';

interface StateCodeObj {
  stateCode: string;
  stateName: string;
}

export const BrokerFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();
  const isEdit = !!id;
  const [statesList, setStatesList] = useState<StateCodeObj[]>([]);

  const { invoke: fetchBroker } = useIpc<IBroker>('broker:get');
  const { invoke: createBroker, loading: creating } = useIpc('broker:create');
  const { invoke: updateBroker, loading: updating } = useIpc('broker:update');
  const { invoke: fetchStates } = useIpc<StateCodeObj[]>('company:states');

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<BrokerFormData>({
    resolver: zodResolver(brokerSchema),
    defaultValues: {
      accountName: '',
      printName: '',
      status: 'ACTIVE',
      gstinNumber: '',
      panNumber: '',
      creditDays: 0,
      creditLimit: 0,
      addressLine1: '',
      city: '',
      stateCode: '',
      pincode: '',
      mobile: '',
      email: '',
      bankAccountNumber: '',
      bankName: '',
      bankIfsc: '',
      brokeragePct: 0,
      addLess: 'LESS',
      tdsPct: 5,
    },
  });

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      const statesRes = await fetchStates();
      if (statesRes.success && statesRes.data) setStatesList(statesRes.data);

      if (isEdit && id) {
        const res = await fetchBroker({ id: Number(id), companyId });
        if (res.success && res.data) {
          const b = res.data;
          reset({
            accountName: b.accountName,
            printName: b.printName || '',
            status: b.status,
            gstinNumber: b.gstinNumber || '',
            panNumber: b.panNumber || '',
            creditDays: b.creditDays,
            creditLimit: Number(b.creditLimit),
            addressLine1: b.addressLine1 || '',
            city: b.city || '',
            stateCode: b.stateCode || '',
            pincode: b.pincode || '',
            mobile: b.mobile || '',
            email: b.email || '',
            bankAccountNumber: b.bankAccountNumber || '',
            bankName: b.bankName || '',
            bankIfsc: b.bankIfsc || '',
            brokeragePct: b.brokerProfile?.brokeragePct ?? 0,
            addLess: b.brokerProfile?.addLess || 'LESS',
            tdsPct: b.brokerProfile?.tdsPct ?? 5,
          });
        }
      }
    };
    load();
  }, [companyId, id, isEdit, fetchBroker, fetchStates, reset]);

  const onSubmit = async (data: BrokerFormData) => {
    if (!companyId) return;
    const res = isEdit
      ? await updateBroker({ id: Number(id), companyId, data })
      : await createBroker({ companyId, data });
    if (res.success) {
      showToast(isEdit ? 'Broker updated' : 'Broker created', 'success');
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
          {isEdit ? 'Edit Broker' : 'New Broker'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
      >
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Basic Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <Input label="Broker Name *" error={errors.accountName?.message} {...register('accountName')} />
          <Input label="Print Name" {...register('printName')} />
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
          <Input label="Mobile" {...register('mobile')} />
          <Input label="Email" error={errors.email?.message} {...register('email')} />
          <Input label="GSTIN" {...register('gstinNumber')} />
          <Input label="PAN" {...register('panNumber')} />
        </div>

        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Brokerage & TDS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <Input label="Brokerage %" type="number" step="0.01" {...register('brokeragePct', { valueAsNumber: true })} />
          <FormSelect
            control={control}
            name="addLess"
            label="Add / Less"
            options={[
              { value: 'LESS', label: 'Less' },
              { value: 'ADD', label: 'Add' },
            ]}
            searchable={false}
            clearable={false}
          />
          <Input label="TDS %" type="number" step="0.01" {...register('tdsPct', { valueAsNumber: true })} />
        </div>

        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Address & Bank</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Input label="Address" {...register('addressLine1')} />
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
          <Input label="Bank Account" {...register('bankAccountNumber')} />
          <Input label="Bank Name" {...register('bankName')} />
          <Input label="IFSC" {...register('bankIfsc')} />
          <Input label="Credit Days" type="number" {...register('creditDays', { valueAsNumber: true })} />
          <Input label="Credit Limit" type="number" {...register('creditLimit', { valueAsNumber: true })} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button variant="primary" type="submit" loading={creating || updating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> Save Broker
          </Button>
        </div>
      </form>
    </div>
  );
};
