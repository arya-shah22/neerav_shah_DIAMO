// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Form Page (Stage 3)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [formExchangeRate, setFormExchangeRate] = useState<number>(83.25);
  const [advancedSections, setAdvancedSections] = useState({ fluorescence: false, girdle: false, inclusions: false });
  const toggleSection = useCallback((key: 'fluorescence' | 'girdle' | 'inclusions') => {
    setAdvancedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const { invoke: fetchStock } = useIpc<IStockPacket>('stock:get');
  const { invoke: createStock, loading: creating } = useIpc('stock:create');
  const { invoke: updateStock, loading: updating } = useIpc('stock:update');
  const { invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const { invoke: fetchPreviewId } = useIpc<string>('stock:preview-id');
  const { invoke: fetchShapes } = useIpc<string[]>('stock:shapes-list');
  const { invoke: fetchLatestRate } = useIpc<any>('exchange-rate:latest');

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
    fetchLatestRate({ companyId }).then((res) => {
      if (res?.success && res.data?.exchangeRate) {
        setFormExchangeRate(res.data.exchangeRate);
      }
    });
    loadShapes();
  }, [companyId, fetchQualities, fetchLatestRate, loadShapes]);

  useEffect(() => {
    if (!companyId) return;
    const handleShortcutSuccess = async () => {
      const res = await fetchQualities({ companyId });
      if (res.success && res.data) {
        setQualities(res.data.filter((q) => !q.isService));
      }
    };
    window.addEventListener('shortcut-master-success', handleShortcutSuccess);
    return () => window.removeEventListener('shortcut-master-success', handleShortcutSuccess);
  }, [companyId, fetchQualities]);

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
          // Extended Diamond Details
          fluorescenceIntensity: s.fluorescenceIntensity ?? undefined,
          fluorescenceColor: s.fluorescenceColor ?? undefined,
          rapPricePerCarat: s.rapPricePerCarat != null ? Number(s.rapPricePerCarat) : undefined,
          rapDiscountPct: s.rapDiscountPct != null ? Number(s.rapDiscountPct) : undefined,
          crownAngle: s.crownAngle != null ? Number(s.crownAngle) : undefined,
          crownHeight: s.crownHeight != null ? Number(s.crownHeight) : undefined,
          pavilionAngle: s.pavilionAngle != null ? Number(s.pavilionAngle) : undefined,
          pavilionDepth: s.pavilionDepth != null ? Number(s.pavilionDepth) : undefined,
          girdleMin: s.girdleMin ?? undefined,
          girdleMax: s.girdleMax ?? undefined,
          girdlePct: s.girdlePct != null ? Number(s.girdlePct) : undefined,
          girdleCondition: s.girdleCondition ?? undefined,
          culetSize: s.culetSize ?? undefined,
          culetCondition: s.culetCondition ?? undefined,
          heartsAndArrows: s.heartsAndArrows ?? undefined,
          eyeClean: s.eyeClean ?? undefined,
          shade: s.shade ?? undefined,
          milky: s.milky ?? undefined,
          treatment: s.treatment ?? undefined,
          tinge: s.tinge ?? undefined,
          lustre: s.lustre ?? undefined,
          tableInclusion: s.tableInclusion ?? undefined,
          sideInclusion: s.sideInclusion ?? undefined,
          tableOpen: s.tableOpen ?? undefined,
          crownOpen: s.crownOpen ?? undefined,
          girdleOpen: s.girdleOpen ?? undefined,
          origin: s.origin ?? undefined,
          certificateUrl: s.certificateUrl ?? undefined,
          webUrl: s.webUrl ?? undefined,
          inscription: s.inscription ?? undefined,
          keyToSymbols: s.keyToSymbols ?? undefined,
          diamondComment: s.diamondComment ?? undefined,
          fancyColor: s.fancyColor ?? undefined,
          fancyColorIntensity: s.fancyColorIntensity ?? undefined,
          fancyColorOvertone: s.fancyColorOvertone ?? undefined,
          availability: s.availability ?? undefined,
          city: s.city ?? undefined,
          state: s.state ?? undefined,
          tradeShow: s.tradeShow ?? undefined,
          brand: s.brand ?? undefined,
          sellerSpec: s.sellerSpec ?? undefined,
          pairStockNumber: s.pairStockNumber ?? undefined,
          isPairSeparable: s.isPairSeparable ?? undefined,
          parcelStones: s.parcelStones ?? undefined,
          reportFilename: s.reportFilename ?? undefined,
          reportIssueDate: s.reportIssueDate ?? undefined,
          labLocation: s.labLocation ?? undefined,
          certComment: s.certComment ?? undefined,
          memberComment: s.memberComment ?? undefined,
          allowRaplinkFeed: s.allowRaplinkFeed ?? undefined,
          sarineLoupe: s.sarineLoupe ?? undefined,
          reportType: s.reportType ?? undefined,
          diamondType: s.diamondType ?? undefined,
          blackInclusion: s.blackInclusion ?? undefined,
          whiteInclusion: s.whiteInclusion ?? undefined,
          openInclusion: s.openInclusion ?? undefined,
          starLength: s.starLength != null ? Number(s.starLength) : undefined,
          growthType: s.growthType ?? undefined,
          bgm: s.bgm ?? undefined,
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
              shortcutType="quality"
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
            <Input label="Measurements (e.g. 6.50-6.52x4.00)" placeholder="6.50-6.52x4.00" {...register('measurements')} />
            <Input label="Total Depth %" type="number" step="0.01" {...register('totalDepthPct', { valueAsNumber: true })} />
            <Input label="Table %" type="number" step="0.01" {...register('tablePct', { valueAsNumber: true })} />
          </div>
        </div>

        {/* ── Fluorescence & Optical (Collapsible) ── */}
        <div style={sectionStyle}>
          <div
            onClick={() => toggleSection('fluorescence')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', marginBottom: advancedSections.fluorescence ? '16px' : 0 }}
          >
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Fluorescence & Optical</h2>
            {advancedSections.fluorescence ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {advancedSections.fluorescence && (
            <div style={grid3}>
              <Input label="Fluorescence Intensity" {...register('fluorescenceIntensity', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Fluorescence Color" {...register('fluorescenceColor', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Eye Clean" {...register('eyeClean', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Hearts & Arrows" {...register('heartsAndArrows', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Shade" {...register('shade', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Milky" {...register('milky', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Tinge" {...register('tinge', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Lustre" {...register('lustre', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Rap Price ($/ct)" type="number" step="0.01" {...register('rapPricePerCarat', { valueAsNumber: true })} />
              <Input label="Rap Discount %" type="number" step="0.01" {...register('rapDiscountPct', { valueAsNumber: true })} />
            </div>
          )}
        </div>

        {/* ── Girdle, Crown & Pavilion (Collapsible) ── */}
        <div style={sectionStyle}>
          <div
            onClick={() => toggleSection('girdle')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', marginBottom: advancedSections.girdle ? '16px' : 0 }}
          >
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Girdle, Crown & Pavilion</h2>
            {advancedSections.girdle ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {advancedSections.girdle && (
            <div style={grid3}>
              <Input label="Crown Angle" type="number" step="0.01" {...register('crownAngle', { valueAsNumber: true })} />
              <Input label="Crown Height" type="number" step="0.01" {...register('crownHeight', { valueAsNumber: true })} />
              <Input label="Pavilion Angle" type="number" step="0.01" {...register('pavilionAngle', { valueAsNumber: true })} />
              <Input label="Pavilion Depth" type="number" step="0.01" {...register('pavilionDepth', { valueAsNumber: true })} />
              <Input label="Girdle Thin" {...register('girdleMin', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Girdle Thick" {...register('girdleMax', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Girdle %" type="number" step="0.01" {...register('girdlePct', { valueAsNumber: true })} />
              <Input label="Girdle Condition" {...register('girdleCondition', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Culet Size" {...register('culetSize', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Culet Condition" {...register('culetCondition', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Table Open" {...register('tableOpen', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Crown Open" {...register('crownOpen', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Girdle Open" {...register('girdleOpen', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
            </div>
          )}
        </div>

        {/* ── Inclusions, Treatment & Origin (Collapsible) ── */}
        <div style={sectionStyle}>
          <div
            onClick={() => toggleSection('inclusions')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', marginBottom: advancedSections.inclusions ? '16px' : 0 }}
          >
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Inclusions, Treatment & Origin</h2>
            {advancedSections.inclusions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {advancedSections.inclusions && (
            <div style={grid3}>
              <Input label="Table Inclusion" {...register('tableInclusion', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Side Inclusion" {...register('sideInclusion', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Black Inclusion" {...register('blackInclusion', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="White Inclusion" {...register('whiteInclusion', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Open Inclusion" {...register('openInclusion', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="BGM" {...register('bgm', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Growth Type" {...register('growthType', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Type" {...register('diamondType', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Star Length" type="number" step="0.01" {...register('starLength', { valueAsNumber: true })} />
              <Input label="Treatment" {...register('treatment', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Origin" {...register('origin', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Availability" {...register('availability', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="City" {...register('city', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="State" {...register('state', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Trade Show" {...register('tradeShow', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Brand" {...register('brand', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Seller Spec" {...register('sellerSpec')} />
              <Input label="Pair Stock #" {...register('pairStockNumber')} />
              <Input label="Pair Separable" {...register('isPairSeparable', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Parcel Stones" {...register('parcelStones')} />
              <Input label="Report Filename" {...register('reportFilename')} />
              <Input label="Report Issue Date" {...register('reportIssueDate')} />
              <Input label="Report Type" {...register('reportType', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Lab Location" {...register('labLocation', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Allow RapLink Feed" {...register('allowRaplinkFeed', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Sarine Loupe" {...register('sarineLoupe')} />
              <Input label="Laser Inscription" {...register('inscription')} />
              <Input label="Key to Symbols" {...register('keyToSymbols')} />
              <Input label="Fancy Color" {...register('fancyColor', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Fancy Color Intensity" {...register('fancyColorIntensity', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Fancy Color Overtone" {...register('fancyColorOvertone', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
              <Input label="Certificate URL" {...register('certificateUrl')} />
              <Input label="Web URL" {...register('webUrl')} />
              <Input label="Cert Comment" {...register('certComment')} />
              <Input label="Member Comment" {...register('memberComment')} />
              <div style={{ gridColumn: '1 / -1' }}>
                <Input label="Comment" {...register('diamondComment')} />
              </div>
            </div>
          )}
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
            <Input label="Cost per Carat ($)" type="number" step="0.01" {...register('costPerCarat', { valueAsNumber: true })} />
            <Input label="Total Cost ($)" type="number" step="0.01" {...register('totalCost', { valueAsNumber: true })} />
            <Input label="Target Sale Rate ($/ct) [Optional]" type="number" step="0.01" placeholder="Target asking price in $" {...register('targetSaleRate', { valueAsNumber: true })} />
          </div>

          <div style={{ marginTop: '16px', background: 'var(--color-row-alt)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 240px' }}>
              <Input
                label="Exchange Rate ($1 = ₹)"
                type="number"
                step="0.01"
                value={formExchangeRate}
                onChange={(e) => setFormExchangeRate(Number(e.target.value) || 0)}
              />
            </div>
            <div style={{ display: 'flex', gap: '24px', flex: 1, flexWrap: 'wrap', paddingTop: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Cost in INR</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#b45309' }}>
                  ₹{((costPerCarat || 0) * formExchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ct
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Total Cost in INR</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#b45309' }}>
                  ₹{((watch('totalCost') || 0) * formExchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {watch('targetSaleRate') ? (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Target Rate in INR</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#047857' }}>
                    ₹{((watch('targetSaleRate') || 0) * formExchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ct
                  </span>
                </div>
              ) : null}
            </div>
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
