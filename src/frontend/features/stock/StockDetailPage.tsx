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

          {/* Lineage / Origin Card (shows if converted from Rough) */}
          {packet.sourcePacket && (
            <div style={{ ...cardStyle, borderLeft: '4px solid var(--color-accent)' }}>
              <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔗 Origin / Lineage (Converted Stock)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <DetailRow
                  label="Source Packet"
                  value={
                    <a
                      onClick={() => navigate(`/inventory/stock/${packet.sourcePacket?.id}`)}
                      style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {packet.sourcePacket.stockIdNumber}
                    </a>
                  }
                />
                <DetailRow label="Original Quality" value={packet.sourcePacket.quality?.qualityName || '—'} />
                <DetailRow label="Original Weight" value={`${Number(packet.sourcePacket.caratWeight).toFixed(3)} ct`} />
                <DetailRow label="Source Status" value={packet.sourcePacket.currentStatus} />
                {packet.sourceTransformId && (
                  <DetailRow
                    label="Conversion Record"
                    value={
                      <a
                        onClick={() => navigate(`/inventory/stock-conversion/${packet.sourceTransformId}`)}
                        style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}
                      >
                        View Conversion #{packet.sourceTransformId}
                      </a>
                    }
                  />
                )}
              </div>
            </div>
          )}


          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Measurements & Certification</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Measurements" value={packet.measurements || (packet.lengthMm && packet.widthMm && packet.depthMm ? `${Number(packet.lengthMm).toFixed(2)}x${Number(packet.widthMm).toFixed(2)}x${Number(packet.depthMm).toFixed(2)}` : null)} />
              <DetailRow label="Length" value={packet.lengthMm != null ? `${Number(packet.lengthMm).toFixed(2)} mm` : null} />
              <DetailRow label="Width" value={packet.widthMm != null ? `${Number(packet.widthMm).toFixed(2)} mm` : null} />
              <DetailRow label="Depth" value={packet.depthMm != null ? `${Number(packet.depthMm).toFixed(2)} mm` : null} />
              <DetailRow label="Total Depth %" value={packet.totalDepthPct != null ? `${Number(packet.totalDepthPct).toFixed(2)}%` : null} />
              <DetailRow label="Table %" value={packet.tablePct != null ? `${Number(packet.tablePct).toFixed(2)}%` : null} />
              <DetailRow label="Cert Type" value={packet.certificateType} />
              <DetailRow label="Cert Number" value={packet.certificateNumber} />
              {packet.certificateUrl && <DetailRow label="Certificate URL" value={<a href={packet.certificateUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.certificateUrl}</a>} />}
              {packet.inscription && <DetailRow label="Laser Inscription" value={packet.inscription} />}
            </div>
          </div>

          {/* Fluorescence & Optical — only show if at least one field has a value */}
          {/* Fluorescence & Optical */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Fluorescence & Optical</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Fluorescence" value={packet.fluorescenceIntensity} />
              <DetailRow label="Fluor Color" value={packet.fluorescenceColor} />
              <DetailRow label="Eye Clean" value={packet.eyeClean} />
              <DetailRow label="Hearts & Arrows" value={packet.heartsAndArrows} />
              <DetailRow label="Shade" value={packet.shade} />
              <DetailRow label="Milky" value={packet.milky} />
              <DetailRow label="Tinge" value={packet.tinge} />
              <DetailRow label="Lustre" value={packet.lustre} />
              <DetailRow label="Rap Price" value={packet.rapPricePerCarat != null ? `$ ${Number(packet.rapPricePerCarat).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null} />
              <DetailRow label="Rap Discount" value={packet.rapDiscountPct != null ? `${Number(packet.rapDiscountPct).toFixed(2)}%` : null} />
            </div>
          </div>

          {/* Girdle, Crown & Pavilion */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Girdle, Crown & Pavilion</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Crown Angle" value={packet.crownAngle != null ? `${Number(packet.crownAngle).toFixed(2)}°` : null} />
              <DetailRow label="Crown Height" value={packet.crownHeight != null ? `${Number(packet.crownHeight).toFixed(2)}%` : null} />
              <DetailRow label="Pavilion Angle" value={packet.pavilionAngle != null ? `${Number(packet.pavilionAngle).toFixed(2)}°` : null} />
              <DetailRow label="Pavilion Depth" value={packet.pavilionDepth != null ? `${Number(packet.pavilionDepth).toFixed(2)}%` : null} />
              <DetailRow label="Girdle Thin" value={packet.girdleMin} />
              <DetailRow label="Girdle Thick" value={packet.girdleMax} />
              <DetailRow label="Girdle %" value={packet.girdlePct != null ? `${Number(packet.girdlePct).toFixed(2)}%` : null} />
              <DetailRow label="Girdle Condition" value={packet.girdleCondition} />
              <DetailRow label="Culet Size" value={packet.culetSize} />
              <DetailRow label="Culet Condition" value={packet.culetCondition} />
              <DetailRow label="Table Open" value={packet.tableOpen} />
              <DetailRow label="Crown Open" value={packet.crownOpen} />
              <DetailRow label="Girdle Open" value={packet.girdleOpen} />
            </div>
          </div>

          {/* Inclusions, Treatment, Marketplace & Specialty */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Inclusions, Treatment, Marketplace & Specialty</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Table Inclusion" value={packet.tableInclusion} />
              <DetailRow label="Side Inclusion" value={packet.sideInclusion} />
              <DetailRow label="Black Inclusion" value={packet.blackInclusion} />
              <DetailRow label="White Inclusion" value={packet.whiteInclusion} />
              <DetailRow label="Open Inclusion" value={packet.openInclusion} />
              <DetailRow label="BGM" value={packet.bgm} />
              <DetailRow label="Growth Type" value={packet.growthType} />
              <DetailRow label="Type" value={packet.diamondType} />
              <DetailRow label="Star Length" value={packet.starLength != null ? `${Number(packet.starLength).toFixed(2)}%` : null} />
              <DetailRow label="Treatment" value={packet.treatment} />
              <DetailRow label="Origin" value={packet.origin} />
              <DetailRow label="Availability" value={packet.availability} />
              <DetailRow label="City" value={packet.city} />
              <DetailRow label="State" value={packet.state} />
              <DetailRow label="Trade Show" value={packet.tradeShow} />
              <DetailRow label="Brand" value={packet.brand} />
              <DetailRow label="Seller Spec" value={packet.sellerSpec} />
              <DetailRow label="Pair Stock #" value={packet.pairStockNumber} />
              <DetailRow label="Pair Separable" value={packet.isPairSeparable} />
              <DetailRow label="Parcel Stones" value={packet.parcelStones} />
              <DetailRow label="Report Filename" value={packet.reportFilename} />
              <DetailRow label="Report Issue Date" value={packet.reportIssueDate} />
              <DetailRow label="Report Type" value={packet.reportType} />
              <DetailRow label="Lab Location" value={packet.labLocation} />
              <DetailRow label="Allow RapLink Feed" value={packet.allowRaplinkFeed} />
              <DetailRow label="Sarine Loupe" value={packet.sarineLoupe ? <a href={packet.sarineLoupe} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.sarineLoupe}</a> : null} />
              <DetailRow label="Cert Comment" value={packet.certComment} />
              <DetailRow label="Member Comment" value={packet.memberComment} />
              <DetailRow label="Fancy Color" value={packet.fancyColor} />
              <DetailRow label="Fancy Color Intensity" value={packet.fancyColorIntensity} />
              <DetailRow label="Fancy Color Overtone" value={packet.fancyColorOvertone} />
              <DetailRow label="Key to Symbols" value={packet.keyToSymbols} />
              <DetailRow label="Web URL" value={packet.webUrl ? <a href={packet.webUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.webUrl}</a> : null} />
              <DetailRow label="Comment" value={packet.diamondComment} />
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
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Valuation & Target Rate</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <DetailRow label="Cost / Carat" value={`₹ ${Number(packet.costPerCarat).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
              <DetailRow label="Total Cost" value={`₹ ${Number(packet.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
              {packet.targetSaleRate != null ? (
                <>
                  <DetailRow
                    label="Target Rate / Carat"
                    value={
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        ₹ {Number(packet.targetSaleRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Target Valuation"
                    value={
                      <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                        ₹ {(Number(packet.caratWeight) * Number(packet.targetSaleRate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Est. Profit / Carat"
                    value={
                      <span style={{ color: Number(packet.targetSaleRate) >= Number(packet.costPerCarat) ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                        ₹ {(Number(packet.targetSaleRate) - Number(packet.costPerCarat)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    }
                  />
                </>
              ) : (
                <DetailRow label="Target Rate" value={<span style={{ opacity: 0.5 }}>Not set</span>} />
              )}
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
                {timeline.map((m) => {
                  const isSales = m.movementType === 'SALES';
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-row-alt)',
                        borderLeft: `4px solid ${isSales ? '#0284c7' : 'var(--color-accent)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: 'var(--text-label)', color: isSales ? '#0369a1' : 'var(--color-primary)' }}>
                            {m.movementType.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: isSales ? '#e0f2fe' : '#dcfce7', color: isSales ? '#0369a1' : '#15803d' }}>
                            {Number(m.carats).toFixed(3)} Cts
                          </span>
                        </div>
                        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                          {new Date(m.movementDate).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {STOCK_STATUS_LABELS[m.previousStatus]} → {isSales && m.previousStatus === 'AVAILABLE' && m.newStatus === 'AVAILABLE' ? 'Partial Sale (Vault)' : STOCK_STATUS_LABELS[m.newStatus]}
                      </div>
                      {m.remarks && (
                        <div style={{ fontSize: 'var(--text-small)', marginTop: '6px', color: 'var(--color-text-primary)', background: 'var(--color-surface)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                          {m.remarks}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
