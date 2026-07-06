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
  const { companyId, isReady, activeCompany } = useActiveCompany();
  const [search, setSearch] = useState('');

  const { data: accounts, loading, invoke: fetchAccounts } = useIpc<IAccount[]>('account:list');
  const { invoke: deleteAccount } = useIpc('account:delete');
  const { invoke: updateStatus } = useIpc('account:update-status');

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchAccounts({ companyId, search: search || undefined });
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

  const handleToggleStatus = async (row: IAccount) => {
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

  const isPremadeAccount = (name: string) => {
    const lower = name.toLowerCase();
    return (
      lower.includes('cash') ||
      lower.includes('bank') ||
      lower.includes('cgst') ||
      lower.includes('sgst') ||
      lower.includes('igst') ||
      lower.includes('purchase') ||
      lower.includes('sales')
    );
  };

  const allAccounts = accounts || [];
  const systemAccounts = allAccounts.filter(a => isPremadeAccount(a.accountName));
  const userAccounts = allAccounts.filter(a => !isPremadeAccount(a.accountName));

  const columns: Column<IAccount>[] = [
    {
      key: 'accountName',
      header: 'ACCOUNT NAME',
      sortable: true,
      render: (row) => {
        const isPremade = isPremadeAccount(row.accountName);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--color-accent)" />
            <span style={{ fontWeight: 500 }}>{row.accountName}</span>
            {isPremade ? (
              <Badge variant="info" style={{ fontSize: '9px', opacity: 0.8 }}>System</Badge>
            ) : (
              <Badge variant="success" style={{ fontSize: '9px', opacity: 0.8 }}>User</Badge>
            )}
          </div>
        );
      },
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
      key: 'balance',
      header: 'RUNNING BALANCE',
      render: (row) => {
        const bal = row.balance ?? 0;
        if (bal > 0) {
          return (
            <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
              ₹ {bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Dr
            </span>
          );
        } else if (bal < 0) {
          return (
            <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>
              ₹ {Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr
            </span>
          );
        }
        return <span style={{ color: 'var(--color-text-secondary)' }}>₹ 0.00</span>;
      }
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

      {/* Section 1: System Pre-made Accounts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
          System Pre-made Accounts
        </h3>
        <DataGrid
          columns={columns}
          data={systemAccounts}
          keyField="id"
          loading={loading}
          emptyTitle="No System accounts"
          emptyDescription="Compulsory system accounts will generate automatically upon operations."
        />
      </div>

      {/* Section 2: User Made Accounts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
          User-made Accounts
        </h3>
        <DataGrid
          columns={columns}
          data={userAccounts}
          keyField="id"
          loading={loading}
          emptyTitle="No User accounts"
          emptyDescription="Create custom party or ledger accounts to see them here."
        />
      </div>
    </div>
  );
};
