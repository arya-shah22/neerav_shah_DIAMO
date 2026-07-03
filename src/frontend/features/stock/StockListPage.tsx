// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock List Page (Stage 3)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Gem, Eye } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, Input, Select, Modal, useToast } from '../../components/ui';
import { IQuality } from '../quality/quality.types';
import {
  IStockPacket,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_BADGE_VARIANT,
  EDITABLE_STOCK_STATUSES,
  StockCategory,
  StockStatus,
} from './stock.types';

const STATUS_OPTIONS = Object.entries(STOCK_STATUS_LABELS)
  .filter(([value]) => value !== 'ARCHIVED')
  .map(([value, label]) => ({ value, label }));

type StatusModalStep = 'confirm' | 'select';

const ROUTES = {
  new: '/inventory/stock/new',
  edit: (id: number) => `/inventory/stock/edit/${id}`,
  view: (id: number) => `/inventory/stock/${id}`,
} as const;

export const StockListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<StockCategory | ''>('');
  const [statusModal, setStatusModal] = useState<{
    packet: IStockPacket;
    step: StatusModalStep;
  } | null>(null);
  const [pendingStatus, setPendingStatus] = useState<StockStatus>('AVAILABLE');
  const [statusRemarks, setStatusRemarks] = useState('');

  const { data: stock, loading, invoke: fetchStock } = useIpc<IStockPacket[]>('stock:list');
  const { invoke: deleteStock } = useIpc('stock:delete');
  const { invoke: updateStock, loading: updatingStatus } = useIpc('stock:update');
  const { invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const [qualities, setQualities] = useState<IQuality[]>([]);

  useEffect(() => {
    if (!companyId) return;
    fetchQualities({ companyId }).then((res) => {
      if (res.success && res.data) setQualities(res.data);
    });
  }, [companyId, fetchQualities]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchStock({
      companyId,
      search: search || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    });
  }, [companyId, fetchStock, search, statusFilter, categoryFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: number, stockId: string) => {
    if (!companyId || !confirm(`Archive stock packet "${stockId}"? This cannot be undone.`)) return;
    const res = await deleteStock({ id, companyId });
    if (res.success) {
      showToast('Stock packet archived', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const closeStatusModal = () => {
    setStatusModal(null);
    setStatusRemarks('');
  };

  const openStatusChange = (packet: IStockPacket) => {
    if (!EDITABLE_STOCK_STATUSES.includes(packet.currentStatus)) {
      showToast(
        `Cannot change status for ${STOCK_STATUS_LABELS[packet.currentStatus].toLowerCase()} stock`,
        'error',
      );
      return;
    }
    setStatusModal({ packet, step: 'confirm' });
  };

  const confirmStatusChange = () => {
    if (!statusModal) return;
    setPendingStatus(statusModal.packet.currentStatus);
    setStatusRemarks('');
    setStatusModal({ ...statusModal, step: 'select' });
  };

  const saveStatusChange = async () => {
    if (!statusModal || !companyId) return;
    if (pendingStatus === statusModal.packet.currentStatus) {
      showToast('Status is unchanged', 'info');
      closeStatusModal();
      return;
    }
    const res = await updateStock({
      id: statusModal.packet.id,
      companyId,
      data: {
        currentStatus: pendingStatus,
        statusRemarks: statusRemarks.trim() || 'Status updated from inventory list',
      },
    });
    if (res.success) {
      showToast(
        `Status updated to ${STOCK_STATUS_LABELS[pendingStatus]}`,
        'success',
      );
      closeStatusModal();
      await refresh();
    } else {
      showToast(res.error || 'Status update failed', 'error');
    }
  };

  const columns: Column<IStockPacket>[] = [
    {
      key: 'stockIdNumber',
      header: 'STOCK ID',
      sortable: true,
      mono: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gem size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 600 }}>{row.stockIdNumber}</span>
        </div>
      ),
    },
    {
      key: 'quality',
      header: 'QUALITY',
      render: (row) => row.quality?.qualityName ?? '—',
    },
    { key: 'shape', header: 'SHAPE', render: (row) => row.shape ?? '—' },
    {
      key: 'caratWeight',
      header: 'CARATS',
      render: (row) => Number(row.caratWeight).toFixed(3),
    },
    { key: 'color', header: 'COLOR', render: (row) => row.color ?? '—' },
    { key: 'clarity', header: 'CLARITY', render: (row) => row.clarity ?? '—' },
    {
      key: 'certificateNumber',
      header: 'CERT #',
      mono: true,
      render: (row) => row.certificateNumber ?? '—',
    },
    {
      key: 'currentStatus',
      header: 'STATUS',
      width: '110px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openStatusChange(row);
          }}
          title="Click to change status"
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: EDITABLE_STOCK_STATUSES.includes(row.currentStatus) ? 'pointer' : 'not-allowed',
            opacity: EDITABLE_STOCK_STATUSES.includes(row.currentStatus) ? 1 : 0.7,
          }}
        >
          <Badge variant={STOCK_STATUS_BADGE_VARIANT[row.currentStatus]}>
            {STOCK_STATUS_LABELS[row.currentStatus]}
          </Badge>
        </button>
      ),
    },
    {
      key: 'registrationDate',
      header: 'DATE',
      render: (row) => new Date(row.registrationDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '140px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.view(row.id))} title="View">
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.edit(row.id))} title="Edit">
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id, row.stockIdNumber)} title="Archive">
            <Trash2 size={14} color="var(--color-danger)" />
          </Button>
        </div>
      ),
    },
  ];

  const statusFilterOptions = [
    { value: '', label: 'All statuses' },
    ...Object.entries(STOCK_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const categoryFilterOptions = [
    { value: '', label: 'All categories' },
    { value: 'CERTIFIED', label: 'Certified' },
    { value: 'NON_CERTIFIED', label: 'Non-Certified' },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company to manage inventory.</p>;
  }

  if (qualities.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Diamond Inventory</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Create at least one quality master before registering stock packets.
        </p>
        <Button variant="primary" onClick={() => navigate('/masters/diamond/qualities/new')}>
          Add Quality
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Diamond Inventory</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Stock packets for {activeCompany?.companyName}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate(ROUTES.new)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New Stock Packet
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 240px', maxWidth: '320px' }}>
          <Input placeholder="Search stock ID, cert, shape, color..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ minWidth: '180px' }}>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StockStatus | '')}
            options={statusFilterOptions}
            searchable={false}
            clearable={false}
            placeholder="All statuses"
          />
        </div>
        <div style={{ minWidth: '180px' }}>
          <Select
            label="Category"
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v as StockCategory | '')}
            options={categoryFilterOptions}
            searchable={false}
            clearable={false}
            placeholder="All categories"
          />
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={stock || []}
        keyField="id"
        loading={loading}
        emptyTitle="No stock packets found"
        emptyDescription="Register your first diamond stock packet to get started."
      />

      <Modal
        isOpen={statusModal?.step === 'confirm'}
        onClose={closeStatusModal}
        title="Change Stock Status"
        size="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={closeStatusModal}>No</Button>
            <Button variant="primary" onClick={confirmStatusChange}>Yes</Button>
          </>
        )}
      >
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Do you want to change the status for stock packet{' '}
          <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>
            {statusModal?.packet.stockIdNumber}
          </strong>
          ?
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>
          Current status:{' '}
          <Badge variant={STOCK_STATUS_BADGE_VARIANT[statusModal?.packet.currentStatus ?? 'AVAILABLE']}>
            {STOCK_STATUS_LABELS[statusModal?.packet.currentStatus ?? 'AVAILABLE']}
          </Badge>
        </p>
      </Modal>

      <Modal
        isOpen={statusModal?.step === 'select'}
        onClose={closeStatusModal}
        title="Select New Status"
        size="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={closeStatusModal} disabled={updatingStatus}>Cancel</Button>
            <Button variant="primary" onClick={saveStatusChange} loading={updatingStatus}>
              Update Status
            </Button>
          </>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>
            Stock ID:{' '}
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)' }}>
              {statusModal?.packet.stockIdNumber}
            </span>
          </p>
          <Select
            label="New Status"
            value={pendingStatus}
            onChange={(v) => setPendingStatus(v as StockStatus)}
            options={STATUS_OPTIONS}
            searchable={false}
            clearable={false}
          />
          <Input
            label="Remarks (optional)"
            placeholder="Reason for status change"
            value={statusRemarks}
            onChange={(e) => setStatusRemarks(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
