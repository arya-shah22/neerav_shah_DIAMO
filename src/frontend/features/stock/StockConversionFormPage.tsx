// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Conversion Form Page (Quality Transformation)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, Select, Combobox, useToast } from '../../components/ui';
import { IStockPacket, IStockConversion } from './stock.types';
import { IQuality } from '../quality/quality.types';

const LIST_ROUTE = '/inventory/stock-conversion';

interface OutputRow {
  qualityId: number;
  carats: number;
  pieces: number;
  shape: string;
  color: string;
  clarity: string;
  cut: string;
  costPerCarat: number;
  totalCost: number;
  remarks: string;
  // Full Registration Fields
  isManualStockId: boolean;
  stockIdNumber: string;
  category: 'NON_CERTIFIED' | 'CERTIFIED';
  polish: string;
  symmetry: string;
  lengthMm: number | '';
  widthMm: number | '';
  depthMm: number | '';
  totalDepthPct: number | '';
  tablePct: number | '';
  certificateType: string;
  certificateNumber: string;
  imageLink: string;
  videoLink: string;
  // Extended Diamond Details
  fluorescenceIntensity?: string;
  fluorescenceColor?: string;
  rapPricePerCarat?: number | '';
  rapDiscountPct?: number | '';
  crownAngle?: number | '';
  crownHeight?: number | '';
  pavilionAngle?: number | '';
  pavilionDepth?: number | '';
  girdleMin?: string;
  girdleMax?: string;
  girdleCondition?: string;
  culetSize?: string;
  culetCondition?: string;
  heartsAndArrows?: string;
  eyeClean?: string;
  shade?: string;
  milky?: string;
  treatment?: string;
  tinge?: string;
  lustre?: string;
  tableInclusion?: string;
  sideInclusion?: string;
  tableOpen?: string;
  crownOpen?: string;
  girdleOpen?: string;
  origin?: string;
  certificateUrl?: string;
  webUrl?: string;
  inscription?: string;
  keyToSymbols?: string;
  diamondComment?: string;
  fancyColor?: string;
  fancyColorIntensity?: string;
  fancyColorOvertone?: string;
  // UI Expand state
  isExpanded: boolean;
}

const emptyRow = (): OutputRow => ({
  qualityId: 0,
  carats: 0,
  pieces: 1,
  shape: '',
  color: '',
  clarity: '',
  cut: '',
  costPerCarat: 0,
  totalCost: 0,
  remarks: '',
  isManualStockId: false,
  stockIdNumber: '',
  category: 'NON_CERTIFIED',
  polish: '',
  symmetry: '',
  lengthMm: '',
  widthMm: '',
  depthMm: '',
  totalDepthPct: '',
  tablePct: '',
  certificateType: '',
  certificateNumber: '',
  imageLink: '',
  videoLink: '',
  fluorescenceIntensity: '',
  fluorescenceColor: '',
  rapPricePerCarat: '',
  rapDiscountPct: '',
  crownAngle: '',
  crownHeight: '',
  pavilionAngle: '',
  pavilionDepth: '',
  girdleMin: '',
  girdleMax: '',
  girdleCondition: '',
  culetSize: '',
  culetCondition: '',
  heartsAndArrows: '',
  eyeClean: '',
  shade: '',
  milky: '',
  treatment: '',
  tinge: '',
  lustre: '',
  tableInclusion: '',
  sideInclusion: '',
  tableOpen: '',
  crownOpen: '',
  girdleOpen: '',
  origin: '',
  certificateUrl: '',
  webUrl: '',
  inscription: '',
  keyToSymbols: '',
  diamondComment: '',
  fancyColor: '',
  fancyColorIntensity: '',
  fancyColorOvertone: '',
  isExpanded: true,
});

