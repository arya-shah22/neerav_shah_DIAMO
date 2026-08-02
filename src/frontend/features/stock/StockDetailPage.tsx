// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Detail Page (view + timeline)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Gem, Search, X } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Badge, Input } from '../../components/ui';
import { IStockMovement, IStockPacket, STOCK_STATUS_LABELS, STOCK_STATUS_BADGE_VARIANT, EDITABLE_STOCK_STATUSES } from './stock.types';

const LIST_ROUTE = '/inventory/stock';

function DetailRow({ label, value, searchQuery }: { label: string; value: React.ReactNode; searchQuery?: string }) {
  const isMatch = searchQuery?.trim()
    ? label.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (typeof value === 'string' && value.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : false;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: isMatch ? '6px 8px' : '0px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: isMatch ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
        border: isMatch ? '1px solid rgba(234, 179, 8, 0.5)' : 'none',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <span style={{ fontSize: 'var(--text-small)', color: isMatch ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: isMatch ? 700 : 600, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-body)', color: 'var(--color-primary)', fontWeight: isMatch ? 600 : 400 }}>{value ?? '—'}</span>
    </div>
  );
}

export const StockDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId, isReady } = useActiveCompany();
  const [searchQuery, setSearchQuery] = useState('');

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

  // Extract all fields for search & pinning
  const allFields: Array<{ label: string; value: React.ReactNode; category: string }> = packet ? [
    // Overview
    { label: 'Status', value: <Badge variant={STOCK_STATUS_BADGE_VARIANT[packet.currentStatus]}>{STOCK_STATUS_LABELS[packet.currentStatus]}</Badge>, category: 'Overview' },
    { label: 'Category', value: packet.category === 'CERTIFIED' ? 'Certified' : 'Non-Certified', category: 'Overview' },
    { label: 'Registration', value: new Date(packet.registrationDate).toLocaleDateString('en-IN'), category: 'Overview' },
    { label: 'Carat Weight', value: packet.caratWeight != null ? `${Number(packet.caratWeight).toFixed(3)} ct` : '—', category: 'Overview' },
    { label: 'Shape', value: packet.shape, category: 'Overview' },
    { label: 'Color', value: packet.color, category: 'Overview' },
    { label: 'Clarity', value: packet.clarity, category: 'Overview' },
    { label: 'Cut', value: packet.cut, category: 'Overview' },
    { label: 'Polish', value: packet.polish, category: 'Overview' },
    { label: 'Symmetry', value: packet.symmetry, category: 'Overview' },
    { label: 'Pieces', value: packet.pieceCount === 0 ? 'Not Counted' : packet.pieceCount, category: 'Overview' },
    { label: 'Remarks', value: packet.currentLocation, category: 'Overview' },

    // Measurements & Certification
    { label: 'Measurements', value: packet.measurements || (packet.lengthMm && packet.widthMm && packet.depthMm ? `${Number(packet.lengthMm).toFixed(2)}x${Number(packet.widthMm).toFixed(2)}x${Number(packet.depthMm).toFixed(2)}` : null), category: 'Measurements & Certification' },
    { label: 'Length', value: packet.lengthMm != null ? `${Number(packet.lengthMm).toFixed(2)} mm` : null, category: 'Measurements & Certification' },
    { label: 'Width', value: packet.widthMm != null ? `${Number(packet.widthMm).toFixed(2)} mm` : null, category: 'Measurements & Certification' },
    { label: 'Depth', value: packet.depthMm != null ? `${Number(packet.depthMm).toFixed(2)} mm` : null, category: 'Measurements & Certification' },
    { label: 'Total Depth %', value: packet.totalDepthPct != null ? `${Number(packet.totalDepthPct).toFixed(2)}%` : null, category: 'Measurements & Certification' },
    { label: 'Table %', value: packet.tablePct != null ? `${Number(packet.tablePct).toFixed(2)}%` : null, category: 'Measurements & Certification' },
    { label: 'Cert Type', value: packet.certificateType, category: 'Measurements & Certification' },
    { label: 'Cert Number', value: packet.certificateNumber, category: 'Measurements & Certification' },
    { label: 'Certificate URL', value: packet.certificateUrl ? <a href={packet.certificateUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.certificateUrl}</a> : null, category: 'Measurements & Certification' },
    { label: 'Laser Inscription', value: packet.inscription, category: 'Measurements & Certification' },

    // Fluorescence & Optical
    { label: 'Fluorescence', value: packet.fluorescenceIntensity, category: 'Fluorescence & Optical' },
    { label: 'Fluor Color', value: packet.fluorescenceColor, category: 'Fluorescence & Optical' },
    { label: 'Eye Clean', value: packet.eyeClean, category: 'Fluorescence & Optical' },
    { label: 'Hearts & Arrows', value: packet.heartsAndArrows, category: 'Fluorescence & Optical' },
    { label: 'Shade', value: packet.shade, category: 'Fluorescence & Optical' },
    { label: 'Milky', value: packet.milky, category: 'Fluorescence & Optical' },
    { label: 'Tinge', value: packet.tinge, category: 'Fluorescence & Optical' },
    { label: 'Lustre', value: packet.lustre, category: 'Fluorescence & Optical' },
    { label: 'Rap Price', value: packet.rapPricePerCarat != null ? `$ ${Number(packet.rapPricePerCarat).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null, category: 'Fluorescence & Optical' },
    { label: 'Rap Discount', value: packet.rapDiscountPct != null ? `${Number(packet.rapDiscountPct).toFixed(2)}%` : null, category: 'Fluorescence & Optical' },

    // Girdle, Crown & Pavilion
    { label: 'Crown Angle', value: packet.crownAngle != null ? `${Number(packet.crownAngle).toFixed(2)}°` : null, category: 'Girdle, Crown & Pavilion' },
    { label: 'Crown Height', value: packet.crownHeight != null ? `${Number(packet.crownHeight).toFixed(2)}%` : null, category: 'Girdle, Crown & Pavilion' },
    { label: 'Pavilion Angle', value: packet.pavilionAngle != null ? `${Number(packet.pavilionAngle).toFixed(2)}°` : null, category: 'Girdle, Crown & Pavilion' },
    { label: 'Pavilion Depth', value: packet.pavilionDepth != null ? `${Number(packet.pavilionDepth).toFixed(2)}%` : null, category: 'Girdle, Crown & Pavilion' },
    { label: 'Girdle Thin', value: packet.girdleMin, category: 'Girdle, Crown & Pavilion' },
    { label: 'Girdle Thick', value: packet.girdleMax, category: 'Girdle, Crown & Pavilion' },
    { label: 'Girdle %', value: packet.girdlePct != null ? `${Number(packet.girdlePct).toFixed(2)}%` : null, category: 'Girdle, Crown & Pavilion' },
    { label: 'Girdle Condition', value: packet.girdleCondition, category: 'Girdle, Crown & Pavilion' },
    { label: 'Culet Size', value: packet.culetSize, category: 'Girdle, Crown & Pavilion' },
    { label: 'Culet Condition', value: packet.culetCondition, category: 'Girdle, Crown & Pavilion' },
    { label: 'Table Open', value: packet.tableOpen, category: 'Girdle, Crown & Pavilion' },
    { label: 'Crown Open', value: packet.crownOpen, category: 'Girdle, Crown & Pavilion' },
    { label: 'Girdle Open', value: packet.girdleOpen, category: 'Girdle, Crown & Pavilion' },

    // Inclusions & Specialty
    { label: 'Table Inclusion', value: packet.tableInclusion, category: 'Inclusions & Specialty' },
    { label: 'Side Inclusion', value: packet.sideInclusion, category: 'Inclusions & Specialty' },
    { label: 'Black Inclusion', value: packet.blackInclusion, category: 'Inclusions & Specialty' },
    { label: 'White Inclusion', value: packet.whiteInclusion, category: 'Inclusions & Specialty' },
    { label: 'Open Inclusion', value: packet.openInclusion, category: 'Inclusions & Specialty' },
    { label: 'BGM', value: packet.bgm, category: 'Inclusions & Specialty' },
    { label: 'Growth Type', value: packet.growthType, category: 'Inclusions & Specialty' },
    { label: 'Type', value: packet.diamondType, category: 'Inclusions & Specialty' },
    { label: 'Star Length', value: packet.starLength != null ? `${Number(packet.starLength).toFixed(2)}%` : null, category: 'Inclusions & Specialty' },
    { label: 'Treatment', value: packet.treatment, category: 'Inclusions & Specialty' },
    { label: 'Origin', value: packet.origin, category: 'Inclusions & Specialty' },
    { label: 'Availability', value: packet.availability, category: 'Inclusions & Specialty' },
    { label: 'City', value: packet.city, category: 'Inclusions & Specialty' },
    { label: 'State', value: packet.state, category: 'Inclusions & Specialty' },
    { label: 'Trade Show', value: packet.tradeShow, category: 'Inclusions & Specialty' },
    { label: 'Brand', value: packet.brand, category: 'Inclusions & Specialty' },
    { label: 'Seller Spec', value: packet.sellerSpec, category: 'Inclusions & Specialty' },
    { label: 'Pair Stock #', value: packet.pairStockNumber, category: 'Inclusions & Specialty' },
    { label: 'Pair Separable', value: packet.isPairSeparable, category: 'Inclusions & Specialty' },
    { label: 'Parcel Stones', value: packet.parcelStones, category: 'Inclusions & Specialty' },
    { label: 'Report Filename', value: packet.reportFilename, category: 'Inclusions & Specialty' },
    { label: 'Report Issue Date', value: packet.reportIssueDate, category: 'Inclusions & Specialty' },
    { label: 'Report Type', value: packet.reportType, category: 'Inclusions & Specialty' },
    { label: 'Lab Location', value: packet.labLocation, category: 'Inclusions & Specialty' },
    { label: 'Allow RapLink Feed', value: packet.allowRaplinkFeed, category: 'Inclusions & Specialty' },
    { label: 'Sarine Loupe', value: packet.sarineLoupe ? <a href={packet.sarineLoupe} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.sarineLoupe}</a> : null, category: 'Inclusions & Specialty' },
    { label: 'Cert Comment', value: packet.certComment, category: 'Inclusions & Specialty' },
    { label: 'Member Comment', value: packet.memberComment, category: 'Inclusions & Specialty' },
    { label: 'Fancy Color', value: packet.fancyColor, category: 'Inclusions & Specialty' },
    { label: 'Fancy Color Intensity', value: packet.fancyColorIntensity, category: 'Inclusions & Specialty' },
    { label: 'Fancy Color Overtone', value: packet.fancyColorOvertone, category: 'Inclusions & Specialty' },
    { label: 'Key to Symbols', value: packet.keyToSymbols, category: 'Inclusions & Specialty' },
    { label: 'Web URL', value: packet.webUrl ? <a href={packet.webUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.webUrl}</a> : null, category: 'Inclusions & Specialty' },
    { label: 'Comment', value: packet.diamondComment, category: 'Inclusions & Specialty' },

    // Valuation & Target Rate
    { label: 'Cost / Carat', value: `₹ ${Number(packet.costPerCarat).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, category: 'Valuation & Target Rate' },
    { label: 'Total Cost', value: `₹ ${Number(packet.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, category: 'Valuation & Target Rate' },
    { label: 'Target Rate / Carat', value: packet.targetSaleRate != null ? `₹ ${Number(packet.targetSaleRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null, category: 'Valuation & Target Rate' },
    { label: 'Target Valuation', value: packet.targetSaleRate != null ? `₹ ${(Number(packet.caratWeight) * Number(packet.targetSaleRate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null, category: 'Valuation & Target Rate' },

    // Media
    { label: 'Image Link', value: packet.imageLink ? <a href={packet.imageLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.imageLink}</a> : null, category: 'Media' },
    { label: 'Video Link', value: packet.videoLink ? <a href={packet.videoLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.videoLink}</a> : null, category: 'Media' },
  ] : [];

  const matchedFields = searchQuery.trim()
    ? allFields.filter(f =>
        f.label.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (typeof f.value === 'string' && f.value.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      )
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Column/Field Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', pointerEvents: 'none' }} />
            <Input
              placeholder="Search fields (e.g. Girdle, Cut)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', paddingRight: searchQuery ? '32px' : '12px', height: '36px', fontSize: 'var(--text-small)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                <X size={14} />
              </button>
            )}
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
      </div>

      {/* Pinned Search Results Banner */}
      {searchQuery.trim() && (
        <div
          style={{
            ...cardStyle,
            border: '2px solid #eab308',
            background: 'rgba(234, 179, 8, 0.05)',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📌 Pinned Search Results ({matchedFields.length} {matchedFields.length === 1 ? 'field' : 'fields'} found)
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} style={{ fontSize: 'var(--text-small)' }}>
              Clear Search
            </Button>
          </div>

          {matchedFields.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-body)' }}>
              No column headings or values match "<strong>{searchQuery}</strong>".
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {matchedFields.map((field, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                    {field.category}
                  </span>
                  <DetailRow label={field.label} value={field.value} searchQuery={searchQuery} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Status" value={<Badge variant={STOCK_STATUS_BADGE_VARIANT[packet.currentStatus]}>{STOCK_STATUS_LABELS[packet.currentStatus]}</Badge>} searchQuery={searchQuery} />
              <DetailRow label="Category" value={packet.category === 'CERTIFIED' ? 'Certified' : 'Non-Certified'} searchQuery={searchQuery} />
              <DetailRow label="Registration" value={new Date(packet.registrationDate).toLocaleDateString('en-IN')} searchQuery={searchQuery} />
              <DetailRow label="Carat Weight" value={packet.caratWeight != null ? `${Number(packet.caratWeight).toFixed(3)} ct` : '—'} searchQuery={searchQuery} />
              <DetailRow label="Shape" value={packet.shape} searchQuery={searchQuery} />
              <DetailRow label="Color" value={packet.color} searchQuery={searchQuery} />
              <DetailRow label="Clarity" value={packet.clarity} searchQuery={searchQuery} />
              <DetailRow label="Cut" value={packet.cut} searchQuery={searchQuery} />
              <DetailRow label="Polish" value={packet.polish} searchQuery={searchQuery} />
              <DetailRow label="Symmetry" value={packet.symmetry} searchQuery={searchQuery} />
              <DetailRow label="Pieces" value={packet.pieceCount === 0 ? 'Not Counted' : packet.pieceCount} searchQuery={searchQuery} />
              <DetailRow label="Remarks" value={packet.currentLocation} searchQuery={searchQuery} />
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
              <DetailRow label="Measurements" value={packet.measurements || (packet.lengthMm && packet.widthMm && packet.depthMm ? `${Number(packet.lengthMm).toFixed(2)}x${Number(packet.widthMm).toFixed(2)}x${Number(packet.depthMm).toFixed(2)}` : null)} searchQuery={searchQuery} />
              <DetailRow label="Length" value={packet.lengthMm != null ? `${Number(packet.lengthMm).toFixed(2)} mm` : null} searchQuery={searchQuery} />
              <DetailRow label="Width" value={packet.widthMm != null ? `${Number(packet.widthMm).toFixed(2)} mm` : null} searchQuery={searchQuery} />
              <DetailRow label="Depth" value={packet.depthMm != null ? `${Number(packet.depthMm).toFixed(2)} mm` : null} searchQuery={searchQuery} />
              <DetailRow label="Total Depth %" value={packet.totalDepthPct != null ? `${Number(packet.totalDepthPct).toFixed(2)}%` : null} searchQuery={searchQuery} />
              <DetailRow label="Table %" value={packet.tablePct != null ? `${Number(packet.tablePct).toFixed(2)}%` : null} searchQuery={searchQuery} />
              <DetailRow label="Cert Type" value={packet.certificateType} searchQuery={searchQuery} />
              <DetailRow label="Cert Number" value={packet.certificateNumber} searchQuery={searchQuery} />
              {packet.certificateUrl && <DetailRow label="Certificate URL" value={<a href={packet.certificateUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.certificateUrl}</a>} searchQuery={searchQuery} />}
              {packet.inscription && <DetailRow label="Laser Inscription" value={packet.inscription} searchQuery={searchQuery} />}
            </div>
          </div>

          {/* Fluorescence & Optical */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Fluorescence & Optical</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Fluorescence" value={packet.fluorescenceIntensity} searchQuery={searchQuery} />
              <DetailRow label="Fluor Color" value={packet.fluorescenceColor} searchQuery={searchQuery} />
              <DetailRow label="Eye Clean" value={packet.eyeClean} searchQuery={searchQuery} />
              <DetailRow label="Hearts & Arrows" value={packet.heartsAndArrows} searchQuery={searchQuery} />
              <DetailRow label="Shade" value={packet.shade} searchQuery={searchQuery} />
              <DetailRow label="Milky" value={packet.milky} searchQuery={searchQuery} />
              <DetailRow label="Tinge" value={packet.tinge} searchQuery={searchQuery} />
              <DetailRow label="Lustre" value={packet.lustre} searchQuery={searchQuery} />
              <DetailRow label="Rap Price" value={packet.rapPricePerCarat != null ? `$ ${Number(packet.rapPricePerCarat).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null} searchQuery={searchQuery} />
              <DetailRow label="Rap Discount" value={packet.rapDiscountPct != null ? `${Number(packet.rapDiscountPct).toFixed(2)}%` : null} searchQuery={searchQuery} />
            </div>
          </div>

          {/* Girdle, Crown & Pavilion */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Girdle, Crown & Pavilion</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Crown Angle" value={packet.crownAngle != null ? `${Number(packet.crownAngle).toFixed(2)}°` : null} searchQuery={searchQuery} />
              <DetailRow label="Crown Height" value={packet.crownHeight != null ? `${Number(packet.crownHeight).toFixed(2)}%` : null} searchQuery={searchQuery} />
              <DetailRow label="Pavilion Angle" value={packet.pavilionAngle != null ? `${Number(packet.pavilionAngle).toFixed(2)}°` : null} searchQuery={searchQuery} />
              <DetailRow label="Pavilion Depth" value={packet.pavilionDepth != null ? `${Number(packet.pavilionDepth).toFixed(2)}%` : null} searchQuery={searchQuery} />
              <DetailRow label="Girdle Thin" value={packet.girdleMin} searchQuery={searchQuery} />
              <DetailRow label="Girdle Thick" value={packet.girdleMax} searchQuery={searchQuery} />
              <DetailRow label="Girdle %" value={packet.girdlePct != null ? `${Number(packet.girdlePct).toFixed(2)}%` : null} searchQuery={searchQuery} />
              <DetailRow label="Girdle Condition" value={packet.girdleCondition} searchQuery={searchQuery} />
              <DetailRow label="Culet Size" value={packet.culetSize} searchQuery={searchQuery} />
              <DetailRow label="Culet Condition" value={packet.culetCondition} searchQuery={searchQuery} />
              <DetailRow label="Table Open" value={packet.tableOpen} searchQuery={searchQuery} />
              <DetailRow label="Crown Open" value={packet.crownOpen} searchQuery={searchQuery} />
              <DetailRow label="Girdle Open" value={packet.girdleOpen} searchQuery={searchQuery} />
            </div>
          </div>

          {/* Inclusions, Treatment, Marketplace & Specialty */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Inclusions, Treatment, Marketplace & Specialty</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <DetailRow label="Table Inclusion" value={packet.tableInclusion} searchQuery={searchQuery} />
              <DetailRow label="Side Inclusion" value={packet.sideInclusion} searchQuery={searchQuery} />
              <DetailRow label="Black Inclusion" value={packet.blackInclusion} searchQuery={searchQuery} />
              <DetailRow label="White Inclusion" value={packet.whiteInclusion} searchQuery={searchQuery} />
              <DetailRow label="Open Inclusion" value={packet.openInclusion} searchQuery={searchQuery} />
              <DetailRow label="BGM" value={packet.bgm} searchQuery={searchQuery} />
              <DetailRow label="Growth Type" value={packet.growthType} searchQuery={searchQuery} />
              <DetailRow label="Type" value={packet.diamondType} searchQuery={searchQuery} />
              <DetailRow label="Star Length" value={packet.starLength != null ? `${Number(packet.starLength).toFixed(2)}%` : null} searchQuery={searchQuery} />
              <DetailRow label="Treatment" value={packet.treatment} searchQuery={searchQuery} />
              <DetailRow label="Origin" value={packet.origin} searchQuery={searchQuery} />
              <DetailRow label="Availability" value={packet.availability} searchQuery={searchQuery} />
              <DetailRow label="City" value={packet.city} searchQuery={searchQuery} />
              <DetailRow label="State" value={packet.state} searchQuery={searchQuery} />
              <DetailRow label="Trade Show" value={packet.tradeShow} searchQuery={searchQuery} />
              <DetailRow label="Brand" value={packet.brand} searchQuery={searchQuery} />
              <DetailRow label="Seller Spec" value={packet.sellerSpec} searchQuery={searchQuery} />
              <DetailRow label="Pair Stock #" value={packet.pairStockNumber} searchQuery={searchQuery} />
              <DetailRow label="Pair Separable" value={packet.isPairSeparable} searchQuery={searchQuery} />
              <DetailRow label="Parcel Stones" value={packet.parcelStones} searchQuery={searchQuery} />
              <DetailRow label="Report Filename" value={packet.reportFilename} searchQuery={searchQuery} />
              <DetailRow label="Report Issue Date" value={packet.reportIssueDate} searchQuery={searchQuery} />
              <DetailRow label="Report Type" value={packet.reportType} searchQuery={searchQuery} />
              <DetailRow label="Lab Location" value={packet.labLocation} searchQuery={searchQuery} />
              <DetailRow label="Allow RapLink Feed" value={packet.allowRaplinkFeed} searchQuery={searchQuery} />
              <DetailRow label="Sarine Loupe" value={packet.sarineLoupe ? <a href={packet.sarineLoupe} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.sarineLoupe}</a> : null} searchQuery={searchQuery} />
              <DetailRow label="Cert Comment" value={packet.certComment} searchQuery={searchQuery} />
              <DetailRow label="Member Comment" value={packet.memberComment} searchQuery={searchQuery} />
              <DetailRow label="Fancy Color" value={packet.fancyColor} searchQuery={searchQuery} />
              <DetailRow label="Fancy Color Intensity" value={packet.fancyColorIntensity} searchQuery={searchQuery} />
              <DetailRow label="Fancy Color Overtone" value={packet.fancyColorOvertone} searchQuery={searchQuery} />
              <DetailRow label="Key to Symbols" value={packet.keyToSymbols} searchQuery={searchQuery} />
              <DetailRow label="Web URL" value={packet.webUrl ? <a href={packet.webUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>{packet.webUrl}</a> : null} searchQuery={searchQuery} />
              <DetailRow label="Comment" value={packet.diamondComment} searchQuery={searchQuery} />
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
                searchQuery={searchQuery}
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
                searchQuery={searchQuery}
              />
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px' }}>Valuation & Target Rate</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <DetailRow label="Cost / Carat" value={`₹ ${Number(packet.costPerCarat).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} searchQuery={searchQuery} />
              <DetailRow label="Total Cost" value={`₹ ${Number(packet.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} searchQuery={searchQuery} />
              {packet.targetSaleRate != null ? (
                <>
                  <DetailRow
                    label="Target Rate / Carat"
                    value={
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        ₹ {Number(packet.targetSaleRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    }
                    searchQuery={searchQuery}
                  />
                  <DetailRow
                    label="Target Valuation"
                    value={
                      <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                        ₹ {(Number(packet.caratWeight) * Number(packet.targetSaleRate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    }
                    searchQuery={searchQuery}
                  />
                  <DetailRow
                    label="Est. Profit / Carat"
                    value={
                      <span style={{ color: Number(packet.targetSaleRate) >= Number(packet.costPerCarat) ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                        ₹ {(Number(packet.targetSaleRate) - Number(packet.costPerCarat)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    }
                    searchQuery={searchQuery}
                  />
                </>
              ) : (
                <DetailRow label="Target Rate" value={<span style={{ opacity: 0.5 }}>Not set</span>} searchQuery={searchQuery} />
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
