// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Application Shell Layout
// Phase 17.1 §4: Top Header + Left Sidebar + Content + Footer
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { StatusFooter } from './StatusFooter';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--color-bg)',
    }}>
      {/* Top Header — 48px fixed */}
      <TopHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Area: Sidebar + Content */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* Left Sidebar — 200px / 48px */}
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Workspace Content Area — flexible */}
        <main
          className="content-area"
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--color-bg)',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Status Footer — 24px fixed */}
      <StatusFooter />
    </div>
  );
};
