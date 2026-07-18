// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Detail Page (view + timeline)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Gem } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Badge } from '../../components/ui';
import { IStockMovement, IStockPacket, STOCK_STATUS_LABELS, STOCK_STATUS_BADGE_VARIANT, EDITABLE_STOCK_STATUSES } from './stock.types';

const LIST_ROUTE = '/inventory/stock';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-body)', color: 'var(--color-primary)' }}>{value ?? '—'}</span>
    </div>
  );
}

export const StockDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId, isReady } = useActiveCompany();

  const { data: packet, loading, invoke: fetchStock } = useIpc<IStockPacket>('stock:get');
  const { data: timeline, invoke: fetchTimeline } = useIpc<IStockMovement[]>('stock:timeline');

  const refresh = useCallback(async () => {
    if (!companyId || !id) return;
    await Promise.all([
      fetchStock({ id: Number(id), companyId }),
      fetchTimeline({ id: Number(id), companyId }),
    ]);
  }, [companyId, id, fetchStock, fetchTimeline]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  if (loading && !packet) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Loading stock packet...</p>;
  }

  if (!packet) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Stock packet not found.</p>;
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => navigate(LIST_ROUTE)}><ArrowLeft size={18} /></Button>
          <Gem size={22} color="var(--color-accent)" />
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
              {packet.stockIdNumber}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {packet.quality?.qualityName} · {Number(packet.caratWeight).toFixed(3)} ct
            </p>
          </div>
        </div>
        {EDITABLE_STOCK_STATUSES.includes(packet.currentStatus) ? (
          <Button variant="primary" onClick={() => navigate(`/inventory/stock/edit/${packet.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit2 size={16} /> Edit
          </Button>
        ) : (
          <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>
            Editing disabled for {STOCK_STATUS_LABELS[packet.currentStatus].toLowerCase()} stock
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Status" value={<Badge variant={STOCK_STATUS_BADGE_VARIANT[packet.currentStatus]}>{STOCK_STATUS_LABELS[packet.currentStatus]}</Badge>} />
              <DetailRow label="Category" value={packet.category === 'CERTIFIED' ? 'Certified' : 'Non-Certified'} />
              <DetailRow label="Registration" value={new Date(packet.registrationDate).toLocaleDateString('en-IN')} />
              <DetailRow label="Carat Weight" value={packet.caratWeight != null ? `${Number(packet.caratWeight).toFixed(3)} ct` : '—'} />
              <DetailRow label="Shape" value={packet.shape} />
              <DetailRow label="Color" value={packet.color} />
              <DetailRow label="Clarity" value={packet.clarity} />
              <DetailRow label="Cut" value={packet.cut} />
              <DetailRow label="Polish" value={packet.polish} />
              <DetailRow label="Symmetry" value={packet.symmetry} />
              <DetailRow label="Pieces" value={packet.pieceCount === 0 ? 'Not Counted' : packet.pieceCount} />
              <DetailRow label="Remarks" value={packet.currentLocation} />
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Measurements & Certification</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Length" value={packet.lengthMm != null ? `${Number(packet.lengthMm).toFixed(2)} mm` : null} />
              <DetailRow label="Width" value={packet.widthMm != null ? `${Number(packet.widthMm).toFixed(2)} mm` : null} />
              <DetailRow label="Depth" value={packet.depthMm != null ? `${Number(packet.depthMm).toFixed(2)} mm` : null} />
              <DetailRow label="Total Depth %" value={packet.totalDepthPct != null ? `${Number(packet.totalDepthPct).toFixed(2)}%` : null} />
              <DetailRow label="Table %" value={packet.tablePct != null ? `${Number(packet.tablePct).toFixed(2)}%` : null} />
              <DetailRow label="Cert Type" value={packet.certificateType} />
              <DetailRow label="Cert Number" value={packet.certificateNumber} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Media</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <DetailRow
                label="Image Link"
                value={
                  packet.imageLink ? (
                    <a href={packet.imageLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
                      {packet.imageLink}
                    </a>
                  ) : null
                }
              />
              {packet.imageLink && (
                <img
                  src={packet.imageLink}
                  alt={`${packet.stockIdNumber} preview`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    objectFit: 'contain',
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <DetailRow
                label="Video Link"
                value={
                  packet.videoLink ? (
                    <a href={packet.videoLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
                      {packet.videoLink}
                    </a>
                  ) : null
                }
              />
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Valuation</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <DetailRow label="Cost / Carat" value={`₹ ${Number(packet.costPerCarat).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
              <DetailRow label="Total Cost" value={`₹ ${Number(packet.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>
              Lifecycle Timeline
            </h2>
            {!timeline?.length ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-label)' }}>No movements recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {timeline.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-row-alt)',
                      borderLeft: '3px solid var(--color-accent)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-label)' }}>
                        {m.movementType.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>
                        {new Date(m.movementDate).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>
                      {STOCK_STATUS_LABELS[m.previousStatus]} → {STOCK_STATUS_LABELS[m.newStatus]}
                    </div>
                    {m.remarks && (
                      <div style={{ fontSize: 'var(--text-small)', marginTop: '4px' }}>{m.remarks}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
