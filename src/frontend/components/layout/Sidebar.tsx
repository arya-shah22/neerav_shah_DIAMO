// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Sidebar Navigation with Collapsible Submenus
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
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
  ChevronRight
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
    }
    if (
      currentPath.startsWith('/inventory') ||
      currentPath.startsWith('/transactions') ||
      currentPath.startsWith('/vouchers')
    ) {
      nextOpen['transactions'] = true;
    }
    
    if (currentPath.startsWith('/reports')) {
      nextOpen['reports'] = true;
    }
    
    // Sub-nested groups under transactions
    if (
      currentPath.startsWith('/transactions/sales') ||
      currentPath.startsWith('/transactions/sale-')
    ) {
      nextOpen['sale'] = true;
    }
    if (
      currentPath.startsWith('/transactions/purchases') ||
      currentPath.startsWith('/transactions/purchase-')
    ) {
      nextOpen['purchase'] = true;
    }
    if (
      currentPath.startsWith('/transactions/challans') ||
      currentPath.startsWith('/transactions/orders')
    ) {
      nextOpen['challan'] = true;
    }
    if (currentPath.startsWith('/transactions/jobs')) {
      nextOpen['job'] = true;
    }

    if (currentPath.startsWith('/settings') || currentPath.startsWith('/admin')) {
      nextOpen['system'] = true;
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
      path: '/dashboard',
    },
    {
      key: 'masters',
      label: 'Account & Masters',
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
      key: 'transactions',
      label: 'Transactions',
      icon: <Package size={18} />,
      subItems: [
        { path: '/inventory/stock', label: 'Stock Inventory', icon: <Package size={16} /> },
      ],
      nestedGroups: [
        {
          key: 'sale',
          label: 'Sale Book',
          icon: <ShoppingCart size={16} />,
          subItems: [
            { path: '/transactions/sales', label: 'Sale Invoice' },
            { path: '/transactions/sale-returns', label: 'Sale Return / CN' },
            { path: '/transactions/sale-debit-notes', label: 'Sale Debit Note' },
          ],
        },
        {
          key: 'purchase',
          label: 'Purchase Book',
          icon: <ShoppingBag size={16} />,
          subItems: [
            { path: '/transactions/purchases', label: 'Purchase Invoice' },
            { path: '/transactions/purchase-returns', label: 'Purchase Return / DN' },
            { path: '/transactions/purchase-credit-notes', label: 'Purchase Credit Note' },
          ],
        },
        {
          key: 'challan',
          label: 'Memo Book',
          icon: <FileText size={16} />,
          subItems: [
            { path: '/transactions/challans/trading', label: 'Jhanghad (Trading)' },
            { path: '/transactions/challans/job-work', label: 'Job Work Issue' },
            { path: '/transactions/orders/sales', label: 'Sales Order' },
            { path: '/transactions/orders/purchases', label: 'Purchase Order' },
          ],
        },
        {
          key: 'job',
          label: 'Job Book',
          icon: <Briefcase size={16} />,
          subItems: [
            { path: '/transactions/jobs/income', label: 'Job Income' },
            { path: '/transactions/jobs/expense', label: 'Job Expense' },
          ],
        },
      ],
      // We can append direct links at the end of transactions as well
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
        { path: '/reports/outstanding', label: 'Outstanding Statements', icon: <FileText size={16} /> },
        { path: '/reports/stock', label: 'Stock Report', icon: <FileText size={16} /> },
        { path: '/reports/gst', label: 'GST Dashboard', icon: <FileText size={16} /> },
        { path: '/reports/gstr1', label: 'GSTR-1 Report', icon: <FileText size={16} /> },
        { path: '/reports/gstr2', label: 'GSTR-2 & ITC Rec', icon: <FileText size={16} /> },
      ],
    },
    {
      key: 'system',
      label: 'System & settings',
      icon: <Settings size={18} />,
      subItems: [
        { path: '/settings', label: 'Settings', icon: <Settings size={16} /> },
        { path: '/admin', label: 'Admin Access', icon: <Shield size={16} /> },
      ],
    },
  ];

  // Helper to render NavLink with consistent premium styling
  const renderLink = (path: string, label: string, icon?: React.ReactNode, paddingLeft: string = 'var(--spacing-md)') => {
    const isActive = path === '/' ? currentPath === '/' : (currentPath === path || currentPath.startsWith(path + '/'));
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
        {icon}
        {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
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
        {navStructure.map(item => {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {item.icon}
                  {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                </div>
                {!collapsed && (
                  isMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
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
                            {group.subItems.map(sub => renderLink(sub.path, sub.label, undefined, '48px'))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Append other direct links for Transactions (Jobs, Vouchers etc.) at first-level under Transactions parent */}
                  {item.key === 'transactions' && (
                    <>
                      {renderLink('/vouchers/journal', 'Journal Voucher (JV)', <Landmark size={16} />, '32px')}
                      {renderLink('/vouchers/cash-bank', 'Cash / Bank', <Coins size={16} />, '32px')}
                      {renderLink('/vouchers/loan', 'Loan Book', <Briefcase size={16} />, '32px')}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
