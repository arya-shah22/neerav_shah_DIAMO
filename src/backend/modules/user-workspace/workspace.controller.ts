// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — User Workspace Controller
// Phase 15.4: Workspace Controller Handlers
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { UserWorkspaceService } from './workspace.service';
import type { IApiResponse } from '../../../shared/types/common.types';
import type { IUserWorkspaceData } from '../../../shared/types/workspace.types';

@Controller()
export class UserWorkspaceController {
  @Inject(UserWorkspaceService)
  private readonly workspaceService!: UserWorkspaceService;

  async handleGetWorkspace(payload: { userId: number }): Promise<IApiResponse<IUserWorkspaceData>> {
    try {
      const data = await this.workspaceService.getWorkspace(payload.userId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch user workspace',
      };
    }
  }

  async handleUpdateWorkspace(payload: {
    userId: number;
    workspace: Partial<IUserWorkspaceData>;
  }): Promise<IApiResponse<IUserWorkspaceData>> {
    try {
      const data = await this.workspaceService.updateWorkspace(payload.userId, payload.workspace);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update user workspace',
      };
    }
  }

  async handleLogRecentPage(payload: {
    userId: number;
    page: { label: string; path: string };
  }): Promise<IApiResponse<IUserWorkspaceData>> {
    try {
      const data = await this.workspaceService.logRecentPage(payload.userId, payload.page);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to log recent page',
      };
    }
  }
}
