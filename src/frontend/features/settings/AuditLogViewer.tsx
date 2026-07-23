// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Audit Log Trails Viewer Dashboard
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { Button, Input, Select, useToast } from '../../components/ui';
import { DataGrid } from '../../components/ui/DataGrid';
import { Search, RefreshCw, Eye, X } from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { showToast } = useToast();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit] = useState(50);
  const [offset] = useState(0);

  // Modal detail view state
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // IPC hook
  const { data, loading, invoke: fetchLogs } = useIpc<any>('audit:list');

  const loadLogs = React.useCallback(async () => {
    const res = await fetchLogs({
      entityType: entityType || undefined,
      action: action || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      searchQuery: searchQuery || undefined,
      limit,
      offset,
    });
    if (!res.success) {
      showToast(res.error || 'Failed to retrieve audit log history', 'error');
    }
  }, [entityType, action, startDate, endDate, searchQuery, limit, offset, fetchLogs, showToast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const columns = [
    {
      key: 'createdAt',
      header: 'DATE & TIME',
      width: '180px',
      render: (row: any) => new Date(row.createdAt).toLocaleString('en-IN'),
    },
    {
      key: 'action',
      header: 'ACTION',
      width: '110px',
      render: (row: any) => {
        let bg = '#eff6ff';
        let color = '#1d4ed8';
        if (row.action === 'DELETE') {
          bg = '#fef2f2';
          color = '#dc2626';
        } else if (row.action === 'CREATE') {
          bg = '#f0fdf4';
          color = '#16a34a';
        } else if (row.action === 'PRINT' || row.action === 'EXPORT') {
          bg = '#faf5ff';
          color = '#7e22ce';
        }
        return (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '4px',
            background: bg,
            color: color,
            textTransform: 'uppercase',
          }}>
            {row.action}
          </span>
        );
      },
    },
    {
      key: 'entityType',
      header: 'MODULE / ENTITY',
      width: '180px',
      render: (row: any) => {
        const doc = row.afterValue || row.beforeValue;
        const vNum = doc?.voucherNumber || doc?.billNumber || doc?.challanNumber;
        const displayLabel = vNum ? `${row.entityType} (${vNum})` : `${row.entityType} (#${row.entityId})`;
        return (
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {displayLabel}
          </span>
        );
      },
    },
    {
      key: 'userId',
      header: 'USER ID',
      width: '90px',
      render: (row: any) => `User #${row.userId}`,
    },
    {
      key: 'overrideReason',
      header: 'OVERRIDE REASON / DESCRIPTION',
      width: '280px',
      render: (row: any) => (
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
          {row.overrideReason || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'SNAPSHOT',
      width: '100px',
      render: (row: any) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSelectedLog(row)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
        >
          <Eye size={12} /> View Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* Filters header section */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          
          {/* Search bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Search Logs</label>
            <div style={{ position: 'relative' }}>
              <Input
                placeholder="Search reason or module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            </div>
          </div>

          {/* Module filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Module</label>
            <Select
              value={entityType}
              onChange={(val) => setEntityType(val)}
              options={[
                { value: '', label: 'All Modules' },
                { value: 'SYSTEM_PREFERENCES', label: 'System Preferences' },
                { value: 'SALE_INVOICE', label: 'Sale Invoices' },
                { value: 'PURCHASE_INVOICE', label: 'Purchase Invoices' },
                { value: 'STOCK_PACKET', label: 'Diamond Packets' },
                { value: 'CHALLAN_VOUCHER', label: 'Challans' },
                { value: 'USER', label: 'User Accounts' },
              ]}
            />
          </div>

          {/* Action Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Action</label>
            <Select
              value={action}
              onChange={(val) => setAction(val)}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'CREATE', label: 'CREATE' },
                { value: 'UPDATE', label: 'UPDATE' },
                { value: 'DELETE', label: 'DELETE' },
                { value: 'PRINT', label: 'PRINT' },
                { value: 'EXPORT', label: 'EXPORT' },
              ]}
            />
          </div>

          {/* Date Range Start */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Date Range End */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="secondary" onClick={() => {
            setSearchQuery('');
            setEntityType('');
            setAction('');
            setStartDate('');
            setEndDate('');
          }}>
            Clear Filters
          </Button>
          <Button variant="primary" onClick={loadLogs} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Refresh Logs
          </Button>
        </div>
      </div>

      {/* Audit Log DataGrid list */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <DataGrid
          columns={columns}
          data={data?.records || []}
          keyField="id"
          loading={loading}
          emptyTitle="No audit logs recorded"
          emptyDescription="Audit records matching selected parameters will be displayed here."
        />
      </div>

      {/* Snapshot Details Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid var(--color-border)',
              background: '#fafafa',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                Audit Log Details (Log ID #{selectedLog.id})
              </h3>
              <Button variant="ghost" onClick={() => setSelectedLog(null)} style={{ padding: '4px' }}>
                <X size={18} />
              </Button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>ENTITY TYPE</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedLog.entityType}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>ENTITY ID</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedLog.entityId}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>IP ADDRESS</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedLog.ipAddress || 'Localhost / Unknown'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>DATE TIME CREATED</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(selectedLog.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {selectedLog.overrideReason && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>REASON</span>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
                    {selectedLog.overrideReason}
                  </div>
                </div>
              )}

              {/* Before/After JSON Snapshots */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>BEFORE VALUE</span>
                  <pre style={{
                    background: '#f8fafc',
                    border: '1px solid var(--color-border)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    margin: 0,
                  }}>
                    {selectedLog.beforeValue ? JSON.stringify(selectedLog.beforeValue, null, 2) : 'No prior state recorded'}
                  </pre>
                </div>
                
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>AFTER VALUE</span>
                  <pre style={{
                    background: '#f8fafc',
                    border: '1px solid var(--color-border)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    margin: 0,
                  }}>
                    {selectedLog.afterValue ? JSON.stringify(selectedLog.afterValue, null, 2) : 'No subsequent state recorded'}
                  </pre>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', background: '#fafafa' }}>
              <Button variant="primary" onClick={() => setSelectedLog(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
