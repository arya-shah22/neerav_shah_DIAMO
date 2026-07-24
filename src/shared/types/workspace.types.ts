// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — User Personal Workspace Types
// Phase 15.4: Personal Workspace & Productivity Center
// ═══════════════════════════════════════════════════════════════

export interface IWorkspaceQuickAction {
  id: string;
  label: string;
  path: string;
  iconName: string;
  color: string;
}

export interface IWorkspacePinnedPage {
  label: string;
  path: string;
  iconName: string;
}

export interface IWorkspaceRecentItem {
  label: string;
  path: string;
  accessedAt: string | Date;
}

export interface IUserWorkspaceData {
  userId: number;
  favoritePages: IWorkspacePinnedPage[];
  quickActions: IWorkspaceQuickAction[];
  recentItems: IWorkspaceRecentItem[];
}
