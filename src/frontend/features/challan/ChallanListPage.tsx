// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Challan List Page (Stage 6)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Printer, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, Input, Select, useToast } from '../../components/ui';
import { PrintTemplate } from '../../components/ui/PrintTemplate';
import { IChallan, ChallanPurpose, ChallanStatus, CHALLAN_PURPOSE_LABELS, CHALLAN_STATUS_LABELS, CHALLAN_STATUS_BADGE_VARIANT } from './challan.types';

interface ListPageProps {
  purpose: ChallanPurpose;
}

export const ChallanListPage: React.FC<ListPageProps> = ({ purpose }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId, isReady } = useActiveCompany();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<IChallan | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [returnItems, setReturnItems] = useState<{ id: number; rowNumber: number; qualityName: string; carats: number; pieces: number; returnedCarats: number; returnedPieces: number }[]>([]);

  const [printData, setPrintData] = useState<any>(null);
  const [printConfig, setPrintConfig] = useState<any>(null);

  const { data: challans, loading, invoke: fetchChallans } = useIpc<IChallan[]>('challan:list');
  const { invoke: deleteChallan } = useIpc('challan:delete');
  const { invoke: updateChallanStatus } = useIpc('challan:update-status');
  const { invoke: getTemplateConfig } = useIpc<any>('print:get-template-config');

  const handlePrintClick = async (row: IChallan) => {
    if (!companyId) return;
    let vType = 'MEMO_TRADING';
    if (purpose === 'JOB_WORK') vType = 'MEMO_JOB_WORK';
    else if (purpose === 'SALE_ORDER') vType = 'MEMO_SALE_ORDER';
    else if (purpose === 'PURCHASE_ORDER') vType = 'MEMO_PURCHASE_ORDER';

    const res = await getTemplateConfig({ companyId, voucherType: vType });
    if (res?.success && res?.data) {
      setPrintConfig(res.data);
    }

    const challanPrintData = {
      voucherNumber: row.voucherNumber,
      voucherDate: row.challanDate,
      expectedReturnDate: row.expectedReturnDate,
      invoiceType: CHALLAN_PURPOSE_LABELS[purpose].toUpperCase(),
      party: row.party ? {
        accountName: row.party.accountName,
        city: row.party.city,
        mobile: row.party.mobile,
        gstinNumber: row.party.gstinNumber,
      } : { accountName: 'Cash Account' },
      items: (row.items || []).map((item, idx) => ({
        srNo: idx + 1,
        hsnCode: '7102',
        qualityName: item.quality?.qualityName || 'Item',
        carats: item.carats || 0,
        pieces: item.pieces || 0,
        rate: item.rate || 0,
        amount: item.amount || 0,
        remarks: item.remarks || '',
      })),
      netAmount: row.totalAmount || 0,
    };

    setPrintData(challanPrintData);
  };

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchChallans({
      companyId,
      purpose,
      search: search || undefined,
      status: statusFilter || undefined,
    });
  }, [companyId, purpose, fetchChallans, search, statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id: number, number: string) => {
    if (!companyId || !confirm(`Delete Challan ${number}? This will revert any reserved stock packets.`)) return;
    const res = await deleteChallan({ id, companyId });
    if (res.success) {
      showToast('Challan deleted successfully', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const executeStatusUpdate = async (status: string, partialItems?: typeof returnItems) => {
    if (!companyId || !selectedChallan) return;
    const res = await updateChallanStatus({
      id: selectedChallan.id,
      companyId,
      status,
      items: partialItems ? partialItems.map(it => ({
        id: it.id,
        returnedCarats: Number(it.returnedCarats) || 0,
        returnedPieces: Number(it.returnedPieces) || 0
      })) : undefined
    });
    if (res.success) {
      showToast(`Challan status updated successfully`, 'success');
      setShowStatusModal(false);
      setSelectedChallan(null);
      await refresh();
    } else {
      showToast(res.error || 'Failed to update status', 'error');
    }
  };

  const handleStatusChangeInline = async (row: IChallan, newStatus: string) => {
    if (!newStatus || newStatus === row.status) return;
    setSelectedChallan(row);
    setTargetStatus(newStatus);

    if (newStatus === 'PARTIALLY_RETURNED') {
      const itemsToReturn = row.items.map(it => ({
        id: it.id || 0,
        rowNumber: it.rowNumber || 1,
        qualityName: it.quality?.qualityName || `Item #${it.rowNumber}`,
        carats: Number(it.carats) || 0,
        pieces: Number(it.pieces) || 1,
        returnedCarats: Number(it.returnedCarats) || 0,
        returnedPieces: Number(it.returnedPieces) || 0,
      }));
      setReturnItems(itemsToReturn);
      setShowStatusModal(true);
    } else if (newStatus === 'RETURNED') {
      if (confirm('Mark this challan as completely returned? Reserved packets will become AVAILABLE.')) {
        const res = await updateChallanStatus({
          id: row.id,
          companyId,
          status: newStatus
        });
        if (res.success) {
          showToast(`Challan status updated successfully`, 'success');
          await refresh();
        } else {
          showToast(res.error || 'Failed to update status', 'error');
        }
      }
    } else {
      if (confirm(`Change status to ${CHALLAN_STATUS_LABELS[newStatus as ChallanStatus]}?`)) {
        const res = await updateChallanStatus({
          id: row.id,
          companyId,
          status: newStatus
        });
        if (res.success) {
          showToast(`Challan status updated successfully`, 'success');
          await refresh();
        } else {
          showToast(res.error || 'Failed to update status', 'error');
        }
      }
    }
  };

  const getNewRoute = () => {
    switch (purpose) {
      case 'TRADING_JHANGHAD':
        return '/transactions/challans/trading/new';
      case 'JOB_WORK':
        return '/transactions/challans/job-work/new';
      case 'SALE_ORDER':
        return '/transactions/orders/sales/new';
      case 'PURCHASE_ORDER':
        return '/transactions/orders/purchases/new';
      default:
        return '/transactions/challans/trading/new';
    }
  };

  const getEditRoute = (id: number) => {
    switch (purpose) {
      case 'TRADING_JHANGHAD':
        return `/transactions/challans/trading/${id}/edit`;
      case 'JOB_WORK':
        return `/transactions/challans/job-work/${id}/edit`;
      case 'SALE_ORDER':
        return `/transactions/orders/sales/${id}/edit`;
      case 'PURCHASE_ORDER':
        return `/transactions/orders/purchases/${id}/edit`;
      default:
        return `/transactions/challans/trading/${id}/edit`;
    }
  };



  const columns: Column<IChallan>[] = [
    {
      key: 'voucherNumber',
      header: 'VOUCHER NO',
      sortable: true,
      mono: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 600 }}>{row.voucherNumber}</span>
        </div>
      ),
    },
    {
      key: 'challanDate',
      header: 'DATE',
      render: (row) => new Date(row.challanDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'party',
      header: 'PARTY (TO)',
      render: (row) => row.party?.accountName || row.partyName || '—',
    },
    {
      key: 'city',
      header: 'CITY',
      render: (row) => row.party?.city || '—',
    },
    {
      key: 'totalCarats',
      header: 'TOTAL CARATS',
      render: (row) => Number(row.totalCarats).toFixed(3),
    },
    {
      key: 'totalAmount',
      header: 'TOTAL AMOUNT',
      render: (row) => `₹ ${Number(row.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'status',
      header: 'STATUS',
      width: '280px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant={CHALLAN_STATUS_BADGE_VARIANT[row.status]}>
            {CHALLAN_STATUS_LABELS[row.status]}
          </Badge>
          <div style={{ width: '130px' }}>
            <Select
              value={row.status}
              onChange={(newStatus) => handleStatusChangeInline(row, newStatus)}
              options={Object.entries(CHALLAN_STATUS_LABELS).map(([val, lbl]) => ({ value: val, label: lbl }))}
              searchable={false}
              clearable={false}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '150px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="ghost" size="sm" onClick={() => handlePrintClick(row)} title="View & Print">
            <Printer size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(getEditRoute(row.id))} title="Edit">
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id, row.voucherNumber)} title="Delete">
            <Trash2 size={14} color="var(--color-danger)" />
          </Button>
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Object.entries(CHALLAN_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
            {CHALLAN_PURPOSE_LABELS[purpose]} Book
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Manage {CHALLAN_PURPOSE_LABELS[purpose].toLowerCase()} entries for company
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate(getNewRoute())} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New Entry
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 240px', maxWidth: '320px' }}>
          <Input placeholder="Search voucher number, party..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ minWidth: '180px' }}>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v || '')}
            options={statusOptions}
            searchable={false}
            clearable={false}
          />
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={challans || []}
        keyField="id"
        loading={loading}
        emptyTitle="No entries found"
        emptyDescription={`Create your first ${CHALLAN_PURPOSE_LABELS[purpose].toLowerCase()} to get started.`}
      />

      {/* Partial Returns Dialog Modal */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '650px',
            width: '100%',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-primary)' }}>
              Register Goods Return (Voucher: {selectedChallan?.voucherNumber})
            </h3>
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Specify the exact carat weight and number of pieces returned by the client.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: 'var(--text-label)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px' }}>Quality Name</th>
                  <th style={{ padding: '8px 4px', width: '100px' }}>Issued Carats</th>
                  <th style={{ padding: '8px 4px', width: '80px' }}>Issued Pcs</th>
                  <th style={{ padding: '8px 4px', width: '120px' }}>Returned Carats</th>
                  <th style={{ padding: '8px 4px', width: '100px' }}>Returned Pcs</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.qualityName}</td>
                    <td style={{ padding: '8px 4px' }}>{row.carats.toFixed(3)}</td>
                    <td style={{ padding: '8px 4px' }}>{row.pieces}</td>
                    <td style={{ padding: '4px' }}>
                      <Input
                        type="number"
                        value={row.returnedCarats || ''}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].returnedCarats = Number(e.target.value) || 0;
                          setReturnItems(updated);
                        }}
                      />
                    </td>
                    <td style={{ padding: '4px' }}>
                      <Input
                        type="number"
                        value={row.returnedPieces || ''}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].returnedPieces = Number(e.target.value) || 0;
                          setReturnItems(updated);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="ghost" onClick={() => { setShowStatusModal(false); setSelectedChallan(null); setTargetStatus(''); }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => executeStatusUpdate(targetStatus, returnItems)}>
                Save Returns & Update Status
              </Button>
            </div>
          </div>
        </div>
      )}
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
