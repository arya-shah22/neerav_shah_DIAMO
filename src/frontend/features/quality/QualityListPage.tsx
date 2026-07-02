// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Quality List Page
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Gem } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Badge, Input, useToast } from '../../components/ui';
import { IQuality } from './quality.types';

const ROUTES = {
  new: '/masters/diamond/qualities/new',
  edit: (id: number) => `/masters/diamond/qualities/edit/${id}`,
} as const;

export const QualityListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [search, setSearch] = useState('');

  const { data: qualities, loading, invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const { invoke: deleteQuality } = useIpc('quality:delete');

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchQualities({ companyId, search: search || undefined });
  }, [companyId, fetchQualities, search]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: number, name: string) => {
    if (!companyId || !confirm(`Permanently delete quality "${name}"? This cannot be undone.`)) return;
    const res = await deleteQuality({ id, companyId });
    if (res.success) {
      showToast('Quality deleted', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const columns: Column<IQuality>[] = [
    {
      key: 'qualityName',
      header: 'QUALITY',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gem size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 500 }}>{row.qualityName}</span>
        </div>
      ),
    },
    { key: 'itemCode', header: 'ITEM CODE', mono: true },
    { key: 'hsnNumber', header: 'HSN' },
    { key: 'uqc', header: 'UQC', width: '80px' },
    {
      key: 'saleRate',
      header: 'SALE RATE',
      render: (row) => Number(row.saleRate).toFixed(2),
    },
    {
      key: 'gstPct',
      header: 'GST %',
      render: (row) => {
        const latest = row.gstHistory?.[0];
        return latest ? `${latest.gstPct}%` : '—';
      },
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
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id, row.qualityName)}>
            <Trash2 size={14} color="var(--color-danger)" />
          </Button>
        </div>
      ),
    },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company to manage qualities.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Quality Master</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>Diamond qualities for {activeCompany?.companyName}</p>
        </div>
        <Button variant="primary" onClick={() => navigate(ROUTES.new)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New Quality
        </Button>
      </div>

      <div style={{ maxWidth: '400px' }}>
        <Input placeholder="Search qualities..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataGrid
        columns={columns}
        data={qualities || []}
        keyField="id"
        loading={loading}
        emptyTitle="No qualities found"
        emptyDescription="Add your first diamond quality to get started."
      />
    </div>
  );
};
