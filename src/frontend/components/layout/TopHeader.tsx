// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Top Header Bar
// Phase 17.1 §4: 48px fixed height
// Company switcher, FY indicator, search, notifications, profile
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import {
  PanelLeftClose,
  PanelLeft,
  Search,
  Bell,
  User,
  ChevronDown,
  Calendar,
} from 'lucide-react';

interface TopHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
}) => {
  return (
    <header style={{
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
      {/* Left Section — Sidebar toggle + Company */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        {/* Sidebar Toggle */}
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
            transition: 'background var(--transition-fast)',
          }}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Company Selector */}
        <button style={{
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
        }}>
          <span>Demo Company Pvt. Ltd.</span>
          <ChevronDown size={14} color="var(--color-text-muted)" />
        </button>

        {/* Financial Year Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          background: 'var(--color-accent-light)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-small)',
          fontWeight: 600,
          color: 'var(--color-accent)',
        }}>
          <Calendar size={12} />
          <span>FY 2025–26</span>
        </div>
      </div>

      {/* Center Section — Global Search */}
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
        <span style={{
          fontSize: 'var(--text-label)',
          color: 'var(--color-text-muted)',
          flex: 1,
        }}>
          Search... (Ctrl+K)
        </span>
        <kbd style={{
          fontSize: '10px',
          padding: '2px 6px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '3px',
          color: 'var(--color-text-muted)',
        }}>
          ⌘K
        </kbd>
      </div>

      {/* Right Section — Notifications + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        {/* Notification Bell */}
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
          {/* Notification badge */}
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            background: 'var(--color-danger)',
            borderRadius: 'var(--radius-full)',
            border: '2px solid var(--color-surface)',
          }} />
        </button>

        {/* User Profile */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          border: 'none',
          background: 'transparent',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--color-text-primary)',
        }}>
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
          <span style={{
            fontSize: 'var(--text-label)',
            fontWeight: 500,
          }}>
            Super Admin
          </span>
          <ChevronDown size={12} color="var(--color-text-muted)" />
        </button>
      </div>
    </header>
  );
};
