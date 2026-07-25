// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Conversion List Page
// ═══════════════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, DataGrid, Badge, useToast, Column } from '../../components/ui';
import { IStockConversion } from './stock.types';

export const StockConversionListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId } = useActiveCompany();

  const { data: conversions, loading, invoke: fetchConversions } = useIpc<IStockConversion[]>('stock-conversion:list');
  const { invoke: deleteConversion } = useIpc('stock-conversion:delete');

  useEffect(() => {
    if (companyId) {
      fetchConversions({ companyId });
    }
  }, [companyId, fetchConversions]);

  const handleDelete = async (id: number, conversionNo: string) => {
    if (!confirm(`Are you sure you want to delete conversion ${conversionNo}? Output packets will be deleted and source packet reverted.`)) {
      return;
    }
    const res = await deleteConversion({ id, companyId });
    if (res.success) {
      showToast('Conversion deleted successfully', 'success');
      fetchConversions({ companyId });
    } else {
      showToast(res.error || 'Failed to delete conversion', 'error');
    }
  };

  const columns: Column<IStockConversion>[] = [
    {
      key: 'conversionNumber',
      header: 'Conversion No',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)' }}>
          {row.conversionNumber}
        </span>
      ),
    },
    {
      key: 'conversionDate',
      header: 'Date',
      render: (row) => new Date(row.conversionDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'sourcePacket',
      header: 'Source Packet',
      render: (row) => (
        <div>
          <a
            onClick={() => navigate(`/inventory/stock/${row.sourcePacketId}`)}
            style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}
          >
            {row.sourcePacket?.stockIdNumber || `#${row.sourcePacketId}`}
          </a>
          <div style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>
            {row.sourceQuality?.qualityName} ({Number(row.sourceCarats).toFixed(3)} ct)
          </div>
        </div>
      ),
    },
    {
      key: 'totalOutputCarats',
      header: 'Output Carats',
      render: (row) => `${Number(row.totalOutputCarats).toFixed(3)} ct (${row.outputItems?.length || 0} pkts)`,
    },
    {
      key: 'weightLoss',
      header: 'Loss',
      render: (row) => (
        <span style={{ color: Number(row.weightLoss) < 0 ? 'var(--color-danger)' : 'var(--color-warning, #f59e0b)' }}>
          {Number(row.weightLoss).toFixed(3)} ct ({Number(row.lossPercentage).toFixed(2)}%)
        </span>
      ),
    },
    {
      key: 'isFullConsumption',
      header: 'Mode',
      render: (row) => (
        <Badge variant={row.isFullConsumption ? 'info' : 'warning'}>
          {row.isFullConsumption ? 'Full' : 'Partial'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="ghost"
            onClick={() => navigate(`/inventory/stock-conversion/${row.id}`)}
            title="View Details"
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleDelete(row.id, row.conversionNumber)}
            title="Delete / Reverse Conversion"
          >
            <Trash2 size={16} color="var(--color-danger)" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={24} color="var(--color-accent)" /> Stock Quality Conversions
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Track Rough → Diamond transformations, processing loss, and yield details.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/inventory/stock-conversion/new')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> New Conversion
        </Button>
      </div>

      <DataGrid<IStockConversion>
        columns={columns}
        data={conversions || []}
        keyField="id"
        loading={loading}
        emptyTitle="No Stock Conversions"
        emptyDescription="No stock quality transformations recorded yet."
      />
    </div>
  );
};
