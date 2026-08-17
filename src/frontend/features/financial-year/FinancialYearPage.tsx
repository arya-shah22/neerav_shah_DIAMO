// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Financial Year Master Page
// Split layout: form entry (top) + grid listing (bottom)
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, CheckCircle, Lock, Plus, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIpc } from '../../hooks/useIpc';
import { useCompanyStore, formatFinancialYearLabel } from '../../state/company-store';
import { Button, DateInput, Badge, Select, Modal, useToast } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import {
  financialYearSchema,
  FinancialYearFormData,
  editFinancialYearSchema,
  EditFinancialYearFormData,
  suggestFinancialYearDates,
  getFinancialYearOptions,
} from './fy.schema';
import type { IFinancialYear } from './fy.types';

export const FinancialYearPage: React.FC = () => {
  const { showToast } = useToast();
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);
  const setActiveFinancialYear = useCompanyStore((s) => s.setActiveFinancialYear);

  const { data: years, loading, invoke: fetchYears } = useIpc<IFinancialYear[]>('fy:list');
  const { invoke: createYear, loading: creating } = useIpc<IFinancialYear>('fy:create');
  const { invoke: updateYear, loading: updating } = useIpc<IFinancialYear>('fy:update');
  const { invoke: activateYear } = useIpc<IFinancialYear>('fy:activate');
  const { invoke: toggleClosed } = useIpc<IFinancialYear>('fy:toggle-closed');
  const { invoke: deleteYear } = useIpc<void>('fy:delete');

  // Edit Modal State
  const [editingFy, setEditingFy] = useState<IFinancialYear | null>(null);

  const suggested = suggestFinancialYearDates();
  const fyOptions = getFinancialYearOptions();

  // Create Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FinancialYearFormData>({
    resolver: zodResolver(financialYearSchema),
    defaultValues: {
      fromDate: suggested.fromDate,
      toDate: suggested.toDate,
      isActive: false,
      gstActive: true,
      tcsActive: true,
      accountEffect: true,
      lockTransactionUptoDate: '',
    },
  });

  // Edit Form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    control: controlEdit,
    formState: { errors: editErrors },
  } = useForm<EditFinancialYearFormData>({
    resolver: zodResolver(editFinancialYearSchema),
    defaultValues: {
      fromDate: '',
      toDate: '',
      gstActive: true,
      tcsActive: true,
      accountEffect: true,
      lockTransactionUptoDate: '',
    },
  });

  const watchedFromDate = watch('fromDate');

  const handleYearSelect = (startYear: number) => {
    const option = fyOptions.find((o) => o.startYear === startYear);
    if (option) {
      setValue('fromDate', option.fromDate, { shouldValidate: true });
      setValue('toDate', option.toDate, { shouldValidate: true });
    }
  };

  const selectedStartYear = watchedFromDate
    ? Number(watchedFromDate.split('-')[0])
    : Number(suggested.fromDate.split('-')[0]);

  const loadYears = useCallback(async () => {
    if (!activeCompany) return;
    await fetchYears(activeCompany.id);
  }, [activeCompany, fetchYears]);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  const onSubmit = async (data: FinancialYearFormData) => {
    if (!activeCompany) {
      showToast('Select a company before creating a financial year', 'error');
      return;
    }

    const res = await createYear({
      companyId: activeCompany.id,
      data: {
        ...data,
        lockTransactionUptoDate: data.lockTransactionUptoDate || null,
      },
    });

    if (res.success && res.data) {
      showToast('Financial year created successfully', 'success');
      if (data.isActive) {
        setActiveFinancialYear(res.data);
      }
      const next = suggestFinancialYearDates(
        Number(data.fromDate.split('-')[0]) + 1,
      );
      reset({
        fromDate: next.fromDate,
        toDate: next.toDate,
        isActive: false,
        gstActive: true,
        tcsActive: true,
        accountEffect: true,
        lockTransactionUptoDate: '',
      });
      await loadYears();
    } else {
      showToast(res.error || 'Failed to create financial year', 'error');
    }
  };

  const handleOpenEdit = (fy: IFinancialYear) => {
    setEditingFy(fy);
    const fromStr = new Date(fy.fromDate).toISOString().split('T')[0];
    const toStr = new Date(fy.toDate).toISOString().split('T')[0];
    let lockStr = '';
    if (fy.lockTransactionUptoDate) {
      lockStr = new Date(fy.lockTransactionUptoDate).toISOString().split('T')[0];
    }
    resetEdit({
      fromDate: fromStr,
      toDate: toStr,
      gstActive: fy.gstActive,
      tcsActive: fy.tcsActive,
      accountEffect: fy.accountEffect,
      lockTransactionUptoDate: lockStr,
    });
  };

  const onSubmitEdit = async (data: EditFinancialYearFormData) => {
    if (!activeCompany || !editingFy) return;

    const res = await updateYear({
      id: editingFy.id,
      companyId: activeCompany.id,
      data: {
        ...data,
        lockTransactionUptoDate: data.lockTransactionUptoDate || null,
      },
    });

    if (res.success && res.data) {
      showToast('Financial year settings updated successfully', 'success');
      if (editingFy.isActive || activeFinancialYear?.id === editingFy.id) {
        setActiveFinancialYear(res.data);
      }
      setEditingFy(null);
      await loadYears();
    } else {
      showToast(res.error || 'Failed to update financial year', 'error');
    }
  };

  const handleActivate = async (fy: IFinancialYear) => {
    if (!activeCompany) return;
    const res = await activateYear({ id: fy.id, companyId: activeCompany.id });
    if (res.success && res.data) {
      setActiveFinancialYear(res.data);
      showToast('Financial year activated', 'success');
      await loadYears();
    } else {
      showToast(res.error || 'Failed to activate financial year', 'error');
    }
  };

  const handleToggleClosed = async (fy: IFinancialYear) => {
    if (!activeCompany) return;
    const res = await toggleClosed({ id: fy.id, companyId: activeCompany.id });
    if (res.success && res.data) {
      if (fy.isActive || activeFinancialYear?.id === fy.id) {
        setActiveFinancialYear(res.data);
      }
      showToast(fy.isClosed ? 'Financial year reopened' : 'Financial year closed', 'success');
      await loadYears();
    } else {
      showToast(res.error || 'Failed to update financial year', 'error');
    }
  };

  const handleDelete = async (fy: IFinancialYear) => {
    if (!activeCompany) return;
    const label = `FY ${formatFinancialYearLabel(fy)}`;
    if (!window.confirm(`Permanently delete ${label}? This cannot be undone.`)) {
      return;
    }

    const res = await deleteYear({ id: fy.id, companyId: activeCompany.id });
    if (res.success) {
      showToast(`${label} deleted successfully`, 'success');
      await loadYears();
    } else {
      showToast(res.error || 'Failed to delete financial year', 'error');
    }
  };

  const columns: Column<IFinancialYear>[] = [
    {
      key: 'period',
      header: 'PERIOD',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={14} color="var(--color-accent)" />
          <span style={{ fontWeight: 600 }}>FY {formatFinancialYearLabel(row)}</span>
        </div>
      ),
    },
    {
      key: 'fromDate',
      header: 'FROM',
      width: '120px',
      render: (row) => new Date(row.fromDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'toDate',
      header: 'TO',
      width: '120px',
      render: (row) => new Date(row.toDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'isActive',
      header: 'ACTIVE',
      width: '100px',
      align: 'center',
      render: (row) =>
        row.isActive ? (
          <Badge variant="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={10} /> Active
          </Badge>
        ) : (
          <Badge variant="default">Inactive</Badge>
        ),
    },
    {
      key: 'isClosed',
      header: 'STATUS',
      width: '100px',
      align: 'center',
      render: (row) => (
        <Badge variant={row.isClosed ? 'warning' : 'primary'}>
          {row.isClosed ? 'Closed' : 'Open'}
        </Badge>
      ),
    },
    {
      key: 'gstActive',
      header: 'GST',
      width: '70px',
      align: 'center',
      render: (row) => (row.gstActive ? 'Yes' : 'No'),
    },
    {
      key: 'tcsActive',
      header: 'TCS',
      width: '70px',
      align: 'center',
      render: (row) => (row.tcsActive ? 'Yes' : 'No'),
    },
    {
      key: 'lockTransactionUptoDate',
      header: 'LOCK UPTO',
      width: '120px',
      render: (row) =>
        row.lockTransactionUptoDate
          ? new Date(row.lockTransactionUptoDate).toLocaleDateString('en-IN')
          : '—',
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '240px',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
          {!row.isActive && !row.isClosed && (
            <Button variant="secondary" size="sm" onClick={() => handleActivate(row)} title="Set as active financial year">
              Activate
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleToggleClosed(row)}
            title={row.isClosed ? 'Reopen year for editing' : 'Close year to lock postings'}
          >
            <Lock size={13} />
            {row.isClosed ? 'Reopen' : 'Close'}
          </Button>
          <button
            onClick={() => handleOpenEdit(row)}
            title="Edit Financial Year Dates & Settings"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '6px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            title="Delete Financial Year"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              padding: '6px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  if (!activeCompany) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
          Financial Year Master
        </h1>
        <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
          Please select or create a company before configuring financial years.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
            Financial Year Master
          </h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Configure accounting periods for <strong>{activeCompany.companyName}</strong>
          </p>
        </div>
        <Button variant="secondary" onClick={loadYears} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Entry Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
        }}
      >
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
          New Financial Year
        </h2>

        {/* Quick year selector */}
        <div style={{ marginBottom: 'var(--spacing-md)', maxWidth: '420px' }}>
          <Select
            label="Quick Select Financial Year"
            value={String(selectedStartYear)}
            onChange={(v) => handleYearSelect(Number(v))}
            options={fyOptions.map((opt) => ({
              value: String(opt.startYear),
              label: `${opt.label} (01/04/${opt.startYear} – 31/03/${opt.startYear + 1})`,
            }))}
            searchable={false}
            clearable={false}
          />
          <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Select a year to auto-fill dates, or enter them manually below.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <Controller
            name="fromDate"
            control={control}
            render={({ field }) => (
              <DateInput
                label="Date From"
                required
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.fromDate?.message}
                hint="01/04/YYYY"
              />
            )}
          />
          <Controller
            name="toDate"
            control={control}
            render={({ field }) => (
              <DateInput
                label="Date To"
                required
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.toDate?.message}
                hint="31/03/YYYY"
              />
            )}
          />
          <Controller
            name="lockTransactionUptoDate"
            control={control}
            render={({ field }) => (
              <DateInput
                label="Lock Transactions Upto"
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.lockTransactionUptoDate?.message}
                hint="Optional — within FY range"
              />
            )}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" {...register('isActive')} style={{ accentColor: 'var(--color-accent)' }} />
            Set as active year
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" {...register('gstActive')} style={{ accentColor: 'var(--color-accent)' }} />
            GST Active
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" {...register('tcsActive')} style={{ accentColor: 'var(--color-accent)' }} />
            TCS Active
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" {...register('accountEffect')} style={{ accentColor: 'var(--color-accent)' }} />
            Account Effect
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              const s = suggestFinancialYearDates();
              reset({
                fromDate: s.fromDate,
                toDate: s.toDate,
                isActive: false,
                gstActive: true,
                tcsActive: true,
                accountEffect: true,
                lockTransactionUptoDate: '',
              });
            }}
          >
            Clear
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={creating}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} /> Save Financial Year
          </Button>
        </div>
      </form>

      {/* Grid Listing */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-md)',
        }}
      >
        <DataGrid
          columns={columns}
          data={years || []}
          keyField="id"
          loading={loading}
          emptyTitle="No Financial Years"
          emptyDescription="Create the first financial year for this company using the form above."
        />
      </div>

      {/* Edit Financial Year Modal */}
      {editingFy && (
        <Modal
          isOpen={true}
          onClose={() => setEditingFy(null)}
          title={`Edit FY ${formatFinancialYearLabel(editingFy)} Settings`}
          size="md"
        >
          <form onSubmit={handleSubmitEdit(onSubmitEdit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Editable Dates Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Controller
                name="fromDate"
                control={controlEdit}
                render={({ field }) => (
                  <DateInput
                    label="Date From (Start Date)"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={editErrors.fromDate?.message}
                    hint="Start of the financial period"
                  />
                )}
              />
              <Controller
                name="toDate"
                control={controlEdit}
                render={({ field }) => (
                  <DateInput
                    label="Date To (End Date)"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={editErrors.toDate?.message}
                    hint="End of the financial period"
                  />
                )}
              />
            </div>

            <div>
              <Controller
                name="lockTransactionUptoDate"
                control={controlEdit}
                render={({ field }) => (
                  <DateInput
                    label="Lock Transactions Upto Date"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={editErrors.lockTransactionUptoDate?.message}
                    hint="Freeze all historical vouchers dated on or before this date (leave blank for no lock)"
                  />
                )}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Compliance & Posting Flags:</span>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" {...registerEdit('gstActive')} style={{ accentColor: 'var(--color-accent)' }} />
                <span><strong>GST Active</strong> — Computes GST tax calculations on sales and purchases</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" {...registerEdit('tcsActive')} style={{ accentColor: 'var(--color-accent)' }} />
                <span><strong>TCS Active</strong> — Enforces TCS validation rules under Income Tax Sec 206C</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" {...registerEdit('accountEffect')} style={{ accentColor: 'var(--color-accent)' }} />
                <span><strong>Account Effect</strong> — Posts transaction balances to the General Ledger</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <Button variant="secondary" type="button" onClick={() => setEditingFy(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={updating}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
