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
  isExpanded: true,
});

export const StockConversionFormPage: React.FC<{ viewMode?: boolean }> = ({ viewMode = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId } = useActiveCompany();

  // IPC
  const { invoke: fetchPackets } = useIpc<any>('stock:list');
  const { invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const { invoke: createConversion } = useIpc('stock-conversion:create');
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
  const [narration, setNarration] = useState('');
  const [outputRows, setOutputRows] = useState<OutputRow[]>([emptyRow()]);

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
          (p) => p.currentStatus === 'AVAILABLE' || p.currentStatus === 'JOB_WORK'
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
  }, [companyId, fetchPackets, fetchQualities, fetchShapes, queryPacketId]);

  // Load existing conversion for view mode
  useEffect(() => {
    if (!id || !companyId) return;
    const loadDetails = async () => {
      const res = await fetchConversion({ id: Number(id), companyId });
      if (res.success && res.data) {
        setConversionDetails(res.data);
      } else {
        showToast(res.error || 'Failed to load conversion', 'error');
        navigate(LIST_ROUTE);
      }
    };
    loadDetails();
  }, [id, companyId, fetchConversion, showToast, navigate]);

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

    const res = await createConversion(payload);
    if (res.success) {
      showToast('Stock conversion created successfully!', 'success');
      navigate(LIST_ROUTE);
    } else {
      showToast(res.error || 'Failed to create conversion', 'error');
    }
  };

  // ─── VIEW MODE ───────────────────────────────────────────────
  if (viewMode && conversionDetails) {
    const d = conversionDetails;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => navigate(LIST_ROUTE)}><ArrowLeft size={18} /></Button>
          <RefreshCw size={22} color="var(--color-accent)" />
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>{d.conversionNumber}</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>{new Date(d.conversionDate).toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
          {/* Source Info */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Source (Input)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Packet:</strong> {d.sourcePacket?.stockIdNumber || '—'}</div>
              <div><strong>Quality:</strong> {d.sourceQuality?.qualityName || '—'}</div>
              <div><strong>Source Carats:</strong> {Number(d.sourceCarats).toFixed(3)} ct</div>
              <div><strong>Source Cost:</strong> ₹{Number(d.sourceCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div><strong>Consumption:</strong> {d.isFullConsumption ? 'Full' : `Partial (${Number(d.consumedCarats).toFixed(3)} ct used, ${Number(d.remainingCarats).toFixed(3)} ct remaining)`}</div>
            </div>
          </div>

          {/* Yield Summary */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Yield Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Total Output:</strong> {Number(d.totalOutputCarats).toFixed(3)} ct</div>
              <div><strong>Weight Loss:</strong> {Number(d.weightLoss).toFixed(3)} ct ({Number(d.lossPercentage).toFixed(2)}%)</div>
              <div><strong>Processing Cost:</strong> ₹{Number(d.processingCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              {d.narration && <div><strong>Narration:</strong> {d.narration}</div>}
            </div>
          </div>
        </div>

        {/* Output Items Table */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Output Diamonds</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                {['#', 'Packet ID', 'Quality', 'Carats', 'Pcs', 'Shape', 'Color', 'Clarity', 'Cost/Ct', 'Total Cost'].map((h) => (
                  <th key={h} style={{ padding: '8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.outputItems.map((item) => (
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
                  <td style={{ padding: '8px' }}>₹{Number(item.costPerCarat).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '8px' }}>₹{Number(item.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Processing / Labour Cost"
              type="number"
              step="0.01"
              value={processingCost}
              onChange={(e) => setProcessingCost(Number(e.target.value))}
            />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>Output Diamonds</h2>
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
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '120px' }}>Rate *</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '130px' }}>Net Amount</th>
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
                        <th style={{ padding: '8px 8px 4px 8px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '120px' }}>Rate *</th>
                        <th style={{ padding: '8px 8px 4px 8px', textAlign: 'right', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', width: '130px' }}>Net Amount</th>
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
                      <td style={{ padding: '6px', width: '130px', textAlign: 'right', fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                        ₹{Number(row.totalCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
