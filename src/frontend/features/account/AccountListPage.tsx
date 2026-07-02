// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account List Page
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, Input, useToast } from '../../components/ui';
import { IAccount } from './account.types';

const ROUTES = {
  new: '/masters/accounting/accounts/new',
  edit: (id: number) => `/masters/accounting/accounts/edit/${id}`,
} as const;

export const AccountListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [search, setSearch] = useState('');

  const { data: accounts, loading, invoke: fetchAccounts } = useIpc<IAccount[]>('account:list');
  const { invoke: deleteAccount } = useIpc('account:delete');

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchAccounts({ companyId, search: search || undefined, isBroker: false });
  }, [companyId, fetchAccounts, search]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: number, name: string) => {
    if (!companyId || !confirm(`Permanently delete account "${name}"? This cannot be undone.`)) return;
    const res = await deleteAccount({ id, companyId });
    if (res.success) {
      showToast('Account deleted', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const columns: Column<IAccount>[] = [
    {
      key: 'accountName',
      header: 'ACCOUNT NAME',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 500 }}>{row.accountName}</span>
        </div>
      ),
    },
    {
      key: 'accountGroup',
      header: 'GROUP',
      render: (row) => row.accountGroup?.groupName || '—',
    },
    {
      key: 'city',
      header: 'CITY',
      render: (row) => row.city || '—',
    },
    {
      key: 'gstinNumber',
      header: 'GSTIN',
      render: (row) => row.gstinNumber || '—',
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
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company to manage accounts.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Account Master</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>Ledger accounts for {activeCompany?.companyName}</p>
        </div>
        <Button variant="primary" onClick={() => navigate(ROUTES.new)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New Account
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', maxWidth: '400px' }}>
        <Input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataGrid
        columns={columns}
        data={accounts || []}
        keyField="id"
        loading={loading}
        emptyTitle="No accounts found"
        emptyDescription="Create your first ledger account to get started."
      />
    </div>
  );
};
