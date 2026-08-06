// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Database Health & Diagnostics Dashboard View
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { Button, useToast } from '../../components/ui';
import { DataGrid } from '../../components/ui/DataGrid';
import { 
  Heart, Database, Cpu, Activity, ShieldCheck, 
  Play, Trash2, CheckCircle2, AlertTriangle, XCircle 
} from 'lucide-react';

interface HealthDashboardProps {
  companyId: number;
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({ companyId }) => {
  const { showToast } = useToast();

  // IPC Hooks
  const { invoke: getStatus, loading: loadingStatus } = useIpc<any>('health:get-status');
  const { invoke: runDiagnostics, loading: runningDiag } = useIpc<any>('health:run-diagnostics');
  const { invoke: optimizeDb, loading: optimizing } = useIpc<any>('health:optimize-db');
  const { invoke: clearCache, loading: clearingCache } = useIpc<any>('health:clear-cache');

  // Component States
  const [healthData, setHealthData] = useState<any | null>(null);
  const [diagResults, setDiagResults] = useState<any | null>(null);
  const [optResults, setOptResults] = useState<any[] | null>(null);

  // Load metrics status
  const loadData = React.useCallback(async () => {
    try {
      const res = await getStatus({ companyId });
      if (res.success && res.data) {
        setHealthData(res.data);
      }
    } catch (err) {
      console.error('Failed to load system health metrics:', err);
    }
  }, [companyId, getStatus]);

  // Trigger auto refresh every 30 seconds (reduced from 10s to minimize DB load)
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Run diagnostics wizard
  const handleRunDiagnostics = async () => {
    const res = await runDiagnostics({ companyId });
    if (res.success && res.data) {
      setDiagResults(res.data);
      showToast('System diagnostics wizard run completed', 'success');
    } else {
      showToast(res.error || 'Failed to complete system diagnostics', 'error');
    }
  };

  // Run database optimization
  const handleOptimizeDb = async () => {
    const res = await optimizeDb({ companyId });
    if (res.success && res.data) {
      setOptResults(res.data);
      showToast('Database table optimization completed', 'success');
      loadData();
    } else {
      showToast(res.error || 'Failed to optimize database tables', 'error');
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    const res = await clearCache();
    if (res.success && res.data) {
      showToast(res.data.message || 'System cache cleared successfully', 'success');
    } else {
      showToast(res.error || 'Failed to clear system cache', 'error');
    }
  };

  const getHealthBadge = (rating: string) => {
    let bg = '#ecfdf5';
    let color = '#059669';
    if (rating === 'GOOD') {
      bg = '#eff6ff';
      color = '#1d4ed8';
    } else if (rating === 'WARNING') {
      bg = '#fffbeb';
      color = '#d97706';
    } else if (rating === 'CRITICAL') {
      bg = '#fef2f2';
      color = '#dc2626';
    }
    return (
      <span style={{
        fontSize: '13px',
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: '6px',
        background: bg,
        color: color,
        textTransform: 'uppercase',
      }}>
        {rating || 'EXCELLENT'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1200px' }}>
      
      {/* Metrics Row 1: DB Health Summary card & Diagnostics actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'stretch' }}>
        
        {/* DB Connection info card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--color-primary)' }}>
              <Heart size={22} className={loadingStatus ? "animate-pulse" : ""} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Database Connectivity & Status</h3>
            </div>
            {healthData && getHealthBadge(healthData.statusRating)}
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

          {healthData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>MYSQL LATENCY</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: healthData.database.dbLatencyMs > 250 ? '#d97706' : 'var(--color-text-primary)' }}>
                  {healthData.database.dbLatencyMs} ms
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>DATABASE NAME</span>
                <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace' }}>{healthData.database.databaseName}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>DATABASE SIZE</span>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{healthData.database.dbSizeMb} MB</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>MYSQL VERSION</span>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{healthData.database.mysqlVersion}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action controls widget */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <Button variant="primary" onClick={handleRunDiagnostics} loading={runningDiag} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Play size={16} /> Run Diagnostics
          </Button>
          <Button variant="secondary" onClick={handleOptimizeDb} loading={optimizing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Database size={16} /> Optimize Tables
          </Button>
          <Button variant="ghost" onClick={handleClearCache} loading={clearingCache} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#dc2626' }}>
            <Trash2 size={16} /> Clear Cache
          </Button>
        </div>

      </div>

      {/* Resource usage visual panel */}
      {healthData && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '30px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* CPU Indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0369a1' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                <Cpu size={16} /> CPU Usage
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, marginLeft: 'auto' }}>{healthData.system.cpuUsagePct}%</span>
            </div>
            <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: '#0284c7', height: '100%', width: `${Math.min(100, healthData.system.cpuUsagePct)}%`, borderRadius: '4px' }}></div>
            </div>
          </div>

          {/* RAM Indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#7e22ce' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                <Activity size={16} /> RAM Memory
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, marginLeft: 'auto' }}>{healthData.system.ramUsagePct}% ({healthData.system.totalRamGb} GB)</span>
            </div>
            <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: '#9333ea', height: '100%', width: `${healthData.system.ramUsagePct}%`, borderRadius: '4px' }}></div>
            </div>
          </div>

          {/* Disk space Indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#059669' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                <Database size={16} /> Disk Storage
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, marginLeft: 'auto' }}>{healthData.system.diskFreeGb} GB Free / {healthData.system.diskTotalGb} GB</span>
            </div>
            <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ background: '#10b981', height: '100%', width: `${((healthData.system.diskTotalGb - healthData.system.diskFreeGb) / healthData.system.diskTotalGb * 100)}%`, borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Wizard Report Logs */}
      {diagResults && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} /> Diagnostic Wizard Audit Reports
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {diagResults.diagnostics.map((d: any, idx: number) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#fafafa',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{d.check}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{d.details}</span>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: d.status === 'PASSED' ? '#16a34a' : d.status === 'WARNING' ? '#d97706' : '#dc2626'
                }}>
                  {d.status === 'PASSED' ? <CheckCircle2 size={14} /> : d.status === 'WARNING' ? <AlertTriangle size={14} /> : <XCircle size={14} />}
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization reports panel */}
      {optResults && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '16px' }}>
            Table Index Optimization Run Results
          </h4>
          <DataGrid
            columns={[
              { key: 'table', header: 'TABLE NAME', width: '200px' },
              {
                key: 'status',
                header: 'STATUS',
                width: '120px',
                render: (row: any) => (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: row.status === 'FAILED' ? '#fef2f2' : '#f0fdf4',
                    color: row.status === 'FAILED' ? '#dc2626' : '#16a34a',
                  }}>
                    {row.status}
                  </span>
                )
              },
              { key: 'details', header: 'DEFRAGMENTATION DETAILS', width: '380px' },
            ]}
            data={optResults}
            keyField="table"
            emptyTitle="No optimization logs available"
            emptyDescription="Optimize tables from panel above to see run logs."
          />
        </div>
      )}

    </div>
  );
};
