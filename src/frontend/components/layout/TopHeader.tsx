// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Top Header Bar
// Company switcher, FY indicator, search, notifications, profile
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PanelLeftClose,
  PanelLeft,
  Search,
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

  const [companyOpen, setCompanyOpen] = useState(false);
  const [fyOpen, setFyOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [fyList, setFyList] = useState<IFinancialYear[]>([]);

  const companyRef = useRef<HTMLDivElement>(null);
  const fyRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      {/* Global Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-xs) var(--spacing-md)',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        width: '360px',
        cursor: 'pointer',
      }}>
        <Search size={14} color="var(--color-text-muted)" />
        <span style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-muted)', flex: 1 }}>
          Search... (Ctrl+K)
        </span>
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <button style={{
          position: 'relative',
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
        }}>
          <Bell size={18} />
        </button>

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
