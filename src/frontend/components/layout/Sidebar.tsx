// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Sidebar Navigation
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
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
  Building2,
  Calendar,
  FolderTree,
  Users,
  Handshake,
  Package,
  Undo2,
  FileUp,
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
  { path: '/masters/business/companies', label: 'Companies', icon: <Building2 size={18} />, group: 'Masters' },
  { path: '/masters/business/financial-years', label: 'Financial Years', icon: <Calendar size={18} />, group: 'Masters' },
  { path: '/masters/accounting/account-groups', label: 'Account Groups', icon: <FolderTree size={18} />, group: 'Masters' },
  { path: '/masters/accounting/accounts', label: 'Accounts', icon: <Users size={18} />, group: 'Masters' },
  { path: '/masters/business/brokers', label: 'Brokers', icon: <Handshake size={18} />, group: 'Masters' },
  { path: '/masters/diamond/qualities', label: 'Qualities', icon: <Gem size={18} />, group: 'Masters' },
  { path: '/inventory/stock', label: 'Stock Inventory', icon: <Package size={18} />, group: 'Transactions' },
  { path: '/transactions/sales', label: 'Sale Book', icon: <ShoppingCart size={18} />, group: 'Transactions' },
  { path: '/transactions/sale-returns', label: 'Sale Return Credit Note', icon: <Undo2 size={18} />, group: 'Transactions' },
  { path: '/transactions/sale-debit-notes', label: 'Sale Debit Note', icon: <FileUp size={18} />, group: 'Transactions' },
  { path: '/transactions/purchases', label: 'Purchase Book', icon: <ShoppingBag size={18} />, group: 'Transactions' },
  { path: '/transactions/purchase-returns', label: 'Purchase Return Debit Note', icon: <Undo2 size={18} />, group: 'Transactions' },
  { path: '/transactions/purchase-credit-notes', label: 'Purchase Credit Note', icon: <FileUp size={18} />, group: 'Transactions' },
  { path: '/transactions/challans/trading', label: 'Jhanghad (Trading)', icon: <FileText size={18} />, group: 'Transactions' },
  { path: '/transactions/challans/job-work', label: 'Job Work Issue', icon: <FileText size={18} />, group: 'Transactions' },
  { path: '/transactions/orders/sales', label: 'Sales Order', icon: <FileText size={18} />, group: 'Transactions' },
  { path: '/transactions/orders/purchases', label: 'Purchase Order', icon: <FileText size={18} />, group: 'Transactions' },
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
