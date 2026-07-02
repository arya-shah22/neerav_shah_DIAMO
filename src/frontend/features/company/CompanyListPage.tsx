// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — CompanyListPage UI Component
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Building, CheckCircle } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, useToast } from '../../components/ui';
import { useCompanyStore } from '../../state/company-store';
import { loadCompanyContext } from '../../services/company-context';
import { ICompany } from './company.types';

const ROUTES = {
  new: '/masters/business/companies/new',
  edit: (id: number) => `/masters/business/companies/edit/${id}`,
} as const;

export const CompanyListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const setCompanies = useCompanyStore((s) => s.setCompanies);

  const { data: companies, loading, invoke: fetchCompanies } = useIpc<ICompany[]>('company:list');
  const { invoke: deleteCompany } = useIpc<void>('company:delete');

  const refresh = useCallback(async () => {
    const res = await fetchCompanies();
    if (res.success && res.data) {
      setCompanies(res.data);
    }
  }, [fetchCompanies, setCompanies]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Permanently delete ${name}? All masters for this company will be removed. This cannot be undone.`)) return;

    const res = await deleteCompany(id);
    if (res.success) {
      showToast('Company deleted successfully', 'success');
      await refresh();
      await loadCompanyContext();
    } else {
      showToast(res.error || 'Failed to delete company', 'error');
    }
  };

  const columns: Column<ICompany>[] = [
    {
      key: 'companyCode',
      header: 'CODE',
      width: '100px',
      mono: true,
      sortable: true,
    },
    {
      key: 'companyName',
      header: 'COMPANY NAME',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 500 }}>{row.companyName}</span>
          {row.isDefault && (
            <Badge variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '1px 6px', fontSize: '10px' }}>
              <CheckCircle size={10} /> Default
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'city',
      header: 'CITY',
      sortable: true,
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
      width: '120px',
      sortable: true,
      render: (row) => {
        const variant = row.status === 'ACTIVE' ? 'success' : row.status === 'INACTIVE' ? 'warning' : 'danger';
        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '150px',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(ROUTES.edit(row.id));
            }}
            title="Edit Company"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: 4,
            }}
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id, row.companyName);
            }}
            title="Delete Company"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              padding: 4,
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
            Company Master
          </h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Configure legal entities, contact details, tax identification, and bank credentials.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate(ROUTES.new)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Add Company
        </Button>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)' }}>
        <DataGrid
          columns={columns}
          data={companies || []}
          keyField="id"
          loading={loading}
          emptyTitle="No Companies Found"
          emptyDescription="Create your first legal entity to get started."
          emptyAction={{
            label: 'Add Company',
            onClick: () => navigate(ROUTES.new),
          }}
        />
      </div>
    </div>
  );
};
