import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Eye, Edit2 } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, useToast } from '../../components/ui';
import { IInvoice, InvoiceType } from './invoice.types';

interface ListPageProps {
  type: InvoiceType;
}

export const InvoiceListPage: React.FC<ListPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();
  const isSale = type === 'SALE_INVOICE';

  const { data: invoices, loading, invoke: fetchInvoices } = useIpc<IInvoice[]>('invoice:list');
  const { invoke: deleteInvoice } = useIpc('invoice:delete');

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchInvoices({ companyId, type });
  }, [companyId, fetchInvoices, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id: number, voucherNumber: string) => {
    if (!companyId || !confirm(`Permanently delete invoice "${voucherNumber}"? All ledger and stock movements will be reversed.`)) return;
    const res = await deleteInvoice({ id, companyId });
    if (res.success) {
      showToast('Invoice deleted', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const baseRoute = isSale ? '/transactions/sales' : '/transactions/purchases';
  const formRoute = `${baseRoute}/new`;

  const columns: Column<IInvoice>[] = [
    {
      key: 'voucherNumber',
      header: 'INVOICE NUMBER',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{row.voucherNumber}</span>
        </div>
      ),
    },
    {
      key: 'invoiceDate',
      header: 'DATE',
      render: (row) => new Date(row.invoiceDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'customerId',
      header: isSale ? 'CUSTOMER' : 'SUPPLIER',
      render: (row) => row.customer?.accountName || '—',
    },
    {
      key: 'brokerId',
      header: 'BROKER',
      render: (row) => row.broker?.accountName || '—',
    },
    {
      key: 'totalCarats',
      header: 'CARATS',
      render: (row) => Number(row.totalCarats).toFixed(3),
    },
    {
      key: 'netAmount',
      header: 'NET AMOUNT',
      render: (row) => `₹${Number(row.netAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'status',
      header: 'STATUS',
      width: '100px',
      render: (row) => {
        const variant = row.status === 'APPROVED' ? 'success' : row.status === 'DRAFT' ? 'warning' : 'info';
        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '160px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            title="View Invoice"
            onClick={() => navigate(`${baseRoute}/${row.id}`)}
            style={{ padding: '4px 6px' }}
          >
            <Eye size={15} color="var(--color-accent)" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Edit Invoice"
            onClick={() => navigate(`${baseRoute}/${row.id}/edit`)}
            style={{ padding: '4px 6px' }}
          >
            <Edit2 size={15} color="var(--color-text-secondary)" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Delete Invoice"
            onClick={() => handleDelete(row.id, row.voucherNumber)}
            style={{ padding: '4px 6px' }}
          >
            <Trash2 size={15} color="var(--color-danger)" />
          </Button>
        </div>
      ),
    },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
            {isSale ? 'Sales Invoices' : 'Purchase Invoices'}
          </h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)' }}>
            Manage {isSale ? 'polished diamond sales' : 'rough diamond purchase parcels'}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate(formRoute)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New {isSale ? 'Sale' : 'Purchase'}
        </Button>
      </div>

      <DataGrid<IInvoice>
        columns={columns}
        data={invoices || []}
        keyField="id"
        loading={loading}
        emptyTitle={isSale ? "No Sales Recorded" : "No Purchases Recorded"}
        emptyDescription={isSale ? "Click 'New Sale' to create your first polished diamond sales invoice." : "Click 'New Purchase' to create your first rough diamond purchase parcel receipt."}
      />
    </div>
  );
};
