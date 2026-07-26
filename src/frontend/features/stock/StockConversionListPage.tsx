// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Conversion List Page
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Eye, Pencil, Trash2 } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, DataGrid, Badge, Input, Select, useToast, Column } from '../../components/ui';
import { IStockConversion } from './stock.types';
import { IQuality } from '../quality/quality.types';

export const StockConversionListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId } = useActiveCompany();

  // Filters State
  const [search, setSearch] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  // IPC
  const { data: conversions, loading, invoke: fetchConversions } = useIpc<IStockConversion[]>('stock-conversion:list');
  const { data: qualities, invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const { invoke: deleteConversion } = useIpc('stock-conversion:delete');

  useEffect(() => {
    if (companyId) {
      fetchConversions({ companyId });
      fetchQualities({ companyId });
    }
  }, [companyId, fetchConversions, fetchQualities]);

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

  const filteredConversions = useMemo(() => {
    return (conversions || []).filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchNo = item.conversionNumber?.toLowerCase().includes(q);
        const matchPkt = item.sourcePacket?.stockIdNumber?.toLowerCase().includes(q);
        const matchQual = item.sourceQuality?.qualityName?.toLowerCase().includes(q);
        const matchNarration = item.narration?.toLowerCase().includes(q);
        if (!matchNo && !matchPkt && !matchQual && !matchNarration) return false;
      }
      if (modeFilter) {
        if (modeFilter === 'FULL' && !item.isFullConsumption) return false;
        if (modeFilter === 'PARTIAL' && item.isFullConsumption) return false;
      }
      if (qualityFilter) {
        if (item.sourceQualityId !== Number(qualityFilter)) return false;
      }
      return true;
    });
  }, [conversions, search, modeFilter, qualityFilter]);

  const qualityOptions = [
    { value: '', label: 'All Qualities' },
    ...(qualities || []).map((q) => ({ value: String(q.id), label: q.qualityName })),
  ];

  const modeOptions = [
    { value: '', label: 'All Modes' },
    { value: 'FULL', label: 'Full Consumption' },
    { value: 'PARTIAL', label: 'Partial Consumption' },
  ];

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
            onClick={() => navigate(`/inventory/stock-conversion/edit/${row.id}`)}
            title="Edit Conversion"
          >
            <Pencil size={16} color="var(--color-primary)" />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={24} color="var(--color-accent)" /> Stock Quality Conversions
            </h1>
            <Badge variant="primary" style={{ fontSize: '13px', padding: '3px 10px', fontWeight: 600 }}>
              {filteredConversions.length} {filteredConversions.length === 1 ? 'Conversion' : 'Conversions'}
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
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

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 240px', maxWidth: '320px' }}>
          <Input
            placeholder="Search conversion no, packet, quality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ minWidth: '180px' }}>
          <Select
            label="Quality Filter"
            value={qualityFilter}
            onChange={(v) => setQualityFilter(v || '')}
            options={qualityOptions}
            searchable={false}
            clearable={false}
          />
        </div>
        <div style={{ minWidth: '180px' }}>
          <Select
            label="Mode Filter"
            value={modeFilter}
            onChange={(v) => setModeFilter(v || '')}
            options={modeOptions}
            searchable={false}
            clearable={false}
          />
        </div>
      </div>

      <DataGrid<IStockConversion>
        columns={columns}
        data={filteredConversions}
        keyField="id"
        loading={loading}
        emptyTitle="No Stock Conversions"
        emptyDescription="No stock quality transformations matching your filters."
      />
    </div>
  );
};
