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

export interface QualityFormProps {
  modalId?: number;
  isModalMode?: boolean;
  initialSearchName?: string;
  onSuccessCallback?: (id: number, name: string) => void;
  onCancelCallback?: () => void;
}

export const QualityFormPage: React.FC<QualityFormProps> = ({
  modalId,
  isModalMode = false,
  initialSearchName = '',
  onSuccessCallback,
  onCancelCallback,
}) => {
  const { id: routeId } = useParams<{ id: string }>();
  const activeId = modalId ?? (routeId ? Number(routeId) : undefined);
  const isEdit = !!activeId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();
  const [hsnCodes, setHsnCodes] = useState<IHsnCode[]>([]);

  const { invoke: fetchQuality } = useIpc<IQuality>('quality:get');
  const { invoke: createQuality, loading: creating } = useIpc<IQuality>('quality:create');
  const { invoke: updateQuality, loading: updating } = useIpc<IQuality>('quality:update');
  const { invoke: fetchHsn } = useIpc<IHsnCode[]>('quality:hsn-list');

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<QualityFormData>({
    resolver: zodResolver(qualitySchema),
    defaultValues: {
      qualityName: initialSearchName,
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
    if (!companyId || !isEdit || !activeId) return;
    const load = async () => {
      const res = await fetchQuality({ id: Number(activeId), companyId });
      if (res.success && res.data) {
        const q = res.data;
        const latestGst = q.gstHistory?.[0];
        reset({
          qualityName: q.qualityName,
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
          declarationText: q.declarationText || '',
          termsConditions: q.termsConditions || '',
        });
      }
    };
    load();
  }, [companyId, activeId, isEdit, fetchQuality, reset]);

  const onSubmit = async (data: QualityFormData) => {
    if (!companyId) return;
    const res = isEdit
      ? await updateQuality({ id: Number(activeId), companyId, data })
      : await createQuality({ companyId, data });
    if (res.success) {
      showToast(isEdit ? 'Quality updated' : 'Quality created', 'success');
      if (onSuccessCallback && res.data) {
        onSuccessCallback(res.data.id, res.data.qualityName);
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
      <div>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Basic Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
          <Input label="Quality Name *" error={errors.qualityName?.message} {...register('qualityName')} />
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
            maxVisibleItems={10}
            creatable={false}
          />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Inventory (Stock Packet)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <FormSelect
            control={control}
            name="hsnNumber"
            label="HSN Code"
            placeholder="Type or select HSN"
            error={errors.hsnNumber?.message}
            required
            options={hsnCodes.map((h) => ({
              value: h.hsnCode,
              label: `${h.hsnCode} (${h.gstPct}%)`,
            }))}
            creatable
          />
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
            ]}
            searchable={false}
            clearable={false}
          />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Rates & Taxes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <Input label="Purchase Rate" type="number" step="0.01" error={errors.purchaseRate?.message} {...register('purchaseRate', { valueAsNumber: true })} />
          <Input label="Sale Rate" type="number" step="0.01" error={errors.saleRate?.message} {...register('saleRate', { valueAsNumber: true })} />
          <Input label="MRP" type="number" step="0.01" error={errors.mrp?.message} {...register('mrp', { valueAsNumber: true })} />
          <Input label="Min Level" type="number" step="0.01" error={errors.minLevel?.message} {...register('minLevel', { valueAsNumber: true })} />
          <Input label="Max Level" type="number" step="0.01" error={errors.maxLevel?.message} {...register('maxLevel', { valueAsNumber: true })} />
          <Input label="GST %" type="number" step="0.01" error={errors.gstPct?.message} {...register('gstPct', { valueAsNumber: true })} />
          <Input label="Cess %" type="number" step="0.01" error={errors.cessPct?.message} {...register('cessPct', { valueAsNumber: true })} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Opening Balance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <Input label="Carats" type="number" step="0.01" error={errors.openingBalanceCarats?.message} {...register('openingBalanceCarats', { valueAsNumber: true })} />
          <Input label="Pieces" type="number" error={errors.openingBalancePcs?.message} {...register('openingBalancePcs', { valueAsNumber: true })} />
          <Input label="Rate" type="number" step="0.01" error={errors.openingBalanceRate?.message} {...register('openingBalanceRate', { valueAsNumber: true })} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '6px' }}>
          Custom Print Terms & Declaration (Optional)
        </h2>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          Override default company print template terms and declaration when this quality is billed. Leave empty to use company defaults.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Declaration Text
            </label>
            <textarea
              {...register('declarationText')}
              placeholder="e.g. The diamonds herein invoiced are laboratory-grown synthetic diamonds... (Leave empty to use company default)"
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-body-sm)',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Terms & Conditions
            </label>
            <textarea
              {...register('termsConditions')}
              placeholder="e.g. Custom terms for this quality lot... (Leave empty to use company default)"
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-body-sm)',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>
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
            <Save size={16} /> {isEdit ? 'Update Quality' : 'Create Quality'}
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
          {isEdit ? 'Edit Quality' : 'New Quality'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
      >
        <FormContent />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button variant="primary" type="submit" loading={creating || updating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> Save Quality
          </Button>
        </div>
      </form>
    </div>
  );
};
