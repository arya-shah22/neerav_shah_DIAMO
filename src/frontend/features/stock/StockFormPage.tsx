// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Form Page (Stage 3)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft } from 'lucide-react';
import { stockSchema, StockFormData } from './stock.schema';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, Combobox, FormSelect, useToast } from '../../components/ui';
import { IQuality } from '../quality/quality.types';
import { IStockPacket, CERTIFICATE_TYPES, STOCK_STATUS_LABELS, EDITABLE_STOCK_STATUSES } from './stock.types';
import { useCompanyStore } from '../../state/company-store';

const LIST_ROUTE = '/inventory/stock';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const StockFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();
  const isEdit = !!id;

  const [qualities, setQualities] = useState<IQuality[]>([]);
  const [shapeOptions, setShapeOptions] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState('');
  const [useManualId, setUseManualId] = useState(false);
  const [editBlocked, setEditBlocked] = useState(false);
  const [piecesNotCounted, setPiecesNotCounted] = useState(false);

  const { invoke: fetchStock } = useIpc<IStockPacket>('stock:get');
  const { invoke: createStock, loading: creating } = useIpc('stock:create');
  const { invoke: updateStock, loading: updating } = useIpc('stock:update');
  const { invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const { invoke: fetchPreviewId } = useIpc<string>('stock:preview-id');
  const { invoke: fetchShapes } = useIpc<string[]>('stock:shapes-list');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      category: 'NON_CERTIFIED',
      registrationDate: todayIsoDate(),
      currentStatus: 'AVAILABLE',
      pieceCount: 1,
      costPerCarat: 0,
      totalCost: 0,
      imageLink: '',
      videoLink: '',
    },
  });

  const category = watch('category');
  const caratWeight = watch('caratWeight');
  const costPerCarat = watch('costPerCarat');
  const currentStatus = watch('currentStatus');

  useEffect(() => {
    if (!isNaN(caratWeight) && !isNaN(costPerCarat)) {
      setValue('totalCost', Number((caratWeight * costPerCarat).toFixed(2)));
    }
  }, [caratWeight, costPerCarat, setValue]);

  const loadShapes = React.useCallback(async () => {
    if (!companyId) return;
    const res = await fetchShapes(companyId);
    if (res.success && res.data) setShapeOptions(res.data);
  }, [companyId, fetchShapes]);

  useEffect(() => {
    if (!companyId) return;
    fetchQualities({ companyId }).then((res) => {
      if (res.success && res.data) {
        setQualities(res.data.filter((q) => !q.isService));
      }
    });
    loadShapes();
  }, [companyId, fetchQualities, loadShapes]);

  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  useEffect(() => {
    if (!companyId || isEdit) return;
    fetchPreviewId({ companyId, financialYearId: activeFinancialYear?.id }).then((res) => {
      if (res.success && res.data) setPreviewId(res.data);
    });
  }, [companyId, isEdit, fetchPreviewId, activeFinancialYear?.id]);

  useEffect(() => {
    if (!companyId || !isEdit || !id) return;
    const load = async () => {
      const res = await fetchStock({ id: Number(id), companyId });
      if (res.success && res.data) {
        const s = res.data;
        if (!EDITABLE_STOCK_STATUSES.includes(s.currentStatus)) {
          setEditBlocked(true);
        }
        setPiecesNotCounted(s.pieceCount === 0);
        reset({
          stockIdNumber: s.stockIdNumber,
          qualityId: s.qualityId,
          category: s.category,
          registrationDate: s.registrationDate.slice(0, 10),
          currentStatus: s.currentStatus,
          currentLocation: s.currentLocation ?? undefined,
          shape: s.shape ?? undefined,
          caratWeight: Number(s.caratWeight),
          pieceCount: s.pieceCount,
          color: s.color ?? undefined,
          clarity: s.clarity ?? undefined,
          cut: s.cut ?? undefined,
          polish: s.polish ?? undefined,
          symmetry: s.symmetry ?? undefined,
          lengthMm: s.lengthMm != null ? Number(s.lengthMm) : undefined,
          widthMm: s.widthMm != null ? Number(s.widthMm) : undefined,
          depthMm: s.depthMm != null ? Number(s.depthMm) : undefined,
          totalDepthPct: s.totalDepthPct != null ? Number(s.totalDepthPct) : undefined,
          tablePct: s.tablePct != null ? Number(s.tablePct) : undefined,
          certificateType: s.certificateType ?? undefined,
          certificateNumber: s.certificateNumber ?? undefined,
          costPerCarat: Number(s.costPerCarat),
          totalCost: Number(s.totalCost),
          targetSaleRate: s.targetSaleRate != null ? Number(s.targetSaleRate) : undefined,
          imageLink: s.imageLink ?? '',
          videoLink: s.videoLink ?? '',
        });
      }
    };
    load();
  }, [companyId, id, isEdit, fetchStock, reset]);

  const onSubmit = async (data: StockFormData) => {
    if (!companyId) return;
    const payload = {
      ...data,
      stockIdNumber: !isEdit && useManualId ? data.stockIdNumber : isEdit ? data.stockIdNumber : undefined,
      financialYearId: activeFinancialYear?.id,
    };
    const res = isEdit
      ? await updateStock({ id: Number(id), companyId, data: payload })
      : await createStock({ companyId, data: payload });
    if (res.success) {
      const savedShape = (data.shape ?? '').trim();
      if (savedShape) {
        setShapeOptions((prev) => {
          const exists = prev.some((s) => s.toLowerCase() === savedShape.toLowerCase());
          if (exists) return prev;
          return [...prev, savedShape].sort((a, b) => a.localeCompare(b));
        });
      }
      showToast(isEdit ? 'Stock packet updated' : 'Stock packet created', 'success');
      navigate(isEdit ? LIST_ROUTE : `/inventory/stock/${(res.data as IStockPacket).id}`);
    } else {
      showToast(res.error || 'Save failed', 'error');
    }
  };

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  if (isEdit && editBlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => navigate(LIST_ROUTE)}><ArrowLeft size={18} /></Button>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Edit Stock Packet</h1>
        </div>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          This stock packet cannot be edited in its current status. View details from the stock list.
        </p>
        <Button variant="primary" onClick={() => navigate(LIST_ROUTE)}>Back to Inventory</Button>
      </div>
    );
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const grid2: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  };

  const grid3: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" onClick={() => navigate(LIST_ROUTE)}><ArrowLeft size={18} /></Button>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
          {isEdit ? 'Edit Stock Packet' : 'New Stock Packet'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
        }}
      >
        {/* Identification */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Identification</h2>
          <div style={grid2}>
            {!isEdit && (
              <div>
                <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Stock ID
                </label>
                {!useManualId ? (
                  <div style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-row-alt)',
                    fontFamily: 'monospace',
                    fontSize: 'var(--text-label)',
                  }}>
                    {previewId || 'Generating...'}
                  </div>
                ) : (
                  <Input
                    label=""
                    placeholder="Enter manual stock ID"
                    error={errors.stockIdNumber?.message}
                    {...register('stockIdNumber')}
                  />
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: 'var(--text-small)' }}>
                  <input type="checkbox" checked={useManualId} onChange={(e) => setUseManualId(e.target.checked)} />
                  Use manual stock ID
                </label>
              </div>
            )}
            {isEdit && (
              <Input label="Stock ID" disabled {...register('stockIdNumber')} />
            )}
            <FormSelect
              control={control}
              name="qualityId"
              label="Quality *"
              placeholder="Select quality"
              error={errors.qualityId?.message}
              required
              options={qualities.map((q) => ({
                value: String(q.id),
                label: q.qualityName,
              }))}
              toValue={(v) => (v ? Number(v) : 0)}
            />
            <FormSelect
              control={control}
              name="category"
              label="Category"
              options={[
                { value: 'NON_CERTIFIED', label: 'Non-Certified' },
                { value: 'CERTIFIED', label: 'Certified' },
              ]}
              searchable={false}
              clearable={false}
            />
            <Input label="Registration Date *" type="date" error={errors.registrationDate?.message} {...register('registrationDate')} />
            <FormSelect
              control={control}
              name="currentStatus"
              label="Status"
              options={Object.entries(STOCK_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              searchable={false}
              clearable={false}
            />
            <Input label="Remarks" {...register('currentLocation')} />
          </div>
          {isEdit && currentStatus && (
            <div style={{ marginTop: '12px' }}>
              <Input label="Status change remarks (optional)" placeholder="Reason for status change" {...register('statusRemarks')} />
            </div>
          )}
        </div>

        {/* Physical */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Physical Details</h2>
          <div style={grid3}>
            <Controller
              name="shape"
              control={control}
              render={({ field }) => (
                <Combobox
                  label="Shape"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={shapeOptions}
                  placeholder="Select or type a shape"
                  hint="Choose from the list or enter a custom shape"
                  error={errors.shape?.message}
                  maxVisibleItems={10}
                />
              )}
            />
            <Input label="Carat Weight *" type="number" step="0.001" error={errors.caratWeight?.message} {...register('caratWeight', { valueAsNumber: true })} />
            <div>
              <Input
                label="Piece Count"
                type="number"
                disabled={piecesNotCounted}
                error={errors.pieceCount?.message}
                {...register('pieceCount', { valueAsNumber: true })}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: 'var(--text-small)', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={piecesNotCounted}
                  onChange={(e) => {
                    setPiecesNotCounted(e.target.checked);
                    if (e.target.checked) {
                      setValue('pieceCount', 0);
                    } else {
                      setValue('pieceCount', 1);
                    }
                  }}
                />
                Pieces are not counted
              </label>
            </div>
            <Input label="Color" {...register('color')} />
            <Input 
              label="Clarity" 
              style={{ textTransform: 'uppercase' }} 
              {...register('clarity', {
                onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
              })} 
            />
            <Input 
              label="Cut" 
              style={{ textTransform: 'uppercase' }} 
              {...register('cut', {
                onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
              })} 
            />
            <Input 
              label="Polish" 
              style={{ textTransform: 'uppercase' }} 
              {...register('polish', {
                onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
              })} 
            />
            <Input 
              label="Symmetry" 
              style={{ textTransform: 'uppercase' }} 
              {...register('symmetry', {
                onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
              })} 
            />
          </div>
        </div>

        {/* Measurements */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Measurements</h2>
          <div style={grid3}>
            <Input label="Length (mm)" type="number" step="0.01" {...register('lengthMm', { valueAsNumber: true })} />
            <Input label="Width (mm)" type="number" step="0.01" {...register('widthMm', { valueAsNumber: true })} />
            <Input label="Depth (mm)" type="number" step="0.01" {...register('depthMm', { valueAsNumber: true })} />
            <Input label="Total Depth %" type="number" step="0.01" {...register('totalDepthPct', { valueAsNumber: true })} />
            <Input label="Table %" type="number" step="0.01" {...register('tablePct', { valueAsNumber: true })} />
          </div>
        </div>

        {/* Certification */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Certification</h2>
          <div style={grid2}>
            <FormSelect
              control={control}
              name="certificateType"
              label="Certificate Type"
              placeholder="None"
              options={[
                { value: '', label: 'None' },
                ...CERTIFICATE_TYPES.map((t) => ({ value: t, label: t })),
              ]}
              searchable={false}
              toValue={(v) => v || undefined}
            />
            <Input
              label={category === 'CERTIFIED' ? 'Certificate Number *' : 'Certificate Number'}
              error={errors.certificateNumber?.message}
              {...register('certificateNumber')}
            />
          </div>
        </div>

        {/* Valuation */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Valuation & Target Selling</h2>
          <div style={grid3}>
            <Input label="Cost per Carat (₹)" type="number" step="0.01" {...register('costPerCarat', { valueAsNumber: true })} />
            <Input label="Total Cost (₹)" type="number" step="0.01" {...register('totalCost', { valueAsNumber: true })} />
            <Input label="Target Sale Rate (₹/ct) [Optional]" type="number" step="0.01" placeholder="Target asking price" {...register('targetSaleRate', { valueAsNumber: true })} />
          </div>
        </div>

        {/* Media Links */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Media Links</h2>
          <div style={grid2}>
            <Input
              label="Image Link"
              type="text"
              placeholder="https://example.com/diamond.jpg"
              error={errors.imageLink?.message}
              {...register('imageLink')}
            />
            <Input
              label="Video Link"
              type="text"
              placeholder="https://example.com/diamond.mp4"
              error={errors.videoLink?.message}
              {...register('videoLink')}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" type="submit" loading={creating || updating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> {isEdit ? 'Update Stock' : 'Register Stock'}
          </Button>
        </div>
      </form>
    </div>
  );
};
