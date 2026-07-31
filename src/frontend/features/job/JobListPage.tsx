// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Job Book List Page (Stage 8 / Phase 7)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Printer } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { Button, Input, useToast } from '../../components/ui';
import { JobType } from '@prisma/client';
import { IJobVoucher, JOB_TYPE_LABELS } from './job.types';
import { PrintTemplate } from '../../components/ui/PrintTemplate';

interface JobListPageProps {
  jobType: JobType;
}

export const JobListPage: React.FC<JobListPageProps> = ({ jobType }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { companyId } = useActiveCompany();
  const [search, setSearch] = useState('');
  const [printData, setPrintData] = useState<IJobVoucher | null>(null);
  const [printConfig, setPrintConfig] = useState<any>(null);
  const { invoke: getTemplateConfig } = useIpc<any>('print:get-template-config');

  const handlePrintClick = async (row: IJobVoucher) => {
    if (!companyId) return;
    const res = await getTemplateConfig({ companyId, voucherType: jobType });
    if (res.success && res.data) {
      setPrintConfig(res.data);
    }
    setPrintData(row);
  };

  const { data: vouchers, loading, invoke: fetchJobs } = useIpc<IJobVoucher[]>('job:list');
  const { invoke: deleteJob } = useIpc('job:delete');

  const refresh = useCallback(async () => {
    if (!companyId) return;
    await fetchJobs({ companyId, jobType });
  }, [companyId, jobType, fetchJobs]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id: number, number: string) => {
    if (!companyId || !confirm(`Delete Job Voucher ${number}? This will revert cost capitalization values from stock packets.`)) return;
    const res = await deleteJob({ id, companyId });
    if (res.success) {
      showToast('Job voucher deleted successfully', 'success');
      await refresh();
    } else {
      showToast(res.error || 'Delete failed', 'error');
    }
  };

  const getNewRoute = () => {
    return jobType === JobType.JOB_INCOME
      ? '/transactions/jobs/income/new'
      : '/transactions/jobs/expense/new';
  };

  const getViewRoute = (id: number) => {
    return jobType === JobType.JOB_INCOME
      ? `/transactions/jobs/income/view/${id}`
      : `/transactions/jobs/expense/view/${id}`;
  };

  const filteredData = (vouchers || []).filter((v) => {
    const term = search.toLowerCase();
    return (
      v.voucherNumber.toLowerCase().includes(term) ||
      v.billNumber.toLowerCase().includes(term) ||
      (v.party?.accountName || '').toLowerCase().includes(term)
    );
  });

  const columns: Column<IJobVoucher>[] = [
    {
      key: 'voucherNumber',
      header: 'VOUCHER NO',
      render: (row) => (
        <span
          onClick={() => navigate(getViewRoute(row.id))}
          style={{
            color: 'var(--color-accent)',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {row.voucherNumber}
        </span>
      ),
    },
    {
      key: 'billNumber',
      header: 'BILL NO',
      render: (row) => row.billNumber || '—',
    },
    {
      key: 'voucherDate',
      header: 'DATE',
      render: (row) => new Date(row.voucherDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'party',
      header: jobType === JobType.JOB_INCOME ? 'CUSTOMER' : 'WORKER / SENDER',
      render: (row) => row.party?.accountName || '—',
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
      key: 'actions',
      header: 'ACTIONS',
      width: '160px',
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="ghost" size="sm" onClick={() => handlePrintClick(row)} title="Print A4 Layout">
            <Printer size={14} color="var(--color-primary)" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(getViewRoute(row.id))} title="View Details">
            <FileText size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id, row.voucherNumber)} title="Delete">
            <Trash2 size={14} color="var(--color-danger)" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
            {JOB_TYPE_LABELS[jobType]} Book
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Manage {jobType === JobType.JOB_INCOME ? 'income services outward' : 'labor expenses and costing'} details.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate(getNewRoute())} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New Entry
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 240px', maxWidth: '320px' }}>
          <Input
            placeholder="Search voucher, bill, party..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={filteredData}
        keyField="id"
        loading={loading}
        emptyTitle="No entries found"
        emptyDescription={`Create your first job entry to get started.`}
      />

      {printData && (
        <PrintTemplate
          type="JOB"
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
