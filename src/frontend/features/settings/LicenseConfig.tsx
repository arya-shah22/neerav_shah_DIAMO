// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — License Management & Version Info View
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { Button, useToast } from '../../components/ui';
import { 
  KeyRound, Mail, Phone, Clock, Layers, Users, Info 
} from 'lucide-react';

interface LicenseConfigProps {
  companyId: number;
}

export const LicenseConfig: React.FC<LicenseConfigProps> = ({ companyId }) => {
  const { showToast } = useToast();

  // IPC hooks
  const { invoke: getInfo } = useIpc<any>('license:get-info');
  const { invoke: resetUptime } = useIpc<any>('license:reset-uptime');

  // Component States
  const [data, setData] = useState<any | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      const res = await getInfo({ companyId });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load license details:', err);
    }
  }, [companyId, getInfo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetUptime = async () => {
    try {
      const res = await resetUptime({ companyId });
      if (res.success) {
        showToast('Uptime statistics reset successfully!', 'success');
        loadData();
      } else {
        showToast(res.error || 'Failed to reset uptime statistics', 'error');
      }
    } catch (err) {
      showToast('Reset failed', 'error');
    }
  };

  const getUptimeString = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', width: '100%', maxWidth: '1200px' }}>
      
      {/* Column 1: Main info, limits & release patches logs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Card 1: License Details */}
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
              <KeyRound size={22} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>License Registration</h3>
            </div>
            {data && (
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                background: data.license.status === 'ACTIVE' ? '#ecfdf5' : '#fef2f2',
                color: data.license.status === 'ACTIVE' ? '#059669' : '#dc2626',
              }}>
                {data.license.status}
              </span>
            )}
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

          {data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>EDITION / TYPE</span>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{data.license.licenseType}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>REGISTERED COMPANY</span>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{data.license.registeredCompany}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>ACTIVATION DATE</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(data.license.activationDate).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Activation limits utilization */}
        {data && (
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
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Account & Profile Allocations</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* User Account count */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                    <Users size={14} /> Active User Accounts
                  </span>
                  <span>{data.license.activeUserCount} / {data.license.maxUsers} limit</span>
                </div>
                <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--color-primary)', height: '100%', width: `${(data.license.activeUserCount / data.license.maxUsers) * 100}%` }}></div>
                </div>
              </div>

              {/* Company Profile count */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                    <Layers size={14} /> Registered Companies
                  </span>
                  <span>{data.license.activeCompanyCount} / {data.license.maxCompanies} limit</span>
                </div>
                <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ background: '#059669', height: '100%', width: `${(data.license.activeCompanyCount / data.license.maxCompanies) * 100}%` }}></div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Card 3: System / Build specifications */}
        {data && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Execution Host Properties</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '2px' }}>OPERATING SYSTEM</span>
                <span style={{ fontWeight: 600 }}>{data.system.osPlatform}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '2px' }}>CPU ARCHITECTURE</span>
                <span style={{ fontWeight: 600 }}>{data.system.cpuModel}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '2px' }}>MEMORY RESERVATION</span>
                <span style={{ fontWeight: 600 }}>{data.system.processMemoryMb} MB RAM</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Change logs timeline */}
        {data && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Local Release Notes & Patch Logs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.changeLogs.map((log: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
                    {idx < data.changeLogs.length - 1 && (
                      <div style={{ width: '2px', flexGrow: 1, background: 'var(--color-border)', margin: '4px 0' }}></div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{log.version}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{log.date}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{log.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Column 2: Side panel about & support widgets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Support Help Widget */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} /> Help & Customer Support
          </h4>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Mail size={16} style={{ color: 'var(--color-primary)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)' }}>SUPPORT EMAIL</span>
                <span style={{ fontWeight: 600 }}>aryashah325@gmail.com</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Phone size={16} style={{ color: 'var(--color-primary)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)' }}>HELPLINE TELEPHONE</span>
                <span style={{ fontWeight: 600 }}>+917405201227 (Whatsapp Call Only)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Clock size={16} style={{ color: 'var(--color-primary)' }} />
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)' }}>OPERATIONAL HOURS</span>
                <span style={{ fontWeight: 600 }}>Mon - Friday: 11 AM - 5 PM IST</span>
              </div>
            </div>
          </div>
        </div>

        {/* App Version Info widget */}
        {data && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '12px',
          }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: '13px' }}>{data.app.name}</span>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>{data.app.edition}</span>
            <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Active Version: </span>
              <span style={{ fontWeight: 700 }}>{data.app.version}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Uptime stats: </span>
                <span style={{ fontWeight: 600 }}>{getUptimeString(data.app.uptimeSeconds)}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetUptime} 
                style={{ 
                  fontSize: '10px', 
                  padding: '2px 8px', 
                  color: '#dc2626', 
                  alignSelf: 'flex-start',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Reset Uptime
              </Button>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              Copyright © 2026 Diamo Tech. All rights reserved.
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
