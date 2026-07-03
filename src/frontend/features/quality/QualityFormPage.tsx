// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Quality Form Page
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft } from 'lucide-react';
import { qualitySchema, QualityFormData } from './quality.schema';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, FormSelect, useToast } from '../../components/ui';
import type { IHsnCode, IQuality } from './quality.types';

const LIST_ROUTE = '/masters/diamond/qualities';

export const QualityFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();
  const isEdit = !!id;
  const [hsnCodes, setHsnCodes] = useState<IHsnCode[]>([]);

  const { invoke: fetchQuality } = useIpc<IQuality>('quality:get');
  const { invoke: createQuality, loading: creating } = useIpc('quality:create');
  const { invoke: updateQuality, loading: updating } = useIpc('quality:update');
  const { invoke: fetchHsn } = useIpc<IHsnCode[]>('quality:hsn-list');

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<QualityFormData>({
    resolver: zodResolver(qualitySchema),
    defaultValues: {
      qualityName: '',
      itemCode: '',
      hsnNumber: '',
      uqc: 'CTS',
      purchaseRate: 0,
      saleRate: 0,
      mrp: 0,
      minLevel: 0,
      maxLevel: 0,
      openingBalanceCarats: 0,
      openingBalancePcs: 0,
      openingBalanceRate: 0,
      status: 'ACTIVE',
      gstPct: 3,
      cessPct: 0,
      isService: false,
    },
  });

  const selectedHsn = watch('hsnNumber');

  useEffect(() => {
    const loadHsn = async () => {
      const res = await fetchHsn();
      if (res.success && res.data) setHsnCodes(res.data);
    };
    loadHsn();
  }, [fetchHsn]);

  useEffect(() => {
    const hsn = hsnCodes.find((h) => h.hsnCode === selectedHsn);
    if (hsn && !isEdit) {
      setValue('gstPct', Number(hsn.gstPct));
      setValue('cessPct', Number(hsn.cessPct));
    }
  }, [selectedHsn, hsnCodes, setValue, isEdit]);

  useEffect(() => {
    if (!companyId || !isEdit || !id) return;
    const load = async () => {
      const res = await fetchQuality({ id: Number(id), companyId });
      if (res.success && res.data) {
        const q = res.data;
        const latestGst = q.gstHistory?.[0];
        reset({
          qualityName: q.qualityName,
          itemCode: q.itemCode,
          hsnNumber: q.hsnNumber,
          uqc: q.uqc,
          purchaseRate: Number(q.purchaseRate),
          saleRate: Number(q.saleRate),
          mrp: Number(q.mrp),
          minLevel: Number(q.minLevel),
          maxLevel: Number(q.maxLevel),
          openingBalanceCarats: Number(q.openingBalanceCarats),
          openingBalancePcs: q.openingBalancePcs,
          openingBalanceRate: Number(q.openingBalanceRate),
          status: q.status,
          gstPct: latestGst ? Number(latestGst.gstPct) : 3,
          cessPct: latestGst ? Number(latestGst.cessPct) : 0,
          isService: !!q.isService,
        });
      }
    };
    load();
  }, [companyId, id, isEdit, fetchQuality, reset]);

  const onSubmit = async (data: QualityFormData) => {
    if (!companyId) return;
    const res = isEdit
      ? await updateQuality({ id: Number(id), companyId, data })
      : await createQuality({ companyId, data });
    if (res.success) {
      showToast(isEdit ? 'Quality updated' : 'Quality created', 'success');
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
          {isEdit ? 'Edit Quality' : 'New Quality'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
      >
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Basic Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <Input label="Quality Name *" error={errors.qualityName?.message} {...register('qualityName')} />
          <Input label="Item Code *" error={errors.itemCode?.message} {...register('itemCode')} />
          <FormSelect
            control={control}
            name="isService"
            label="Quality Type *"
            options={[
              { value: 'false', label: 'Inventory (Stock Packet)' },
              { value: 'true', label: 'Service (Job Work Charges / Fees)' },
            ]}
            toValue={(v) => v === 'true'}
            searchable={false}
            clearable={false}
          />
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--color-primary)' }}>
              HSN Code *
            </label>
            <input
              type="text"
              list="hsn-list"
              placeholder="Type or select HSN"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-primary)',
              }}
              {...register('hsnNumber')}
            />
            <datalist id="hsn-list">
              {hsnCodes.map((h) => (
                <option key={h.hsnCode} value={h.hsnCode}>
                  {h.hsnCode} — {h.description}
                </option>
              ))}
            </datalist>
            {errors.hsnNumber && (
              <span style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '4px', display: 'block' }}>
                {errors.hsnNumber.message}
              </span>
            )}
          </div>
          <FormSelect
            control={control}
            name="uqc"
            label="UQC"
            options={[
              { value: 'CTS', label: 'Carats (CTS)' },
              { value: 'PCS', label: 'Pieces (PCS)' },
            ]}
            searchable={false}
            clearable={false}
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

        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Rates & Taxes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <Input label="Purchase Rate" type="number" step="0.01" {...register('purchaseRate', { valueAsNumber: true })} />
          <Input label="Sale Rate" type="number" step="0.01" {...register('saleRate', { valueAsNumber: true })} />
          <Input label="MRP" type="number" step="0.01" {...register('mrp', { valueAsNumber: true })} />
          
          {!watch('isService') && (
            <>
              <Input label="Min Level" type="number" step="0.001" {...register('minLevel', { valueAsNumber: true })} />
              <Input label="Max Level" type="number" step="0.001" {...register('maxLevel', { valueAsNumber: true })} />
            </>
          )}

          <Input label="GST %" type="number" step="0.01" {...register('gstPct', { valueAsNumber: true })} disabled={isEdit} />
          <Input label="Cess %" type="number" step="0.01" {...register('cessPct', { valueAsNumber: true })} disabled={isEdit} />
        </div>

        {!isEdit && !watch('isService') && (
          <>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Opening Balance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <Input label="Carats" type="number" step="0.001" {...register('openingBalanceCarats', { valueAsNumber: true })} />
              <Input label="Pieces" type="number" {...register('openingBalancePcs', { valueAsNumber: true })} />
              <Input label="Rate" type="number" step="0.01" {...register('openingBalanceRate', { valueAsNumber: true })} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button variant="primary" type="submit" loading={creating || updating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> Save Quality
          </Button>
        </div>
      </form>
    </div>
  );
};
