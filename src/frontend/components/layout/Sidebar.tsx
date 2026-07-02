// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Sidebar Navigation
// Phase 17.1 §4: 200px fixed width, collapsible to 48px
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  ShoppingBag,
  FileText,
  Briefcase,
  Coins,
  Landmark,
  BookOpen,
  BarChart3,
  Settings,
  Shield,
  Gem,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, group: 'Main' },
  { path: '/masters/accounts', label: 'Masters', icon: <Database size={18} />, group: 'Main' },
  { path: '/inventory/stock', label: 'Inventory', icon: <Gem size={18} />, group: 'Transactions' },
  { path: '/transactions/sales', label: 'Sale Book', icon: <ShoppingCart size={18} />, group: 'Transactions' },
  { path: '/transactions/purchases', label: 'Purchase Book', icon: <ShoppingBag size={18} />, group: 'Transactions' },
  { path: '/transactions/challans', label: 'Challan Book', icon: <FileText size={18} />, group: 'Transactions' },
  { path: '/transactions/jobs', label: 'Job Book', icon: <Briefcase size={18} />, group: 'Transactions' },
  { path: '/vouchers/cash-bank', label: 'Cash / Bank', icon: <Coins size={18} />, group: 'Vouchers' },
  { path: '/vouchers/journal', label: 'Journal Voucher', icon: <Landmark size={18} />, group: 'Vouchers' },
  { path: '/vouchers/ledger', label: 'Ledger', icon: <BookOpen size={18} />, group: 'Vouchers' },
  { path: '/reports', label: 'Reports', icon: <BarChart3 size={18} />, group: 'System' },
  { path: '/settings', label: 'Settings', icon: <Settings size={18} />, group: 'System' },
  { path: '/admin', label: 'Admin', icon: <Shield size={18} />, group: 'System' },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const location = useLocation();
  let currentGroup = '';

  return (
    <aside style={{
      width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
      minWidth: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
      height: '100%',
      background: 'var(--color-primary)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width var(--transition-normal), min-width var(--transition-normal)',
      overflow: 'hidden',
    }}>
      {/* Logo Area */}
      <div style={{
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0' : '0 var(--spacing-md)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Gem size={22} color="#3B82F6" />
        {!collapsed && (
          <span style={{
            marginLeft: 'var(--spacing-sm)',
            fontSize: '15px',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '1.5px',
          }}>
            DIAMO
          </span>
        )}
      </div>

      {/* Navigation Items */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 'var(--spacing-sm) 0',
      }}>
        {NAV_ITEMS.map((item) => {
          const showGroupHeader = item.group !== currentGroup;
          if (showGroupHeader) currentGroup = item.group;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <React.Fragment key={item.path}>
              {/* Group header */}
              {showGroupHeader && !collapsed && (
                <div style={{
                  fontSize: 'var(--text-small)',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  padding: 'var(--spacing-md) var(--spacing-md) var(--spacing-xs)',
                }}>
                  {item.group}
                </div>
              )}

              {/* Nav link */}
              <NavLink
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  padding: collapsed ? 'var(--spacing-sm) 0' : 'var(--spacing-sm) var(--spacing-md)',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                  background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                  fontSize: 'var(--text-label)',
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  transition: 'all var(--transition-fast)',
                  cursor: 'pointer',
                }}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
};
