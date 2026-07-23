// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Super Admin & System Ownership Controller
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import type { IApiResponse } from '../../../shared/types/common.types';

@Controller()
export class SuperAdminController {
  @Inject(SuperAdminService)
  private readonly adminService!: SuperAdminService;

  async handleGetProfile(payload: { userId: number }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.getAdminProfile(payload.userId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve admin profile',
      };
    }
  }

  async handleUpdateProfile(payload: {
    userId: number;
    userIdHandle: string;
    fullName: string;
    email: string;
    mobile?: string;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.updateAdminProfile(payload.userId, payload);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update admin profile',
      };
    }
  }

  async handleChangePassword(payload: {
    userId: number;
    currentPass: string;
    newPass: string;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.changeAdminPassword(payload.userId, payload);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to change password',
      };
    }
  }

  async handleSetBackupDeletionPassword(payload: {
    companyId: number;
    adminUserId: number;
    newPassword: string;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.setBackupDeletionPassword(
        payload.companyId,
        payload.adminUserId,
        payload.newPassword
      );
      return data;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to set backup security password',
      };
    }
  }

  async handleGetMetrics(payload: { companyId: number; userId: number }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.getAdminDashboardMetrics(payload.companyId, payload.userId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve admin console metrics',
      };
    }
  }

  async handleTerminateSession(payload: { userId: number; sessionId: number }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.terminateUserSession(payload.userId, payload.sessionId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to terminate user session',
      };
    }
  }

  async handleListUsers(payload: {
    adminUserId: number;
    filters: { search?: string; status?: string; companyId?: number; designation?: string };
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.listUsers(payload.adminUserId, payload.filters);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list users',
      };
    }
  }

  async handleCreateUser(payload: {
    adminUserId: number;
    userPayload: {
      employeeCode: string;
      fullName: string;
      userIdHandle: string;
      email: string;
      mobile?: string;
      department?: string;
      designation?: string;
      remarks?: string;
      passwordPlain: string;
      assignedCompanyIds: number[];
    };
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.createUser(payload.adminUserId, payload.userPayload);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create user account',
      };
    }
  }

  async handleUpdateUser(payload: {
    adminUserId: number;
    userId: number;
    userPayload: {
      employeeCode: string;
      fullName: string;
      userIdHandle: string;
      email: string;
      mobile?: string;
      department?: string;
      designation?: string;
      remarks?: string;
      assignedCompanyIds: number[];
    };
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.updateUser(payload.adminUserId, payload.userId, payload.userPayload);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update user account',
      };
    }
  }

  async handleChangeUserPassword(payload: {
    adminUserId: number;
    userId: number;
    newPass: string;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.changeUserPasswordByAdmin(payload.adminUserId, payload.userId, payload.newPass);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to change user password',
      };
    }
  }

  async handleToggleUserLock(payload: {
    adminUserId: number;
    userId: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.toggleUserLockByAdmin(payload.adminUserId, payload.userId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to lock/unlock user account',
      };
    }
  }

  async handleToggleUserStatus(payload: {
    adminUserId: number;
    userId: number;
    status: 'ACTIVE' | 'INACTIVE' | 'DISABLED';
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.toggleUserStatusByAdmin(payload.adminUserId, payload.userId, payload.status);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to change user status',
      };
    }
  }

  async handleDeleteUser(payload: {
    adminUserId: number;
    userId: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.deleteUserByAdmin(payload.adminUserId, payload.userId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete user account',
      };
    }
  }

  // ─── Phase 14.4: Page Access Control ────────────────────────

  async handleGetUserPermissions(payload: {
    adminUserId: number;
    targetUserId: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.getUserPagePermissions(payload.adminUserId, payload.targetUserId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get user permissions',
      };
    }
  }

  async handleSaveUserPermissions(payload: {
    adminUserId: number;
    targetUserId: number;
    allowedPages: string[];
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.saveUserPagePermissions(payload.adminUserId, payload.targetUserId, payload.allowedPages);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save user permissions',
      };
    }
  }

  async handleCopyUserPermissions(payload: {
    adminUserId: number;
    fromUserId: number;
    toUserId: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.copyUserPermissions(payload.adminUserId, payload.fromUserId, payload.toUserId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to copy user permissions',
      };
    }
  }

  async handleGetMyPermissions(payload: {
    userId: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.getAllowedPagesForUser(payload.userId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch page permissions',
      };
    }
  }

  // ─── Phase 14.5: Module Actions Security ──────────────────────

  async handleGetUserModulePermissions(payload: {
    adminUserId: number;
    targetUserId: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.getUserModulePermissions(payload.adminUserId, payload.targetUserId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch module permissions',
      };
    }
  }

  async handleSaveUserModulePermissions(payload: {
    adminUserId: number;
    targetUserId: number;
    permissions: { moduleCode: string; actionCode: string; isAllowed: boolean }[];
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.saveUserModulePermissions(
        payload.adminUserId,
        payload.targetUserId,
        payload.permissions
      );
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save module permissions',
      };
    }
  }

  async handleGetMyModulePermissions(payload: {
    userId: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.getAllowedModuleActionsForUser(payload.userId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch module action permissions',
      };
    }
  }

  // ─── Phase 14.6: Activity Monitoring & Productivity Handlers ──

  async handleGetActivityLogs(payload: {
    adminUserId: number;
    filters?: any;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.getActivityLogs(payload.adminUserId, payload.filters);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch activity logs',
      };
    }
  }

  async handleGetUserTimeline(payload: {
    adminUserId: number;
    targetUserId: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.getUserTimeline(payload.adminUserId, payload.targetUserId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch user timeline',
      };
    }
  }

  async handleGetProductivityMetrics(payload: {
    adminUserId: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.adminService.getProductivityMetrics(payload.adminUserId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch productivity metrics',
      };
    }
  }
}
