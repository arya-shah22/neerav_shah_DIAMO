// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Sidebar Navigation with Collapsible Submenus
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePagePermissions } from '../../hooks/usePagePermissions';
import {
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  FileText,
  Briefcase,
  Coins,
  Landmark,
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
  ChevronDown,
  ChevronRight,
  Brain,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
}

interface NavSubItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
}

interface NestedGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  subItems: NavSubItem[];
}

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path?: string; // Direct link
  subItems?: NavSubItem[]; // Direct sub-items
  nestedGroups?: NestedGroup[]; // Nested collapsible groups
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Toggle states
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // Auto-expand menus based on current URL path on load/route change
  useEffect(() => {
    const nextOpen: Record<string, boolean> = { ...openMenus };

    if (currentPath.startsWith('/masters')) {
      nextOpen['masters'] = true;
    } else if (currentPath.startsWith('/inventory') || currentPath === '/reports/stock') {
      nextOpen['inventory'] = true;
    } else if (currentPath.startsWith('/transactions/jobs') || currentPath.startsWith('/transactions/challans/job-work')) {
      nextOpen['job'] = true;
    } else if (currentPath.startsWith('/transactions')) {
      nextOpen['transactions'] = true;

      // Sub-nested groups under Trading
      if (currentPath.startsWith('/transactions/sales') || currentPath.startsWith('/transactions/sale-')) {
        nextOpen['sale'] = true;
      } else if (currentPath.startsWith('/transactions/purchases') || currentPath.startsWith('/transactions/purchase-')) {
        nextOpen['purchase'] = true;
      } else if (currentPath.startsWith('/transactions/challans') || currentPath.startsWith('/transactions/orders')) {
        nextOpen['challan'] = true;
      }
    } else if (currentPath.startsWith('/vouchers') || currentPath === '/reports/day-book') {
      nextOpen['vouchers'] = true;
    } else if (currentPath.startsWith('/reports')) {
      nextOpen['reports'] = true;

      if (
        currentPath.startsWith('/reports/gst') ||
        currentPath.startsWith('/reports/gstr') ||
        currentPath.startsWith('/reports/tds-tcs')
      ) {
        nextOpen['taxation'] = true;
      }
    } else if (currentPath.startsWith('/settings') || currentPath.startsWith('/admin')) {
      nextOpen['system'] = true;
    } else if (currentPath.startsWith('/dashboard')) {
      nextOpen['dashboard'] = true;
    }

    setOpenMenus(nextOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const navStructure: NavItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      subItems: [
        { path: '/dashboard', label: 'Overview', icon: <Sparkles size={16} /> },
        { path: '/dashboard/analytics', label: 'Analytics', icon: <TrendingUp size={16} /> },
      ],
    },
    {
      key: 'masters',
      label: 'Masters',
      icon: <Users size={18} />,
      subItems: [
        { path: '/masters/business/companies', label: 'Companies', icon: <Building2 size={16} /> },
        { path: '/masters/business/financial-years', label: 'Financial Years', icon: <Calendar size={16} /> },
        { path: '/masters/accounting/account-groups', label: 'Account Groups', icon: <FolderTree size={16} /> },
        { path: '/masters/accounting/accounts', label: 'Accounts', icon: <Users size={16} /> },
        { path: '/masters/business/brokers', label: 'Brokers', icon: <Handshake size={16} /> },
        { path: '/masters/diamond/qualities', label: 'Qualities', icon: <Gem size={16} /> },
      ],
    },
    {
      key: 'inventory',
      label: 'Inventory',
      icon: <Package size={18} />,
      subItems: [
        { path: '/inventory/stock', label: 'Stock Inventory', icon: <Package size={16} /> },
        { path: '/inventory/stock-conversion', label: 'Stock Conversion', icon: <RefreshCw size={16} /> },
        { path: '/reports/stock', label: 'Stock Report', icon: <FileText size={16} /> },
      ],
    },
    {
      key: 'transactions',
      label: 'Trading',
      icon: <ShoppingCart size={18} />,
      nestedGroups: [
        {
          key: 'sale',
          label: 'Sales',
          icon: <ShoppingCart size={16} />,
          subItems: [
            { path: '/transactions/sales', label: 'Sale Invoice', icon: <FileText size={14} /> },
            { path: '/transactions/sale-returns', label: 'Sale Return / CN', icon: <FileText size={14} /> },
            { path: '/transactions/sale-debit-notes', label: 'Sale Debit Note', icon: <FileText size={14} /> },
          ],
        },
        {
          key: 'purchase',
          label: 'Purchases',
          icon: <ShoppingBag size={16} />,
          subItems: [
            { path: '/transactions/purchases', label: 'Purchase Invoice', icon: <FileText size={14} /> },
            { path: '/transactions/purchase-returns', label: 'Purchase Return / DN', icon: <FileText size={14} /> },
            { path: '/transactions/purchase-credit-notes', label: 'Purchase Credit Note', icon: <FileText size={14} /> },
          ],
        },
        {
          key: 'challan',
          label: 'Orders & Memos',
          icon: <FileText size={16} />,
          subItems: [
            { path: '/transactions/challans/trading', label: 'Jhanghad (Trading)', icon: <FileText size={14} /> },
            { path: '/transactions/orders/sales', label: 'Sales Order', icon: <FileText size={14} /> },
            { path: '/transactions/orders/purchases', label: 'Purchase Order', icon: <FileText size={14} /> },
          ],
        },
      ],
    },
    {
      key: 'job',
      label: 'Job Work',
      icon: <Briefcase size={18} />,
      subItems: [
        { path: '/transactions/challans/job-work', label: 'Job Work Issue', icon: <FileText size={16} /> },
        { path: '/transactions/jobs/billing', label: 'Job Work Billing & Subcontracting', icon: <Briefcase size={16} /> },
      ],
    },
    {
      key: 'vouchers',
      label: 'Vouchers & Banking',
      icon: <Landmark size={18} />,
      subItems: [
        { path: '/vouchers/cash-bank', label: 'Cash & Bank Book', icon: <Coins size={16} /> },
        { path: '/vouchers/journal', label: 'Journal Voucher (JV)', icon: <Landmark size={16} /> },
        { path: '/vouchers/loan', label: 'Loan Book', icon: <Briefcase size={16} /> },
        { path: '/reports/day-book', label: 'Day Book', icon: <FileText size={16} /> },
      ],
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: <BarChart3 size={18} />,
      subItems: [
        { path: '/reports/ledger', label: 'General Ledger', icon: <FileText size={16} /> },
        { path: '/reports/trial-balance', label: 'Trial Balance', icon: <FileText size={16} /> },
        { path: '/reports/profit-loss', label: 'Profit & Loss', icon: <BarChart3 size={16} /> },
        { path: '/reports/balance-sheet', label: 'Balance Sheet', icon: <BarChart3 size={16} /> },
        { path: '/reports/cash-flow', label: 'Cash Flow', icon: <FileText size={16} /> },
        { path: '/reports/fund-flow', label: 'Fund Flow', icon: <FileText size={16} /> },
        { path: '/reports/outstanding', label: 'Outstanding Statements', icon: <FileText size={16} /> },
        { path: '/reports/mis', label: 'MIS Analytics', icon: <BarChart3 size={16} /> },
        { path: '/reports/intelligence', label: 'Report Intelligence', icon: <Brain size={16} /> },
      ],
      nestedGroups: [
        {
          key: 'taxation',
          label: 'Taxation & Compliance',
          icon: <Shield size={16} />,
          subItems: [
            { path: '/reports/gst', label: 'GST Dashboard', icon: <BarChart3 size={14} /> },
            { path: '/reports/gstr1', label: 'GSTR-1', icon: <FileText size={14} /> },
            { path: '/reports/gstr2', label: 'GSTR-2B', icon: <FileText size={14} /> },
            { path: '/reports/gstr3b', label: 'GSTR-3B', icon: <FileText size={14} /> },
            { path: '/reports/tds-tcs', label: 'TDS & TCS', icon: <Shield size={14} /> },
          ],
        },
      ],
    },
    {
      key: 'system',
      label: 'System',
      icon: <Settings size={18} />,
      subItems: [
        { path: '/settings', label: 'Settings', icon: <Settings size={16} /> },
        { path: '/admin', label: 'Admin Access', icon: <Shield size={16} /> },
      ],
    },
  ];

  // ─── Phase 14.4: Filter sidebar based on page permissions ───
  const canAccess = usePagePermissions((s) => s.canAccess);

  const filteredNavStructure = useMemo(() => {
    return navStructure
      .map((item) => {
        // Direct link — check access
        if (item.path) {
          return canAccess(item.path) ? item : null;
        }

        // Filter subItems
        const filteredSubItems = item.subItems?.filter((sub) => canAccess(sub.path)) || [];

        // Filter nestedGroups
        const filteredNestedGroups = item.nestedGroups
          ?.map((group) => ({
            ...group,
            subItems: group.subItems.filter((sub) => canAccess(sub.path)),
          }))
          .filter((group) => group.subItems.length > 0) || [];

        // Hide the parent menu if all children are filtered out
        if (filteredSubItems.length === 0 && filteredNestedGroups.length === 0) {
          return null;
        }

        return {
          ...item,
          subItems: filteredSubItems,
          nestedGroups: filteredNestedGroups,
        };
      })
      .filter(Boolean) as NavItem[];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  // Helper to render NavLink with consistent premium styling
  const renderLink = (path: string, label: string, icon?: React.ReactNode, paddingLeft: string = 'var(--spacing-md)') => {
    const isActive = (path === '/' || path === '/dashboard')
      ? currentPath === path
      : (currentPath === path || currentPath.startsWith(path + '/'));
    return (
      <NavLink
        key={path}
        to={path}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: `10px var(--spacing-md) 10px ${paddingLeft}`,
          color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
          background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
          borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
          fontSize: '13px',
          fontWeight: isActive ? 600 : 400,
          textDecoration: 'none',
          transition: 'all var(--transition-fast)',
          cursor: 'pointer',
        }}
        title={collapsed ? label : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', flexShrink: 0 }}>
          {icon || <div style={{ width: '16px', height: '16px' }} />}
        </div>
        {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      </NavLink>
    );
  };

  return (
    <aside className="no-print" style={{
      width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
      minWidth: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
      height: '100%',
      background: 'var(--color-primary)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width var(--transition-normal), min-width var(--transition-normal)',
      overflow: 'hidden',
    }}>
      {/* Brand Logo Header */}
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

      {/* Navigation Links Menu */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '12px 0',
      }}>
        {filteredNavStructure.map(item => {
          // Direct top-level link
          if (item.path) {
            return renderLink(item.path, item.label, item.icon);
          }

          // Collapsible top-level module
          const isMenuOpen = !!openMenus[item.key];

          return (
            <div key={item.key} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Parent Toggle Button */}
              <button
                onClick={() => toggleMenu(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px var(--spacing-md)',
                  color: 'rgba(255,255,255,0.7)',
                  background: 'transparent',
                  border: 'none',
                  borderLeft: '3px solid transparent',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  {item.icon}
                  {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                </div>
                {!collapsed && (
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '8px' }}>
                    {isMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                )}
              </button>

              {/* Children sub-items (visible only when expanded and sidebar is not collapsed) */}
              {isMenuOpen && !collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
                  {/* Render standard sub-items */}
                  {item.subItems?.map(sub => renderLink(sub.path, sub.label, sub.icon, '32px'))}

                  {/* Render nested groups (Sale, Purchase, Challan) */}
                  {item.nestedGroups?.map(group => {
                    const isGroupOpen = !!openMenus[group.key];
                    return (
                      <div key={group.key} style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Nested group toggle header */}
                        <button
                          onClick={() => toggleMenu(group.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '8px var(--spacing-md) 8px 32px',
                            color: 'rgba(255,255,255,0.55)',
                            background: 'transparent',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 500,
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {group.icon}
                            <span>{group.label}</span>
                          </div>
                          {isGroupOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        {/* Double-nested terminal page links */}
                        {isGroupOpen && (
                          <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.08)' }}>
                            {group.subItems.map(sub => renderLink(sub.path, sub.label, sub.icon, '48px'))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Append other direct links if needed */}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
