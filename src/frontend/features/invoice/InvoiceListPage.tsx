import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Eye, Edit2, Printer } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, useToast } from '../../components/ui';
import { IInvoice, InvoiceType } from './invoice.types';
import { PrintTemplate } from '../../components/ui/PrintTemplate';

interface ListPageProps {
  type: InvoiceType;
}

export const InvoiceListPage: React.FC<ListPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();
  const [printData, setPrintData] = useState<IInvoice | null>(null);

  const getInfo = () => {
    switch (type) {
      case 'SALE_RETURN':
        return {
          title: 'Sale Return Credit Notes',
          newLabel: 'New Sale Return',
          baseRoute: '/transactions/sale-returns',
          isCustomer: true,
          emptyTitle: 'No Sale Returns Recorded',
          emptyDesc: 'Create a Sale Return Credit Note to receive returned polished diamonds.',
        };
      case 'SALE_DEBIT_NOTE':
        return {
          title: 'Sale Debit Notes',
          newLabel: 'New Sale Debit Note',
          baseRoute: '/transactions/sale-debit-notes',
          isCustomer: true,
          emptyTitle: 'No Sale Debit Notes Recorded',
          emptyDesc: 'Create a Sale Debit Note to charge price adjustments or supplementary fees.',
        };
      case 'PURCHASE_RETURN':
        return {
          title: 'Purchase Return Debit Notes',
          newLabel: 'New Purchase Return',
          baseRoute: '/transactions/purchase-returns',
          isCustomer: false,
          emptyTitle: 'No Purchase Returns Recorded',
          emptyDesc: 'Create a Purchase Return Debit Note to log diamonds returned to supplier.',
        };
      case 'PURCHASE_DEBIT_NOTE':
        return {
          title: 'Purchase Credit Notes',
          newLabel: 'New Purchase Credit Note',
          baseRoute: '/transactions/purchase-credit-notes',
          isCustomer: false,
          emptyTitle: 'No Purchase Credit Notes Recorded',
          emptyDesc: 'Create a Purchase Credit Note to log supplier price discounts or rate differences.',
        };
      case 'PURCHASE_INVOICE':
        return {
          title: 'Purchase Invoices',
          newLabel: 'New Purchase',
          baseRoute: '/transactions/purchases',
          isCustomer: false,
          emptyTitle: 'No Purchases Recorded',
          emptyDesc: 'Create a Purchase parcel receipt to track inbound diamond inventory.',
        };
      default:
        return {
          title: 'Sales Invoices',
          newLabel: 'New Sale',
          baseRoute: '/transactions/sales',
          isCustomer: true,
          emptyTitle: 'No Sales Recorded',
          emptyDesc: 'Create a polished diamond sales invoice to track outbound sales.',
        };
    }
  };

  const { title, newLabel, baseRoute, isCustomer, emptyTitle, emptyDesc } = getInfo();

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
    if (!companyId || !confirm(`Permanently delete transaction "${voucherNumber}"? All ledger and stock movements will be reversed.`)) return;
    const res = await deleteInvoice({ id, companyId });
    if (res.success) {
      showToast('Transaction deleted', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const [printConfig, setPrintConfig] = useState<any>(null);
  const { invoke: getTemplateConfig } = useIpc<any>('print:get-template-config');

  const handlePrintClick = async (row: IInvoice) => {
    if (!companyId) return;
    const res = await getTemplateConfig({ companyId, voucherType: type });
    if (res.success && res.data) {
      setPrintConfig(res.data);
    }
    setPrintData(row);
  };

  const formRoute = `${baseRoute}/new`;

  const columns: Column<IInvoice>[] = [
    {
      key: 'voucherNumber',
      header: 'VOUCHER NUMBER',
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
      header: isCustomer ? 'CUSTOMER' : 'SUPPLIER',
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
      width: '200px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            title="Print A4 Layout"
            onClick={() => handlePrintClick(row)}
            style={{ padding: '4px 6px' }}
          >
            <Printer size={15} color="var(--color-primary)" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="View Details"
            onClick={() => navigate(`${baseRoute}/${row.id}`)}
            style={{ padding: '4px 6px' }}
          >
            <Eye size={15} color="var(--color-accent)" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Edit Transaction"
            onClick={() => navigate(`${baseRoute}/${row.id}/edit`)}
            disabled={row.status === 'APPROVED'}
            style={{ padding: '4px 6px' }}
          >
            <Edit2 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Delete Transaction"
            onClick={() => handleDelete(row.id, row.voucherNumber)}
            style={{ padding: '4px 6px' }}
          >
            <Trash2 size={15} color="var(--color-error)" />
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
            {title}
          </h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)' }}>
            Manage and trace {title.toLowerCase()}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate(formRoute)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> {newLabel}
        </Button>
      </div>

      <DataGrid<IInvoice>
        columns={columns}
        data={invoices || []}
        keyField="id"
        loading={loading}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDesc}
      />

      {printData && (
        <PrintTemplate
          type="INVOICE"
          data={printData}
          layoutConfig={printConfig}
          onClose={() => {
            setPrintData(null);
            setPrintConfig(null);
          }}
        />
      )}
    </div>
  );
};
