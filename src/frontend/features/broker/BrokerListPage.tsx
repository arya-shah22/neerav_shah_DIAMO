// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Broker List Page
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Handshake, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, Input, useToast } from '../../components/ui';
import { IBroker } from './broker.types';

const ROUTES = {
  new: '/masters/business/brokers/new',
  edit: (id: number) => `/masters/business/brokers/edit/${id}`,
} as const;

export const BrokerListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [search, setSearch] = useState('');

  const { data: brokers, loading, invoke: fetchBrokers } = useIpc<IBroker[]>('broker:list');
  const { invoke: deleteBroker } = useIpc('broker:delete');
  const { invoke: updateStatus } = useIpc('account:update-status');

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchBrokers(companyId);
  }, [companyId, fetchBrokers]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const handleToggleStatus = async (row: IBroker) => {
    if (!companyId) return;
    const newStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await updateStatus({ id: row.id, companyId, status: newStatus });
    if (res.success) {
      showToast(`Status updated to ${newStatus}`, 'success');
      await refresh();
    } else {
      showToast(res.error || 'Failed to update status', 'error');
    }
  };

  const filteredBrokers = useMemo(() => {
    if (!brokers) return [];
    if (!search.trim()) return brokers;
    const q = search.toLowerCase().trim();
    return brokers.filter((b) => {
      const nameMatch = b.accountName?.toLowerCase().includes(q);
      const mobileMatch = b.mobile?.toLowerCase().includes(q);
      const cityMatch = b.city?.toLowerCase().includes(q);
      return nameMatch || mobileMatch || cityMatch;
    });
  }, [brokers, search]);

  const columns: Column<IBroker>[] = [
    {
      key: 'accountName',
      header: 'BROKER NAME',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Handshake size={16} color="var(--color-accent)" />
          <span
            onClick={() => navigate(`/reports/ledger?accountId=${row.id}`)}
            title={`View Ledger Statement for ${row.accountName}`}
            style={{ fontWeight: 500, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecorationColor = 'var(--color-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecorationColor = 'transparent')}
          >
            {row.accountName}
          </span>
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
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(row);
            }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            title="Click to toggle status"
          >
            <Badge variant={variant}>{row.status}</Badge>
          </button>
        );
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '140px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/reports/ledger?accountId=${row.id}`)}
            title="View Broker Ledger Statement"
          >
            <FileText size={14} color="var(--color-primary)" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.edit(row.id))} title="Edit Broker">
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id, row.accountName)} title="Delete Broker">
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Broker Master</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>Brokers for {activeCompany?.companyName}</p>
        </div>
        <Button variant="primary" onClick={() => navigate(ROUTES.new)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New Broker
        </Button>
      </div>

      {/* Search Input Bar */}
      <div style={{ display: 'flex', gap: '12px', maxWidth: '380px' }}>
        <Input
          placeholder="Search brokers by name or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataGrid
        columns={columns}
        data={filteredBrokers}
        keyField="id"
        loading={loading}
        emptyTitle="No brokers found"
        emptyDescription="Add your first broker or refine your search query."
      />
    </div>
  );
};
