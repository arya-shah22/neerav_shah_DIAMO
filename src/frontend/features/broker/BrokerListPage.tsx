// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Broker List Page
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Handshake } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, useToast } from '../../components/ui';
import { IBroker } from './broker.types';

const ROUTES = {
  new: '/masters/business/brokers/new',
  edit: (id: number) => `/masters/business/brokers/edit/${id}`,
} as const;

export const BrokerListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeCompany, companyId, isReady } = useActiveCompany();

  const { data: brokers, loading, invoke: fetchBrokers } = useIpc<IBroker[]>('broker:list');
  const { invoke: deleteBroker } = useIpc('broker:delete');

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchBrokers(companyId);
  }, [companyId, fetchBrokers]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: number, name: string) => {
    if (!companyId || !confirm(`Permanently delete broker "${name}"? This cannot be undone.`)) return;
    const res = await deleteBroker({ id, companyId });
    if (res.success) {
      showToast('Broker deleted', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const columns: Column<IBroker>[] = [
    {
      key: 'accountName',
      header: 'BROKER NAME',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Handshake size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 500 }}>{row.accountName}</span>
        </div>
      ),
    },
    {
      key: 'brokeragePct',
      header: 'BROKERAGE %',
      render: (row) => `${row.brokerProfile?.brokeragePct ?? 0}%`,
    },
    {
      key: 'addLess',
      header: 'ADD/LESS',
      render: (row) => row.brokerProfile?.addLess || '—',
    },
    {
      key: 'mobile',
      header: 'MOBILE',
      render: (row) => row.mobile || '—',
    },
    {
      key: 'status',
      header: 'STATUS',
      width: '100px',
      render: (row) => {
        const variant = row.status === 'ACTIVE' ? 'success' : row.status === 'INACTIVE' ? 'warning' : 'danger';
        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '120px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.edit(row.id))}>
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id, row.accountName)}>
            <Trash2 size={14} color="var(--color-danger)" />
          </Button>
        </div>
      ),
    },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company to manage brokers.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Broker Master</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>Brokers for {activeCompany?.companyName}</p>
        </div>
        <Button variant="primary" onClick={() => navigate(ROUTES.new)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New Broker
        </Button>
      </div>

      <DataGrid
        columns={columns}
        data={brokers || []}
        keyField="id"
        loading={loading}
        emptyTitle="No brokers found"
        emptyDescription="Add your first broker to get started."
      />
    </div>
  );
};
