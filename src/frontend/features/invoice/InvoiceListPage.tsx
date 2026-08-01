import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, FileText, Eye, Edit2, Printer, AlertTriangle, Filter, Sparkles, Scale, Layers } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, useToast } from '../../components/ui';
import { IInvoice, InvoiceType } from './invoice.types';
import { PrintTemplate } from '../../components/ui/PrintTemplate';
import { useCompanyStore } from '../../state/company-store';

interface ListPageProps {
  type: InvoiceType;
}

export const InvoiceListPage: React.FC<ListPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter'); // 'pending' | 'overdue' | null
  const [selectedQuality, setSelectedQuality] = useState<string>('ALL');

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

  const { data: rawInvoices, loading, invoke: fetchInvoices } = useIpc<IInvoice[]>('invoice:list');
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
    const res = await deleteInvoice({ id, companyId, type });
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

  // Extract all unique Quality names across fetched invoices
  const availableQualities = useMemo(() => {
    const set = new Set<string>();
    (rawInvoices || []).forEach((inv) => {
      (inv.items || []).forEach((item) => {
        if (item.quality?.qualityName) {
          set.add(item.quality.qualityName);
        }
      });
    });
    return Array.from(set).sort();
  }, [rawInvoices]);

  // Helper to check if an invoice is overdue
  const now = new Date().getTime();
  const isOverdue = (row: IInvoice) => {
    const outstanding = Number(row.outstandingAmount ?? (Number(row.netAmount || 0) - Number(row.jamaAmount || 0)));
    if (outstanding <= 0) return false;
    if (!row.dueDate) return false;
    return new Date(row.dueDate).getTime() < now;
  };

  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);
  const { invoke: getAllConfigs } = useIpc<any>('stock:get-all-configs');
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  useEffect(() => {
    if (!companyId || !activeFinancialYear?.id) return;
    getAllConfigs({ companyId, financialYearId: activeFinancialYear.id }).then((res) => {
      if (res.success && Array.isArray(res.data)) {
        const config = res.data.find((c: any) => c.voucherType === type);
        if (config?.includeMonth) {
          setShowMonthFilter(true);
        } else {
          setShowMonthFilter(false);
        }
      }
    });
  }, [companyId, activeFinancialYear?.id, type, getAllConfigs]);

  // Filter invoices based on URL parameter, selected Quality & selected Month
  const filteredInvoices = useMemo(() => {
    return (rawInvoices || []).filter((inv) => {
      // 1. Payment status filter
      const outstanding = Number(inv.outstandingAmount ?? (Number(inv.netAmount || 0) - Number(inv.jamaAmount || 0)));
      if (filterParam === 'pending' && outstanding <= 0) return false;
      if (filterParam === 'overdue' && !isOverdue(inv)) return false;

      // 2. Quality filter
      if (selectedQuality !== 'ALL') {
        const hasQuality = (inv.items || []).some(
          (item) => item.quality?.qualityName === selectedQuality
        );
        if (!hasQuality) return false;
      }

      // 3. Month filter
      if (showMonthFilter && selectedMonth !== 'ALL') {
        const dateObj = new Date(inv.invoiceDate);
        if (!isNaN(dateObj.getTime())) {
          if (String(dateObj.getMonth()) !== selectedMonth) return false;
        }
      }

      return true;
    });
  }, [rawInvoices, filterParam, selectedQuality, showMonthFilter, selectedMonth]);

  // Compute Quality-specific summary breakdown for the filtered/selected quality
  const qualitySummary = useMemo(() => {
    let totalCarats = 0;
    let totalValue = 0;
    let itemCount = 0;

    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        if (selectedQuality === 'ALL' || item.quality?.qualityName === selectedQuality) {
          const cts = Number(item.carats || 0);
          const val = Number(item.netAmount || (cts * Number(item.rate || 0)));
          totalCarats += cts;
          totalValue += val;
          itemCount++;
        }
      });
    });

    return { totalCarats, totalValue, itemCount };
  }, [filteredInvoices, selectedQuality]);

  const columns: Column<IInvoice>[] = [
    {
      key: 'voucherNumber',
      header: 'VOUCHER NUMBER',
      sortable: true,
      render: (row) => {
        const overdue = isOverdue(row);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color={overdue ? '#dc2626' : 'var(--color-accent)'} />
            <span style={{ fontWeight: 600, color: overdue ? '#dc2626' : 'var(--color-primary)' }}>
              {row.voucherNumber}
            </span>
            {overdue && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Payment Overdue!"
              >
                <AlertTriangle size={10} /> OVERDUE
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'invoiceDate',
      header: 'DATE',
      render: (row) => new Date(row.invoiceDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'customerId',
      header: isCustomer ? 'CUSTOMER' : 'SUPPLIER',
      render: (row) => row.customer?.accountName || row.supplier?.accountName || '—',
    },
    {
      key: 'qualities',
      header: 'QUALITIES',
      render: (row) => {
        const qualities = (row.items || [])
          .map((i) => i.quality?.qualityName)
          .filter((q): q is string => !!q);
        const uniqueQualities = Array.from(new Set(qualities));

        if (uniqueQualities.length === 0) return <span style={{ color: 'var(--color-text-secondary)' }}>—</span>;

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {uniqueQualities.map((q) => {
              const isMatch = selectedQuality !== 'ALL' && q === selectedQuality;
              return (
                <span
                  key={q}
                  style={{
                    fontSize: '11px',
                    fontWeight: isMatch ? 700 : 500,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isMatch ? 'var(--color-accent)' : 'var(--color-surface-hover)',
                    color: isMatch ? '#ffffff' : 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {q}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'netAmount',
      header: 'NET AMOUNT',
      render: (row) => `₹${Number(row.netAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'outstandingAmount',
      header: 'OUTSTANDING',
      render: (row) => {
        const outstanding = Number(row.outstandingAmount ?? (Number(row.netAmount || 0) - Number(row.jamaAmount || 0)));
        const overdue = isOverdue(row);
        if (outstanding <= 0) {
          return <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '12px' }}>₹0.00 (PAID)</span>;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, color: overdue ? '#dc2626' : '#d97706' }}>
              ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {overdue && (
              <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600 }}>
                Overdue by {Math.ceil((now - new Date(row.dueDate!).getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'paymentStatus',
      header: 'PAYMENT',
      width: '110px',
      render: (row) => {
        const outstanding = Number(row.outstandingAmount ?? (Number(row.netAmount || 0) - Number(row.jamaAmount || 0)));
        const overdue = isOverdue(row);
        if (outstanding <= 0) {
          return <Badge variant="success">PAID</Badge>;
        }
        if (overdue) {
          return (
            <Badge variant="danger" style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>
              OVERDUE
            </Badge>
          );
        }
        return <Badge variant="warning">{outstanding < Number(row.netAmount) ? 'PARTIAL' : 'UNPAID'}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '180px',
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

      {/* Control Bar: Filter Tabs & Quality Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '12px 16px',
      }}>
        {/* Payment Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSearchParams({})}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: !filterParam ? 'var(--color-accent)' : 'transparent',
              color: !filterParam ? '#ffffff' : 'var(--color-text-secondary)',
            }}
          >
            All {isCustomer ? 'Sales' : 'Purchases'} ({(rawInvoices || []).length})
          </button>
          <button
            onClick={() => setSearchParams({ filter: 'pending' })}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: filterParam === 'pending' ? '#d97706' : 'transparent',
              color: filterParam === 'pending' ? '#ffffff' : 'var(--color-text-secondary)',
            }}
          >
            Pending Payments ({(rawInvoices || []).filter(i => Number(i.outstandingAmount ?? (Number(i.netAmount || 0) - Number(i.jamaAmount || 0))) > 0).length})
          </button>
          <button
            onClick={() => setSearchParams({ filter: 'overdue' })}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: filterParam === 'overdue' ? '#dc2626' : 'transparent',
              color: filterParam === 'overdue' ? '#ffffff' : 'var(--color-text-secondary)',
            }}
          >
            Overdue Only ({(rawInvoices || []).filter(isOverdue).length})
          </button>
        </div>

        {/* Quality Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            <Filter size={14} color="var(--color-accent)" />
            <span>Filter by Quality:</span>
          </div>
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">All Qualities ({availableQualities.length})</option>
            {availableQualities.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Month Filter Dropdown */}
        {showMonthFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              <Filter size={14} color="var(--color-accent)" />
              <span>Filter by Month:</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">All Months</option>
              <option value="0">Jan</option>
              <option value="1">Feb</option>
              <option value="2">Mar</option>
              <option value="3">Apr</option>
              <option value="4">May</option>
              <option value="5">Jun</option>
              <option value="6">Jul</option>
              <option value="7">Aug</option>
              <option value="8">Sep</option>
              <option value="9">Oct</option>
              <option value="10">Nov</option>
              <option value="11">Dec</option>
            </select>
          </div>
        )}
      </div>

      {/* Quality Performance Analytics Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.04) 0%, rgba(99, 102, 241, 0.04) 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--color-surface)', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <Sparkles size={16} color="var(--color-accent)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Active Quality Filter</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {selectedQuality === 'ALL' ? 'All Qualities' : selectedQuality}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--color-surface)', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <Scale size={16} color="#0284c7" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Total {isCustomer ? 'Sold' : 'Purchased'} Weight
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {qualitySummary.totalCarats.toFixed(3)} Carats
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--color-surface)', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <Layers size={16} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Total {isCustomer ? 'Sales' : 'Purchase'} Value
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>
              ₹{qualitySummary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <DataGrid<IInvoice>
        columns={columns}
        data={filteredInvoices}
        keyField="id"
        loading={loading}
        emptyTitle={
          selectedQuality !== 'ALL'
            ? `No ${isCustomer ? 'sales' : 'purchases'} found for "${selectedQuality}"`
            : filterParam
            ? `No ${filterParam} transactions found`
            : emptyTitle
        }
        emptyDescription={
          selectedQuality !== 'ALL'
            ? `There are no ${title.toLowerCase()} matching the quality "${selectedQuality}".`
            : filterParam
            ? `There are no ${filterParam} ${title.toLowerCase()} right now.`
            : emptyDesc
        }
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


