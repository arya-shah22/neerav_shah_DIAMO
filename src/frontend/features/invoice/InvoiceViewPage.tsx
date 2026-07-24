// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Invoice View Page (Read-only detail view)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Badge } from '../../components/ui';
import type { IInvoice, InvoiceType } from './invoice.types';

interface ViewPageProps {
  type: InvoiceType;
}

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

export const InvoiceViewPage: React.FC<ViewPageProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId, isReady } = useActiveCompany();

  const getInfo = () => {
    switch (type) {
      case 'SALE_RETURN':
        return { label: 'Sale Return Credit Note', listRoute: '/transactions/sale-returns', editRoute: `/transactions/sale-returns/${id}/edit`, isCustomer: true };
      case 'SALE_DEBIT_NOTE':
        return { label: 'Sale Debit Note', listRoute: '/transactions/sale-debit-notes', editRoute: `/transactions/sale-debit-notes/${id}/edit`, isCustomer: true };
      case 'PURCHASE_RETURN':
        return { label: 'Purchase Return Debit Note', listRoute: '/transactions/purchase-returns', editRoute: `/transactions/purchase-returns/${id}/edit`, isCustomer: false };
      case 'PURCHASE_DEBIT_NOTE':
        return { label: 'Purchase Credit Note', listRoute: '/transactions/purchase-credit-notes', editRoute: `/transactions/purchase-credit-notes/${id}/edit`, isCustomer: false };
      case 'PURCHASE_INVOICE':
        return { label: 'Purchase Invoice', listRoute: '/transactions/purchases', editRoute: `/transactions/purchases/${id}/edit`, isCustomer: false };
      default:
        return { label: 'Sales Invoice', listRoute: '/transactions/sales', editRoute: `/transactions/sales/${id}/edit`, isCustomer: true };
    }
  };
  const { label, listRoute, editRoute, isCustomer } = getInfo();

  const { data: invoice, loading, invoke: fetchInvoice } = useIpc<IInvoice>('invoice:get');

  const refresh = useCallback(async () => {
    if (!companyId || !id) return;
    await fetchInvoice({ id: Number(id), companyId });
  }, [companyId, id, fetchInvoice]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  if (loading && !invoice) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Loading details...</p>;
  }

  if (!invoice) {
    return <p style={{ color: 'var(--color-danger)' }}>Transaction not found.</p>;
  }

  const statusVariant = invoice.status === 'APPROVED' ? 'success' : invoice.status === 'DRAFT' ? 'warning' : 'info';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" onClick={() => navigate(listRoute)}><ArrowLeft size={18} /></Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} color="var(--color-accent)" />
              <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
                {invoice.voucherNumber}
              </h1>
              <Badge variant={statusVariant}>{invoice.status}</Badge>
            </div>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              {label} — Bill #{invoice.billNumber}
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => navigate(editRoute)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Edit2 size={16} /> Edit Details
        </Button>
      </div>

      {/* Invoice Header Details */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Transaction Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <DetailRow label={isCustomer ? 'Customer' : 'Supplier'} value={invoice.customer?.accountName || invoice.supplier?.accountName} />
          <DetailRow label="Broker" value={invoice.broker?.accountName || '—'} />
          <DetailRow label="Date" value={new Date(invoice.invoiceDate).toLocaleDateString('en-IN')} />
          <DetailRow label="Due Date" value={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '—'} />
          <DetailRow label="GSTIN" value={invoice.customerGstin || '—'} />
          <DetailRow label="State Code" value={invoice.customerStateCode || '—'} />
          <DetailRow label="Brokerage %" value={`${Number(invoice.brokeragePct || 0).toFixed(2)}%`} />
          <DetailRow label="Brokerage Amount" value={`₹${Number(invoice.brokerageAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
        </div>
      </div>

      {/* Items Grid */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '16px', color: 'var(--color-primary)' }}>Line Items</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>#</th>
              <th style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>QUALITY</th>
              <th style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>HSN</th>
              <th style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>CARATS</th>
              <th style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>PIECES</th>
              <th style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>RATE</th>
              <th style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>GST %</th>
              <th style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>GROSS</th>
              <th style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>NET AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, idx) => (
              <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 8px', fontSize: '13px' }}>{idx + 1}</td>
                <td style={{ padding: '10px 8px', fontSize: '13px', fontWeight: 600 }}>
                  <div>{item.quality?.qualityName || '—'}</div>
                  {(item as any).stockPacket && (
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 400, marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: 'var(--color-row-alt)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>
                        📦 {(item as any).stockPacket.stockIdNumber}
                      </span>
                      {[(item as any).stockPacket.shape, (item as any).stockPacket.color, (item as any).stockPacket.clarity, (item as any).stockPacket.cut].filter(Boolean).join(' / ')}
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 8px', fontSize: '13px' }}>{item.hsnNumber || '—'}</td>
                <td style={{ padding: '10px 8px', fontSize: '13px', textAlign: 'right' }}>{Number(item.carats).toFixed(3)}</td>
                <td style={{ padding: '10px 8px', fontSize: '13px', textAlign: 'right' }}>
                  {item.pieces === 0 || item.pieces === null || item.pieces === undefined ? (
                    <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>None</span>
                  ) : (
                    item.pieces
                  )}
                </td>
                <td style={{ padding: '10px 8px', fontSize: '13px', textAlign: 'right' }}>₹{Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '10px 8px', fontSize: '13px', textAlign: 'right' }}>{Number(item.gstPct || 0).toFixed(2)}%</td>
                <td style={{ padding: '10px 8px', fontSize: '13px', textAlign: 'right' }}>₹{Number(item.grossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '10px 8px', fontSize: '13px', textAlign: 'right', fontWeight: 600 }}>₹{Number(item.netAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <h3 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: '8px', color: 'var(--color-primary)' }}>Narration</h3>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
            {invoice.narration || 'No remarks entered.'}
          </p>
        </div>

        <div style={{ background: 'var(--color-row-alt)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span>Total Carats:</span>
            <span style={{ fontWeight: 600 }}>{Number(invoice.totalCarats).toFixed(3)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span>Total Pieces:</span>
            <span style={{ fontWeight: 600 }}>{invoice.totalPieces}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
            <span>Gross Amount:</span>
            <span style={{ fontWeight: 600 }}>₹{Number(invoice.totalGrossAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span>Discount:</span>
            <span style={{ color: 'var(--color-danger)' }}>-₹{Number(invoice.totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span>CGST:</span>
            <span>₹{Number(invoice.totalCgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span>SGST:</span>
            <span>₹{Number(invoice.totalSgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
            <span>IGST:</span>
            <span>₹{Number(invoice.totalIgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            <span>Round Off:</span>
            <span>{Number(invoice.roundOff) >= 0 ? '+' : ''}₹{Number(invoice.roundOff).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: 'var(--color-accent)', borderTop: '2px solid var(--color-accent)', paddingTop: '10px' }}>
            <span>Net Total:</span>
            <span>₹{Number(invoice.netAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
