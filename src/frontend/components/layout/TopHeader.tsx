// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Top Header Bar
// Company switcher, FY indicator, search, notifications, profile
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PanelLeftClose,
  PanelLeft,
  Bell,
  User,
  ChevronDown,
  Calendar,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '../../state/auth-store';
import { useCompanyStore, formatFinancialYearLabel } from '../../state/company-store';
import { useIpc } from '../../hooks/useIpc';
import { switchCompany } from '../../services/company-context';
import type { IFinancialYear } from '../../features/financial-year/fy.types';
import type { INotificationSummary, IAppNotificationItem } from '../../../shared/types/notification.types';

interface TopHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
}) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);
  const companies = useCompanyStore((s) => s.companies);
  const setActiveFinancialYear = useCompanyStore((s) => s.setActiveFinancialYear);

  const { invoke: logoutIpc } = useIpc('auth:logout');
  const { invoke: fetchYears } = useIpc<IFinancialYear[]>('fy:list');
  const { invoke: activateYear } = useIpc<IFinancialYear>('fy:activate');

  const { invoke: getNotifications, loading: notifLoading } = useIpc<INotificationSummary>('notification:get-all');
  const { invoke: markRead } = useIpc('notification:mark-read');
  const { invoke: markAllRead } = useIpc('notification:mark-all-read');
  const { invoke: dismissNotif } = useIpc('notification:dismiss');

  const [companyOpen, setCompanyOpen] = useState(false);
  const [fyOpen, setFyOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [fyList, setFyList] = useState<IFinancialYear[]>([]);
  const [notifSummary, setNotifSummary] = useState<INotificationSummary | null>(null);

  const companyRef = useRef<HTMLDivElement>(null);
  const fyRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!activeCompany) return;
    try {
      const res = await getNotifications({ companyId: activeCompany.id });
      if (res.success && res.data) {
        setNotifSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [activeCompany, getNotifications]);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60000); // 1 min poll
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setCompanyOpen(false);
      }
      if (fyRef.current && !fyRef.current.contains(e.target as Node)) {
        setFyOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (n: IAppNotificationItem) => {
    await markRead({ id: n.id });
    fetchNotifications();
    if (n.targetPath) {
      setNotifOpen(false);
      navigate(n.targetPath);
    }
  };

  const handleMarkAllRead = async () => {
    if (!activeCompany) return;
    await markAllRead({ companyId: activeCompany.id });
    fetchNotifications();
  };

  const handleDismissNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await dismissNotif({ id });
    fetchNotifications();
  };

  useEffect(() => {
    if (!activeCompany || !fyOpen) return;
    fetchYears(activeCompany.id).then((res) => {
      if (res.success && res.data) setFyList(res.data);
    });
  }, [activeCompany, fyOpen, fetchYears]);

  const handleLogout = async () => {
    if (user && sessionToken) {
      await logoutIpc({ sessionToken, userId: user.id, username: user.username });
    }
    clearSession();
    useCompanyStore.getState().reset();
    navigate('/login');
  };

  const handleCompanySelect = async (companyId: number) => {
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      await switchCompany(company);
    }
    setCompanyOpen(false);
  };

  const handleFySelect = async (fy: IFinancialYear) => {
    if (!activeCompany) return;
    const res = await activateYear({ id: fy.id, companyId: activeCompany.id });
    if (res.success && res.data) {
      setActiveFinancialYear(res.data);
    }
    setFyOpen(false);
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: '240px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 'var(--z-dropdown)',
    padding: '4px 0',
    maxHeight: '280px',
    overflowY: 'auto',
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 'var(--text-label)',
    color: 'var(--color-text-primary)',
    textAlign: 'left',
  };

  return (
    <header className="no-print" style={{
      height: 'var(--header-height)',
      minHeight: 'var(--header-height)',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--spacing-md)',
      zIndex: 'var(--z-sticky)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <button
          onClick={onToggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Company Switcher */}
        <div ref={companyRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setCompanyOpen(!companyOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: 'var(--text-label)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            <Building2 size={14} color="var(--color-accent)" />
            <span>{activeCompany?.companyName || 'No Company'}</span>
            <ChevronDown size={14} color="var(--color-text-muted)" />
          </button>
          {companyOpen && (
            <div style={dropdownStyle}>
              {companies.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  No companies configured
                </div>
              ) : (
                companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCompanySelect(c.id)}
                    style={{
                      ...dropdownItemStyle,
                      background: c.id === activeCompany?.id ? 'var(--color-accent-light)' : 'transparent',
                      fontWeight: c.id === activeCompany?.id ? 600 : 400,
                    }}
                  >
                    <Building2 size={14} />
                    {c.companyName}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Financial Year Switcher */}
        <div ref={fyRef} style={{ position: 'relative' }}>
          <button
            onClick={() => activeCompany && setFyOpen(!fyOpen)}
            disabled={!activeCompany}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              background: 'var(--color-accent-light)',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-small)',
              fontWeight: 600,
              color: 'var(--color-accent)',
              cursor: activeCompany ? 'pointer' : 'not-allowed',
              opacity: activeCompany ? 1 : 0.6,
            }}
          >
            <Calendar size={12} />
            <span>
              {activeFinancialYear
                ? `FY ${formatFinancialYearLabel(activeFinancialYear)}`
                : 'No FY'}
            </span>
            <ChevronDown size={12} />
          </button>
          {fyOpen && fyList.length > 0 && (
            <div style={dropdownStyle}>
              {fyList.map((fy) => (
                <button
                  key={fy.id}
                  onClick={() => handleFySelect(fy)}
                  style={{
                    ...dropdownItemStyle,
                    background: fy.id === activeFinancialYear?.id ? 'var(--color-accent-light)' : 'transparent',
                    fontWeight: fy.id === activeFinancialYear?.id ? 600 : 400,
                  }}
                >
                  <Calendar size={14} />
                  FY {formatFinancialYearLabel(fy)}
                  {fy.isClosed && (
                    <span style={{ fontSize: '10px', color: 'var(--color-warning)', marginLeft: 'auto' }}>
                      Closed
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              fetchNotifications();
            }}
            title="Notifications & Alerts"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              border: 'none',
              background: notifOpen ? 'rgba(59,130,246,0.15)' : 'transparent',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              transition: 'background var(--transition-fast)',
            }}
          >
            <Bell size={18} color={notifSummary && notifSummary.unreadCount > 0 ? 'var(--color-primary)' : 'currentColor'} />
            {notifSummary && notifSummary.unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: notifSummary.criticalCount > 0 ? '#ef4444' : '#2563eb',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid var(--color-surface)',
                }}
              >
                {notifSummary.unreadCount > 99 ? '99+' : notifSummary.unreadCount}
              </span>
            )}
          </button>

          {/* Slide-out Notification Tray */}
          {notifOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                maxHeight: '480px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              {/* Tray Header */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="var(--color-accent)" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Notifications & Alerts
                  </span>
                </div>
                {notifSummary && notifSummary.unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-accent)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {notifLoading ? (
                  <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Loading alerts...
                  </div>
                ) : !notifSummary || notifSummary.notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    🔔 No active notifications or alerts.
                  </div>
                ) : (
                  notifSummary.notifications.map((n) => {
                    const badgeColor =
                      n.priority === 'CRITICAL'
                        ? '#ef4444'
                        : n.priority === 'HIGH'
                        ? '#f97316'
                        : n.priority === 'MEDIUM'
                        ? '#eab308'
                        : '#3b82f6';

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--color-border)',
                          background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'background var(--transition-fast)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: badgeColor,
                                display: 'inline-block',
                              }}
                            />
                            <strong style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>{n.title}</strong>
                          </div>
                          <button
                            onClick={(e) => handleDismissNotification(e, n.id)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', padding: 0 }}
                            title="Dismiss"
                          >
                            ×
                          </button>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setUserOpen(!userOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <User size={14} color="#FFFFFF" />
            </div>
            <span style={{ fontSize: 'var(--text-label)', fontWeight: 500 }}>
              {user?.fullName || 'User'}
            </span>
            <ChevronDown size={12} color="var(--color-text-muted)" />
          </button>
          {userOpen && (
            <div style={{ ...dropdownStyle, right: 0, left: 'auto', minWidth: '180px' }}>
              <button onClick={handleLogout} style={dropdownItemStyle}>
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