export const StockConversionFormPage: React.FC<{ viewMode?: boolean; editMode?: boolean }> = ({ viewMode = false, editMode = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId } = useActiveCompany();

  // IPC
  const { invoke: fetchPackets } = useIpc<any>('stock:list');
  const { invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const { invoke: createConversion } = useIpc('stock-conversion:create');
  const { invoke: updateConversion } = useIpc('stock-conversion:update');
  const { invoke: fetchConversion } = useIpc<IStockConversion>('stock-conversion:get');
  const { invoke: fetchShapes } = useIpc<string[]>('stock:shapes-list');

  // Masters
  const [packetsList, setPacketsList] = useState<IStockPacket[]>([]);
  const [qualitiesList, setQualitiesList] = useState<IQuality[]>([]);
  const [shapeOptions, setShapeOptions] = useState<string[]>([]);

  // Form State
  const [conversionDate, setConversionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourcePacketId, setSourcePacketId] = useState<number | null>(null);
  const [sourcePacket, setSourcePacket] = useState<IStockPacket | null>(null);
  const [isFullConsumption, setIsFullConsumption] = useState(true);
  const [consumedCarats, setConsumedCarats] = useState(0);
  const [processingCost, setProcessingCost] = useState(0);
  const [processingCurrency, setProcessingCurrency] = useState<'USD' | 'INR'>('INR');
  const [processingExchangeRate, setProcessingExchangeRate] = useState<number>(83.25);
  const [outputRateCurrency, setOutputRateCurrency] = useState<'USD' | 'INR'>('USD');
  const [outputExchangeRate, setOutputExchangeRate] = useState<number>(83.25);
  const [narration, setNarration] = useState('');
  const [outputRows, setOutputRows] = useState<OutputRow[]>([emptyRow()]);

  // View Mode Currency Preview Toggle
  const [viewCurrency, setViewCurrency] = useState<'USD' | 'INR'>('INR');
  const [viewExchangeRate, setViewExchangeRate] = useState<number>(83.25);

  // View Mode
  const [conversionDetails, setConversionDetails] = useState<IStockConversion | null>(null);

  // Query Params
  const [searchParams] = useSearchParams();
  const queryPacketId = searchParams.get('packetId');
  const queryChallanId = searchParams.get('challanId');

  // Load master data
  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      const pkts = await fetchPackets({ companyId });
      if (pkts.success && pkts.data) {
        const rows = (pkts.data.rows || pkts.data || []) as IStockPacket[];
        const available = rows.filter(
          (p) => p.currentStatus === 'AVAILABLE' || p.currentStatus === 'JOB_WORK' || (editMode && p.id === sourcePacketId)
        );
        setPacketsList(available);
        if (queryPacketId && !sourcePacketId) {
          const match = available.find((p) => p.id === Number(queryPacketId));
          if (match) setSourcePacketId(match.id);
        }
      }
      const qals = await fetchQualities({ companyId });
      if (qals.success && qals.data) {
        setQualitiesList(qals.data);
      }
      const shps = await fetchShapes(companyId);
      if (shps.success && shps.data) {
        setShapeOptions(shps.data);
      }
    };
    load();
  }, [companyId, fetchPackets, fetchQualities, fetchShapes, queryPacketId, editMode, sourcePacketId]);

  useEffect(() => {
    if (!companyId) return;
    const handleShortcutSuccess = async () => {
      const res = await fetchQualities({ companyId });
      if (res.success && res.data) {
        setQualitiesList(res.data);
      }
    };
    window.addEventListener('shortcut-master-success', handleShortcutSuccess);
    return () => window.removeEventListener('shortcut-master-success', handleShortcutSuccess);
  }, [companyId, fetchQualities]);

  // Load existing conversion for view or edit mode
  useEffect(() => {
    if (!id || !companyId) return;
    const loadDetails = async () => {
      const res = await fetchConversion({ id: Number(id), companyId });
      if (res.success && res.data) {
        setConversionDetails(res.data);
        if (editMode) {
          const conv = res.data;
          setConversionDate(conv.conversionDate ? new Date(conv.conversionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          setSourcePacketId(conv.sourcePacketId);
          setIsFullConsumption(conv.isFullConsumption);
          setConsumedCarats(Number(conv.consumedCarats) || 0);
          setProcessingCost(Number(conv.processingCost) || 0);
          setNarration(conv.narration || '');

          if (conv.outputItems && conv.outputItems.length > 0) {
            setOutputRows(
              conv.outputItems.map((item: any) => ({
                qualityId: item.outputQualityId || item.qualityId || 0,
                carats: Number(item.carats) || 0,
                pieces: Number(item.pieces) || 1,
                shape: item.shape || '',
                color: item.color || '',
                clarity: item.clarity || '',
                cut: item.cut || '',
                costPerCarat: Number(item.costPerCarat) || 0,
                totalCost: Number(item.totalCost) || 0,
                remarks: item.remarks || '',
                isManualStockId: false,
                stockIdNumber: item.outputPacket?.stockIdNumber || '',
                category: item.outputPacket?.category || 'NON_CERTIFIED',
                polish: item.outputPacket?.polish || '',
                symmetry: item.outputPacket?.symmetry || '',
                lengthMm: item.outputPacket?.lengthMm || '',
                widthMm: item.outputPacket?.widthMm || '',
                depthMm: item.outputPacket?.depthMm || '',
                totalDepthPct: item.outputPacket?.totalDepthPct || '',
                tablePct: item.outputPacket?.tablePct || '',
                certificateType: item.outputPacket?.certificateType || '',
                certificateNumber: item.outputPacket?.certificateNumber || '',
                imageLink: item.outputPacket?.imageLink || '',
                videoLink: item.outputPacket?.videoLink || '',
                isExpanded: true,
              }))
            );
          }
        }
      } else {
        showToast(res.error || 'Failed to load conversion', 'error');
        navigate(LIST_ROUTE);
      }
    };
    loadDetails();
  }, [id, companyId, fetchConversion, editMode, showToast, navigate]);

  // When source packet changes
  useEffect(() => {
    if (!sourcePacketId) {
      setSourcePacket(null);
      return;
    }
    const pkt = packetsList.find((p) => p.id === sourcePacketId) || null;
    setSourcePacket(pkt);
    if (pkt) {
      setConsumedCarats(Number(pkt.caratWeight));
    }
  }, [sourcePacketId, packetsList]);

  // Handlers
  const handleAddRow = () => setOutputRows([...outputRows, emptyRow()]);

  const handleRemoveRow = (idx: number) => {
    if (outputRows.length === 1) return;
    setOutputRows(outputRows.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, key: keyof OutputRow, value: any) => {
    const updated = [...outputRows];
    updated[idx] = { ...updated[idx], [key]: value };
    // Auto-calculate totalCost when carats or costPerCarat change
    if (key === 'carats' || key === 'costPerCarat') {
      const c = Number(updated[idx].carats) || 0;
      const r = Number(updated[idx].costPerCarat) || 0;
      updated[idx].totalCost = c * r;
    }
    setOutputRows(updated);
  };

  // Calculations
  const sourceCarats = sourcePacket ? Number(sourcePacket.caratWeight) : 0;
  const effectiveConsumed = isFullConsumption ? sourceCarats : Number(consumedCarats);
  const totalOutputCarats = outputRows.reduce((sum, r) => sum + (Number(r.carats) || 0), 0);
  const weightLoss = effectiveConsumed - totalOutputCarats;
  const lossPercentage = effectiveConsumed > 0 ? (weightLoss / effectiveConsumed) * 100 : 0;
  const totalOutputCost = outputRows.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !sourcePacketId) {
      showToast('Please select a source stock packet', 'error');
      return;
    }

    for (const row of outputRows) {
      if (!row.qualityId || row.qualityId === 0) {
        showToast('Please select a quality for all output rows', 'error');
        return;
      }
      if (!row.carats || row.carats <= 0) {
        showToast('Each output row must have carats > 0', 'error');
        return;
      }
    }

    if (totalOutputCarats > effectiveConsumed) {
      showToast(`Total output carats (${totalOutputCarats.toFixed(3)}) exceeds consumed carats (${effectiveConsumed.toFixed(3)})`, 'error');
      return;
    }

    const payload = {
      companyId,
      data: {
        sourcePacketId,
        conversionDate,
        isFullConsumption,
        consumedCarats: effectiveConsumed,
        processingCost,
        narration,
        challanVoucherId: queryChallanId ? Number(queryChallanId) : null,
        outputItems: outputRows.map((r) => ({
          qualityId: r.qualityId,
          carats: r.carats,
          pieces: r.pieces,
          shape: r.shape || null,
          color: r.color || null,
          clarity: r.clarity || null,
          cut: r.cut || null,
          costPerCarat: r.costPerCarat,
          totalCost: r.totalCost,
          remarks: r.remarks || null,
          // Full Registration Fields
          isManualStockId: r.isManualStockId,
          stockIdNumber: r.stockIdNumber,
          category: r.category,
          polish: r.polish || null,
          symmetry: r.symmetry || null,
          lengthMm: r.lengthMm !== '' ? Number(r.lengthMm) : null,
          widthMm: r.widthMm !== '' ? Number(r.widthMm) : null,
          depthMm: r.depthMm !== '' ? Number(r.depthMm) : null,
          totalDepthPct: r.totalDepthPct !== '' ? Number(r.totalDepthPct) : null,
          tablePct: r.tablePct !== '' ? Number(r.tablePct) : null,
          certificateType: r.certificateType || null,
          certificateNumber: r.certificateNumber || null,
          imageLink: r.imageLink || null,
          videoLink: r.videoLink || null,
        })),
      },
    };

    const res = editMode && id
      ? await updateConversion({ id: Number(id), companyId, data: payload.data })
      : await createConversion(payload);

    if (res.success) {
      showToast(editMode ? 'Stock conversion updated successfully!' : 'Stock conversion created successfully!', 'success');
      navigate(LIST_ROUTE);
    } else {
      showToast(res.error || 'Failed to save conversion', 'error');
    }
  };

  // ─── VIEW MODE ───────────────────────────────────────────────
  if (viewMode && conversionDetails) {
    const d = conversionDetails;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button variant="ghost" onClick={() => navigate(LIST_ROUTE)}><ArrowLeft size={18} /></Button>
            <RefreshCw size={22} color="var(--color-accent)" />
            <div>
              <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>{d.conversionNumber}</h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>{new Date(d.conversionDate).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Temporary View Currency Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-surface)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>View Currency:</span>
              <select
                value={viewCurrency}
                onChange={(e) => setViewCurrency((e.target.value as 'USD' | 'INR') || 'INR')}
                style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px', fontWeight: 700, background: 'var(--color-surface)' }}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
              {viewCurrency === 'USD' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Rate ($1=₹):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={viewExchangeRate}
                    onChange={(e) => setViewExchangeRate(Number(e.target.value) || 1)}
                    style={{ width: '75px', padding: '3px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px', fontWeight: 600 }}
                  />
                </div>
              ) : null}
            </div>

            <Button
              variant="secondary"
              onClick={() => navigate(`/inventory/stock-conversion/edit/${d.id}`)}
            >
              Edit Conversion
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-lg)' }}>
          {/* Source Info */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Source (Input)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Packet:</strong> {d.sourcePacket?.stockIdNumber || '—'}</div>
              <div><strong>Quality:</strong> {d.sourceQuality?.qualityName || '—'}</div>
              <div><strong>Source Carats:</strong> {Number(d.sourceCarats).toFixed(3)} ct</div>
              <div>
                <strong>Rough Purchase Cost:</strong>{' '}
                {viewCurrency === 'USD'
                  ? `$${(Number(d.sourceCost) / viewExchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : `₹${Number(d.sourceCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </div>
              <div><strong>Consumption:</strong> {d.isFullConsumption ? 'Full' : `Partial (${Number(d.consumedCarats).toFixed(3)} ct used, ${Number(d.remainingCarats).toFixed(3)} ct remaining)`}</div>
            </div>
          </div>

          {/* Yield Summary */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Yield Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Total Output:</strong> {Number(d.totalOutputCarats).toFixed(3)} ct</div>
              <div><strong>Weight Loss:</strong> {Number(d.weightLoss).toFixed(3)} ct ({Number(d.lossPercentage).toFixed(2)}%)</div>
              <div>
                <strong>Job Work / Processing Cost:</strong>{' '}
                {viewCurrency === 'USD'
                  ? `$${(Number(d.processingCost) / viewExchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : `₹${Number(d.processingCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </div>
              {d.narration && <div><strong>Narration:</strong> {d.narration}</div>}
            </div>
          </div>

          {/* Lot Yield & Conversion Profit Analysis */}
          {(() => {
            const totalInputCostInr = Number(d.sourceCost) + Number(d.processingCost);
            const totalOutputValueInr = d.outputItems.reduce((sum, item) => {
              const itemVal = item.targetSaleRate != null && Number(item.targetSaleRate) > 0
                ? Number(item.carats) * Number(item.targetSaleRate)
                : Number(item.totalCost);
              return sum + itemVal;
            }, 0);
            const netProfitInr = totalOutputValueInr - totalInputCostInr;
            const profitMarginPct = totalOutputValueInr > 0 ? (netProfitInr / totalOutputValueInr) * 100 : 0;
            const isProfit = netProfitInr >= 0;

            const totalInputDisp = viewCurrency === 'USD' ? `$${(totalInputCostInr / viewExchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${totalInputCostInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            const totalOutputDisp = viewCurrency === 'USD' ? `$${(totalOutputValueInr / viewExchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${totalOutputValueInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            const netProfitDisp = viewCurrency === 'USD' ? `$${(Math.abs(netProfitInr) / viewExchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${Math.abs(netProfitInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

            return (
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>💎 Lot Yield & Profit Analysis</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><strong>Total Input Investment:</strong> {totalInputDisp} <span style={{ fontSize: '11px', opacity: 0.7 }}>(Rough + Job Work)</span></div>
                  <div><strong>Total Output Valuation:</strong> {totalOutputDisp}</div>
                  <div>
                    <strong>Net Conversion Profit:</strong>{' '}
                    <span style={{ color: isProfit ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                      {isProfit ? '+' : '-'}{netProfitDisp} ({profitMarginPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Output Items Table */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Output Diamonds</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                {['#', 'Packet ID', 'Quality', 'Carats', 'Pcs', 'Shape', 'Color', 'Clarity', `Allocated Cost/${viewCurrency === 'USD' ? '$' : 'Ct'}`, `Allocated Cost (${viewCurrency === 'USD' ? '$' : '₹'})`, `Predicted Asking Rate (${viewCurrency === 'USD' ? '$/Ct' : '₹/Ct'})`, `Target Valuation (${viewCurrency === 'USD' ? '$' : '₹'})`].map((h) => (
                  <th key={h} style={{ padding: '8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.outputItems.map((item) => {
                const targetRateInr = item.targetSaleRate != null && Number(item.targetSaleRate) > 0 ? Number(item.targetSaleRate) : Number(item.costPerCarat);
                const targetValInr = Number(item.carats) * targetRateInr;

                const costPerCtDisp = viewCurrency === 'USD' ? Number(item.costPerCarat) / viewExchangeRate : Number(item.costPerCarat);
                const totalCostDisp = viewCurrency === 'USD' ? Number(item.totalCost) / viewExchangeRate : Number(item.totalCost);
                const targetRateDisp = viewCurrency === 'USD' ? targetRateInr / viewExchangeRate : targetRateInr;
                const targetValDisp = viewCurrency === 'USD' ? targetValInr / viewExchangeRate : targetValInr;

                const sym = viewCurrency === 'USD' ? '$' : '₹';
                const loc = viewCurrency === 'USD' ? 'en-US' : 'en-IN';

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px' }}>{item.rowNumber}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                      <a onClick={() => navigate(`/inventory/stock/${item.outputPacketId}`)} style={{ color: 'var(--color-accent)', cursor: 'pointer' }}>
                        {item.outputPacket?.stockIdNumber || `#${item.outputPacketId}`}
                      </a>
                    </td>
                    <td style={{ padding: '8px' }}>{item.outputQuality?.qualityName || '—'}</td>
                    <td style={{ padding: '8px' }}>{Number(item.carats).toFixed(3)}</td>
                    <td style={{ padding: '8px' }}>{item.pieces}</td>
                    <td style={{ padding: '8px' }}>{item.shape || '—'}</td>
                    <td style={{ padding: '8px' }}>{item.color || '—'}</td>
                    <td style={{ padding: '8px' }}>{item.clarity || '—'}</td>
                    <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{sym}{costPerCtDisp.toLocaleString(loc, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{sym}{totalCostDisp.toLocaleString(loc, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#0284c7' }}>{sym}{targetRateDisp.toLocaleString(loc, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px', fontWeight: 700, color: 'var(--color-primary)' }}>{sym}{targetValDisp.toLocaleString(loc, { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── CREATE MODE ─────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" onClick={() => navigate(LIST_ROUTE)}><ArrowLeft size={18} /></Button>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
          New Stock Quality Conversion
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* ── SOURCE INPUT ────────────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Source (Input Packet)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Input
              label="Conversion Date *"
              type="date"
              value={conversionDate}
              onChange={(e) => setConversionDate(e.target.value)}
            />

            <Select
              label="Source Stock Packet *"
              placeholder="Select stock packet..."
              searchable
              value={sourcePacketId ? String(sourcePacketId) : undefined}
              onChange={(v) => setSourcePacketId(v ? Number(v) : null)}
              options={packetsList.map((p) => ({
                value: String(p.id),
                label: `${p.stockIdNumber} — ${p.quality?.qualityName || ''} (${Number(p.caratWeight).toFixed(3)} ct)`,
              }))}
            />

            <Input
              label="Quality (Auto)"
              value={sourcePacket?.quality?.qualityName || '—'}
              disabled
            />
          </div>

          {sourcePacket && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px', padding: '12px', background: 'var(--color-row-alt)', borderRadius: 'var(--radius-md)' }}>
              <div><strong style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>CARATS</strong><br />{Number(sourcePacket.caratWeight).toFixed(3)} ct</div>
              <div><strong style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>TOTAL COST</strong><br />₹{Number(sourcePacket.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div><strong style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>STATUS</strong><br />{sourcePacket.currentStatus}</div>
              <div><strong style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>SHAPE</strong><br />{sourcePacket.shape || '—'}</div>
            </div>
          )}

          {/* Consumption Mode */}
          {sourcePacket && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="radio" checked={isFullConsumption} onChange={() => setIsFullConsumption(true)} style={{ accentColor: 'var(--color-accent)' }} />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Full Consumption (use entire packet)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="radio" checked={!isFullConsumption} onChange={() => setIsFullConsumption(false)} style={{ accentColor: 'var(--color-accent)' }} />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Partial Consumption (some carats remain as rough)</span>
                </label>
              </div>

              {!isFullConsumption && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '400px' }}>
                  <Input
                    label="Consumed Carats *"
                    type="number"
                    step="0.001"
                    value={consumedCarats}
                    onChange={(e) => setConsumedCarats(Number(e.target.value))}
                  />
                  <Input
                    label="Remaining Carats"
                    value={(sourceCarats - consumedCarats).toFixed(3)}
                    disabled
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── OPTIONAL JOB WORK REF ──────────────────────── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Processing Details (Optional)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr 2fr', gap: '16px', alignItems: 'flex-start' }}>
            <Select
              label="Processing Currency *"
              value={processingCurrency}
              onChange={(v) => setProcessingCurrency((v as 'USD' | 'INR') || 'INR')}
              options={[
                { value: 'INR', label: 'INR (₹)' },
                { value: 'USD', label: 'USD ($)' },
              ]}
            />
            <Input
              label={`Processing Cost (${processingCurrency === 'USD' ? '$' : '₹'})`}
              type="number"
              step="0.01"
              value={processingCost}
              onChange={(e) => setProcessingCost(Number(e.target.value))}
            />
            {processingCurrency === 'USD' ? (
              <Input
                label="Exchange Rate ($1 = ₹) *"
                type="number"
                step="0.01"
                value={processingExchangeRate}
                onChange={(e) => setProcessingExchangeRate(Number(e.target.value) || 1)}
                hint={`Cost in ₹: ₹${(processingCost * processingExchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              />
            ) : null}
            <Input
              label="Narration / Remarks"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g., Polished by Vipul karigar"
            />
          </div>
        </div>

        {/* ── OUTPUT ROWS ────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>Output Diamonds</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-row-alt)', padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Target Rate Currency:</span>
                <select
                  value={outputRateCurrency}
                  onChange={(e) => setOutputRateCurrency((e.target.value as 'USD' | 'INR') || 'USD')}
                  style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px', fontWeight: 600, background: 'var(--color-surface)' }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                </select>
                {outputRateCurrency === 'USD' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Rate ($1=₹):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={outputExchangeRate}
                      onChange={(e) => setOutputExchangeRate(Number(e.target.value) || 1)}
                      style={{ width: '80px', padding: '4px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px', fontWeight: 600, background: 'var(--color-surface)' }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={handleAddRow} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={16} /> Add Row
            </Button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '35px' }}>#</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', minWidth: '220px' }}>Quality *</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '110px' }}>Carats *</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '90px' }}>Pieces</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', minWidth: '180px' }}>
                    Predicted Target Rate ({outputRateCurrency === 'USD' ? '$/Ct' : '₹/Ct'}) *
                  </th>
                  <th style={{ padding: '8px', textAlign: 'right', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '150px' }}>Target Valuation</th>
                  <th style={{ padding: '8px', width: '45px' }}></th>
                </tr>
              </thead>
              <tbody>
                {outputRows.map((row, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ padding: '8px 8px 4px 8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '35px' }}>#</th>
                        <th style={{ padding: '8px 8px 4px 8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', minWidth: '220px' }}>Quality *</th>
                        <th style={{ padding: '8px 8px 4px 8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '110px' }}>Carats *</th>
                        <th style={{ padding: '8px 8px 4px 8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '90px' }}>Pieces</th>
                        <th style={{ padding: '8px 8px 4px 8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', minWidth: '180px' }}>Predicted Target Rate (₹/Ct) *</th>
                        <th style={{ padding: '8px 8px 4px 8px', textAlign: 'right', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '130px' }}>Target Valuation</th>
                        <th style={{ padding: '8px 8px 4px 8px', width: '45px' }}></th>
                      </tr>
                    )}
                    <tr style={{ borderBottom: 'none' }}>
                      <td style={{ padding: '6px', width: '35px', color: 'var(--color-text-secondary)' }}>{idx + 1}</td>
                      <td style={{ padding: '6px', minWidth: '220px' }}>
                        <Select
                          searchable
                          placeholder="Quality"
                          value={row.qualityId ? String(row.qualityId) : undefined}
                          onChange={(v) => handleRowChange(idx, 'qualityId', Number(v))}
                          options={qualitiesList.map((q) => ({ value: String(q.id), label: q.qualityName }))}
                          shortcutType="quality"
                        />
                      </td>
                      <td style={{ padding: '6px', width: '110px' }}>
                        <Input type="number" step="0.001" value={row.carats || ''} onChange={(e) => handleRowChange(idx, 'carats', Number(e.target.value))} placeholder="0" />
                      </td>
                      <td style={{ padding: '6px', width: '90px' }}>
                        <Input type="number" value={row.pieces || ''} onChange={(e) => handleRowChange(idx, 'pieces', Number(e.target.value))} placeholder="1" />
                      </td>
                      <td style={{ padding: '6px', width: '120px' }}>
                        <Input type="number" step="0.01" value={row.costPerCarat || ''} onChange={(e) => handleRowChange(idx, 'costPerCarat', Number(e.target.value))} placeholder="0" />
                      </td>
                      <td style={{ padding: '6px', width: '150px', textAlign: 'right', fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                        {outputRateCurrency === 'USD' ? '$' : '₹'}{Number(row.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {outputRateCurrency === 'USD' && outputExchangeRate > 0 ? (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            (₹{(Number(row.totalCost || 0) * outputExchangeRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: '6px', width: '45px' }}>
                        <Button type="button" variant="ghost" onClick={() => handleRemoveRow(idx)} disabled={outputRows.length === 1}>
                          <Trash2 size={16} color="var(--color-danger)" />
                        </Button>
                      </td>
                    </tr>

                    {/* Registration Details Panel */}
                    {row.isExpanded && (
                      <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-background-subtle, #f8fafc)' }}>
                        <td colSpan={12} style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent)' }}>
                              Stock Packet Registration Details
                            </span>
                            
                            {/* Row 1: Manual ID, Category, Shape, Color, Clarity, Cut */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.1fr 1fr 1fr 1fr', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={row.isManualStockId}
                                    onChange={(e) => handleRowChange(idx, 'isManualStockId', e.target.checked)}
                                  />
                                  Manual ID
                                </label>
                                {row.isManualStockId ? (
                                  <Input
                                    placeholder="Enter custom ID"
                                    value={row.stockIdNumber}
                                    onChange={(e) => handleRowChange(idx, 'stockIdNumber', e.target.value)}
                                  />
                                ) : (
                                  <div style={{ padding: '7px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: '11.5px', color: 'var(--color-accent)', minHeight: '34px', display: 'flex', alignItems: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {row.stockIdNumber ? row.stockIdNumber : 'Auto: DM/2026/000002'}
                                  </div>
                                )}
                              </div>

                              <Select
                                label="Category"
                                placeholder="Select..."
                                value={row.category}
                                onChange={(v) => handleRowChange(idx, 'category', v)}
                                options={[
                                  { value: 'NON_CERTIFIED', label: 'Non-Certified' },
                                  { value: 'CERTIFIED', label: 'Certified' },
                                ]}
                              />

                              <Combobox
                                label="Shape"
                                value={row.shape}
                                onChange={(v) => handleRowChange(idx, 'shape', v)}
                                options={shapeOptions}
                                placeholder="Select or type shape"
                                maxVisibleItems={5}
                              />

                              <Input
                                label="Color"
                                placeholder="e.g. D"
                                value={row.color}
                                onChange={(e) => handleRowChange(idx, 'color', e.target.value)}
                              />

                              <Input
                                label="Clarity"
                                placeholder="E.G. VS1"
                                value={row.clarity}
                                style={{ textTransform: 'uppercase' }}
                                onChange={(e) => handleRowChange(idx, 'clarity', e.target.value.toUpperCase())}
                              />

                              <Input
                                label="Cut"
                                placeholder="E.G. EX"
                                value={row.cut}
                                style={{ textTransform: 'uppercase' }}
                                onChange={(e) => handleRowChange(idx, 'cut', e.target.value.toUpperCase())}
                              />
                            </div>

                            {/* Row 2: Polish, Symmetry, Length, Width, Depth, Depth % */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                              <Input
                                label="Polish"
                                placeholder="E.G. EX"
                                value={row.polish}
                                style={{ textTransform: 'uppercase' }}
                                onChange={(e) => handleRowChange(idx, 'polish', e.target.value.toUpperCase())}
                              />

                              <Input
                                label="Symmetry"
                                placeholder="E.G. EX"
                                value={row.symmetry}
                                style={{ textTransform: 'uppercase' }}
                                onChange={(e) => handleRowChange(idx, 'symmetry', e.target.value.toUpperCase())}
                              />

                              <Input
                                label="Length (mm)"
                                type="number"
                                step="0.01"
                                value={row.lengthMm}
                                onChange={(e) => handleRowChange(idx, 'lengthMm', e.target.value)}
                              />

                              <Input
                                label="Width (mm)"
                                type="number"
                                step="0.01"
                                value={row.widthMm}
                                onChange={(e) => handleRowChange(idx, 'widthMm', e.target.value)}
                              />

                              <Input
                                label="Depth (mm)"
                                type="number"
                                step="0.01"
                                value={row.depthMm}
                                onChange={(e) => handleRowChange(idx, 'depthMm', e.target.value)}
                              />

                              <Input
                                label="Depth %"
                                type="number"
                                step="0.1"
                                value={row.totalDepthPct}
                                onChange={(e) => handleRowChange(idx, 'totalDepthPct', e.target.value)}
                              />
                            </div>

                            {/* Row 3: Table %, Certificate Type, Certificate Number, Image URL, Video URL */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr 1.5fr', gap: '12px' }}>
                              <Input
                                label="Table %"
                                type="number"
                                step="0.1"
                                value={row.tablePct}
                                onChange={(e) => handleRowChange(idx, 'tablePct', e.target.value)}
                              />

                              <Input
                                label="Certificate Type"
                                placeholder="e.g. GIA"
                                value={row.certificateType}
                                onChange={(e) => handleRowChange(idx, 'certificateType', e.target.value)}
                              />

                              <Input
                                label="Certificate Number"
                                placeholder="e.g. 12345"
                                value={row.certificateNumber}
                                onChange={(e) => handleRowChange(idx, 'certificateNumber', e.target.value)}
                              />

                              <Input
                                label="Image URL"
                                placeholder="e.g. http://..."
                                value={row.imageLink}
                                onChange={(e) => handleRowChange(idx, 'imageLink', e.target.value)}
                              />

                              <Input
                                label="Video URL"
                                placeholder="e.g. http://..."
                                value={row.videoLink}
                                onChange={(e) => handleRowChange(idx, 'videoLink', e.target.value)}
                              />
                            </div>

                            {/* ── Advanced Diamond Details (Collapsible) ── */}
                            <div
                              onClick={() => {
                                const el = document.getElementById(`conv-adv-${idx}`);
                                if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                                const icon = document.getElementById(`conv-adv-icon-${idx}`);
                                if (icon) icon.textContent = icon.textContent === '▼' ? '▲' : '▼';
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', marginTop: '8px', marginBottom: '4px' }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Advanced Diamond Details</span>
                              <span id={`conv-adv-icon-${idx}`} style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>▼</span>
                            </div>
                            <div id={`conv-adv-${idx}`} style={{ display: 'none' }}>
                              {/* Fluorescence & Optical */}
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', marginTop: '8px' }}>Fluorescence & Optical</span>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Fluorescence" placeholder="e.g. NONE" value={row.fluorescenceIntensity ?? ''} onChange={(e) => handleRowChange(idx, 'fluorescenceIntensity', e.target.value.toUpperCase())} />
                                <Input label="Fluor Color" placeholder="e.g. BLUE" value={row.fluorescenceColor ?? ''} onChange={(e) => handleRowChange(idx, 'fluorescenceColor', e.target.value.toUpperCase())} />
                                <Input label="Eye Clean" placeholder="e.g. YES" value={row.eyeClean ?? ''} onChange={(e) => handleRowChange(idx, 'eyeClean', e.target.value.toUpperCase())} />
                                <Input label="Hearts & Arrows" placeholder="e.g. YES" value={row.heartsAndArrows ?? ''} onChange={(e) => handleRowChange(idx, 'heartsAndArrows', e.target.value.toUpperCase())} />
                                <Input label="Shade" placeholder="e.g. NONE" value={row.shade ?? ''} onChange={(e) => handleRowChange(idx, 'shade', e.target.value.toUpperCase())} />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Milky" placeholder="e.g. NONE" value={row.milky ?? ''} onChange={(e) => handleRowChange(idx, 'milky', e.target.value.toUpperCase())} />
                                <Input label="Tinge" placeholder="e.g. NONE" value={row.tinge ?? ''} onChange={(e) => handleRowChange(idx, 'tinge', e.target.value.toUpperCase())} />
                                <Input label="Lustre" placeholder="e.g. EXCELLENT" value={row.lustre ?? ''} onChange={(e) => handleRowChange(idx, 'lustre', e.target.value.toUpperCase())} />
                                <Input label="Rap Price ($/ct)" type="number" step="0.01" value={row.rapPricePerCarat ?? ''} onChange={(e) => handleRowChange(idx, 'rapPricePerCarat', e.target.value)} />
                                <Input label="Rap Discount %" type="number" step="0.01" value={row.rapDiscountPct ?? ''} onChange={(e) => handleRowChange(idx, 'rapDiscountPct', e.target.value)} />
                              </div>

                              {/* Girdle, Crown & Pavilion */}
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Girdle, Crown & Pavilion</span>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Crown Angle" type="number" step="0.01" value={row.crownAngle ?? ''} onChange={(e) => handleRowChange(idx, 'crownAngle', e.target.value)} />
                                <Input label="Crown Height" type="number" step="0.01" value={row.crownHeight ?? ''} onChange={(e) => handleRowChange(idx, 'crownHeight', e.target.value)} />
                                <Input label="Pavilion Angle" type="number" step="0.01" value={row.pavilionAngle ?? ''} onChange={(e) => handleRowChange(idx, 'pavilionAngle', e.target.value)} />
                                <Input label="Pavilion Depth" type="number" step="0.01" value={row.pavilionDepth ?? ''} onChange={(e) => handleRowChange(idx, 'pavilionDepth', e.target.value)} />
                                <Input label="Girdle Min" placeholder="e.g. THIN" value={row.girdleMin ?? ''} onChange={(e) => handleRowChange(idx, 'girdleMin', e.target.value.toUpperCase())} />
                                <Input label="Girdle Max" placeholder="e.g. THICK" value={row.girdleMax ?? ''} onChange={(e) => handleRowChange(idx, 'girdleMax', e.target.value.toUpperCase())} />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Girdle Condition" placeholder="e.g. FACETED" value={row.girdleCondition ?? ''} onChange={(e) => handleRowChange(idx, 'girdleCondition', e.target.value.toUpperCase())} />
                                <Input label="Culet Size" placeholder="e.g. NONE" value={row.culetSize ?? ''} onChange={(e) => handleRowChange(idx, 'culetSize', e.target.value.toUpperCase())} />
                                <Input label="Culet Condition" placeholder="e.g. POINTED" value={row.culetCondition ?? ''} onChange={(e) => handleRowChange(idx, 'culetCondition', e.target.value.toUpperCase())} />
                                <Input label="Table Open" value={row.tableOpen ?? ''} onChange={(e) => handleRowChange(idx, 'tableOpen', e.target.value.toUpperCase())} />
                                <Input label="Crown Open" value={row.crownOpen ?? ''} onChange={(e) => handleRowChange(idx, 'crownOpen', e.target.value.toUpperCase())} />
                                <Input label="Girdle Open" value={row.girdleOpen ?? ''} onChange={(e) => handleRowChange(idx, 'girdleOpen', e.target.value.toUpperCase())} />
                              </div>

                              {/* Inclusions, Treatment & Origin */}
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Inclusions, Treatment & Origin</span>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Table Inclusion" value={row.tableInclusion ?? ''} onChange={(e) => handleRowChange(idx, 'tableInclusion', e.target.value.toUpperCase())} />
                                <Input label="Side Inclusion" value={row.sideInclusion ?? ''} onChange={(e) => handleRowChange(idx, 'sideInclusion', e.target.value.toUpperCase())} />
                                <Input label="Treatment" placeholder="e.g. NONE" value={row.treatment ?? ''} onChange={(e) => handleRowChange(idx, 'treatment', e.target.value.toUpperCase())} />
                                <Input label="Origin" placeholder="e.g. INDIA" value={row.origin ?? ''} onChange={(e) => handleRowChange(idx, 'origin', e.target.value.toUpperCase())} />
                                <Input label="Inscription" value={row.inscription ?? ''} onChange={(e) => handleRowChange(idx, 'inscription', e.target.value)} />
                                <Input label="Key to Symbols" value={row.keyToSymbols ?? ''} onChange={(e) => handleRowChange(idx, 'keyToSymbols', e.target.value)} />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <Input label="Fancy Color" value={row.fancyColor ?? ''} onChange={(e) => handleRowChange(idx, 'fancyColor', e.target.value.toUpperCase())} />
                                <Input label="Fancy Intensity" value={row.fancyColorIntensity ?? ''} onChange={(e) => handleRowChange(idx, 'fancyColorIntensity', e.target.value.toUpperCase())} />
                                <Input label="Fancy Overtone" value={row.fancyColorOvertone ?? ''} onChange={(e) => handleRowChange(idx, 'fancyColorOvertone', e.target.value.toUpperCase())} />
                                <Input label="Certificate URL" value={row.certificateUrl ?? ''} onChange={(e) => handleRowChange(idx, 'certificateUrl', e.target.value)} />
                                <Input label="Web URL" value={row.webUrl ?? ''} onChange={(e) => handleRowChange(idx, 'webUrl', e.target.value)} />
                                <Input label="Comment" value={row.diamondComment ?? ''} onChange={(e) => handleRowChange(idx, 'diamondComment', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── YIELD SUMMARY ──────────────────────────────── */}
        {sourcePacket && (
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-row-alt) 100%)' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Yield Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Input</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{effectiveConsumed.toFixed(3)} ct</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Output</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success, #22c55e)' }}>{totalOutputCarats.toFixed(3)} ct</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Weight Loss</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: weightLoss < 0 ? 'var(--color-danger)' : 'var(--color-warning, #f59e0b)' }}>{weightLoss.toFixed(3)} ct ({lossPercentage.toFixed(2)}%)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Output Cost</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>₹{totalOutputCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Processing Cost</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>₹{processingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── SUBMIT ─────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button type="button" variant="secondary" onClick={() => navigate(LIST_ROUTE)}>Cancel</Button>
          <Button type="submit" variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} /> Convert Stock
          </Button>
        </div>
      </form>
    </div>
  );
};
