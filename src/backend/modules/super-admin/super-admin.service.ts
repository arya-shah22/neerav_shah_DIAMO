// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Super Admin & System Ownership Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import bcrypt from 'bcryptjs';

@Injectable()
export class SuperAdminService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  // Retrieve admin user profile info
  async getAdminProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    return {
      id: user.id,
      userIdHandle: user.userIdHandle,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile || '',
      designation: user.designation || 'Chief Administrator',
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      lastPasswordChange: user.lastPasswordChange,
      createdAt: user.createdAt,
    };
  }

  // Update profile settings
  async updateAdminProfile(userId: number, payload: { userIdHandle: string; fullName: string; email: string; mobile?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    // Verify unique handle if changed
    if (payload.userIdHandle !== user.userIdHandle) {
      const handleExists = await this.prisma.user.findUnique({
        where: { userIdHandle: payload.userIdHandle },
      });
      if (handleExists) {
        throw new Error('Username handle is already taken.');
      }
    }

    // Verify unique email if changed
    if (payload.email !== user.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: payload.email, NOT: { id: userId } },
      });
      if (emailExists) {
        throw new Error('Email address is already in use by another profile.');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        userIdHandle: payload.userIdHandle,
        fullName: payload.fullName,
        email: payload.email,
        mobile: payload.mobile || null,
      },
    });
  }

  // Reset or change password
  async changeAdminPassword(userId: number, payload: { currentPass: string; newPass: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const isMatch = await bcrypt.compare(payload.currentPass, user.passwordHash);
    if (!isMatch) {
      throw new Error('Incorrect current password.');
    }

    if (payload.newPass.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.newPass, salt);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        lastPasswordChange: new Date(),
      },
    });
  }

  // Set/update custom backup deletion security password (Super Admin Only)
  async setBackupDeletionPassword(companyId: number, adminUserId: number, newPassword: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || !admin.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('Backup security password must be at least 4 characters long.');
    }

    const deletionPasswordHash = await bcrypt.hash(newPassword, 10);

    const existing = await this.prisma.systemSetting.findFirst({
      where: { companyId, settingKey: 'BACKUP_SETTINGS' },
    });
    const settings = (existing?.settingValue as any) || {};
    const updatedSettings = {
      ...settings,
      deletionPasswordHash,
    };

    await this.prisma.systemSetting.upsert({
      where: {
        companyId_settingKey: {
          companyId,
          settingKey: 'BACKUP_SETTINGS',
        },
      },
      update: {
        settingValue: updatedSettings,
        updatedBy: adminUserId,
      },
      create: {
        companyId,
        settingKey: 'BACKUP_SETTINGS',
        settingValue: updatedSettings,
        category: 'SYSTEM',
        description: 'Database Backup & Recovery configuration settings',
        updatedBy: adminUserId,
      },
    });

    return { success: true, message: 'Backup security deletion password set successfully!' };
  }

  // Retrieve metrics for Super Admin dashboard console
  async getAdminDashboardMetrics(_companyId: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const totalUsers = await this.prisma.user.count({ where: { isDeleted: false } });
    const lockedUsers = await this.prisma.user.count({ where: { isDeleted: false, status: 'LOCKED' } });

    // Fetch latest successful backup record
    const lastBackup = await this.prisma.backupRecord.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    // Query active sessions count
    const activeSessions = await this.prisma.userSession.count({
      where: { isActive: true },
    });

    // Fetch active sessions list
    const sessionList = await this.prisma.userSession.findMany({
      where: { isActive: true },
      include: { user: true },
      orderBy: { lastActivityAt: 'desc' },
      take: 10,
    });

    const formattedSessions = sessionList.map((s) => {
      const durationMs = Date.now() - s.loginAt.getTime();
      const hours = Math.floor(durationMs / 3600000);
      const mins = Math.floor((durationMs % 3600000) / 60000);
      return {
        id: s.id,
        username: s.user.fullName,
        ipAddress: s.ipAddress || '127.0.0.1',
        createdAt: s.loginAt,
        duration: `${hours}h ${mins}m`,
      };
    });

    return {
      totalUsers,
      lockedUsers,
      activeSessions,
      lastBackupTime: lastBackup ? lastBackup.createdAt : null,
      sessions: formattedSessions,
    };
  }

  // Admin override to terminate user session
  async terminateUserSession(userId: number, sessionId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        logoutAt: new Date(),
      },
    });

    return { success: true };
  }

  // List all users with query and status filters
  async listUsers(
    adminUserId: number,
    filters: { search?: string; status?: string; companyId?: number; designation?: string }
  ) {
    if (adminUserId) {
      const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
      if (adminUser && !adminUser.isSuperAdmin && (adminUser as any).role !== 'SUPER_ADMIN') {
        // Allow staff lookup
      }
    }

    const whereClause: any = {
      isDeleted: false,
    };

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.designation) {
      whereClause.designation = filters.designation;
    }

    if (filters?.search) {
      const query = filters.search.trim();
      whereClause.OR = [
        { employeeCode: { contains: query } },
        { fullName: { contains: query } },
        { userIdHandle: { contains: query } },
        { email: { contains: query } },
      ];
    }

    if (filters?.companyId) {
      whereClause.companyAccess = {
        some: {
          companyId: Number(filters.companyId),
        },
      };
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        companyAccess: {
          where: {
            company: { isDeleted: false },
          },
          include: {
            company: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      employeeCode: u.employeeCode || '',
      fullName: u.fullName,
      userIdHandle: u.userIdHandle,
      email: u.email,
      mobile: u.mobile || '',
      department: u.department || '',
      designation: u.designation || '',
      remarks: u.remarks || '',
      status: u.status,
      isSuperAdmin: u.isSuperAdmin,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      assignedCompanies: u.companyAccess
        .filter((ca) => ca.company && !(ca.company as any).isDeleted)
        .map((ca) => ({
          id: ca.company.id,
          companyName: ca.company.companyName,
        })),
    }));
  }

  // Create standard user account
  async createUser(
    adminUserId: number,
    payload: {
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
    }
  ) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    // Validations
    if (payload.employeeCode) {
      const codeExists = await this.prisma.user.findFirst({
        where: { employeeCode: payload.employeeCode, isDeleted: false },
      });
      if (codeExists) {
        throw new Error('Employee Code is already assigned.');
      }
    }

    const handleExists = await this.prisma.user.findFirst({
      where: { userIdHandle: payload.userIdHandle },
    });
    if (handleExists) {
      throw new Error('Login Username is already taken.');
    }

    const emailExists = await this.prisma.user.findFirst({
      where: { email: payload.email },
    });
    if (emailExists) {
      throw new Error('Email address is already registered.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.passwordPlain, salt);

    const user = await this.prisma.user.create({
      data: {
        employeeCode: payload.employeeCode || null,
        fullName: payload.fullName,
        userIdHandle: payload.userIdHandle,
        email: payload.email,
        mobile: payload.mobile || null,
        department: payload.department || null,
        designation: payload.designation || null,
        remarks: payload.remarks || null,
        passwordHash,
        status: 'ACTIVE',
        isSuperAdmin: false,
        createdBy: adminUserId,
      },
    });

    if (payload.assignedCompanyIds && payload.assignedCompanyIds.length > 0) {
      await this.prisma.userCompanyAccess.createMany({
        data: payload.assignedCompanyIds.map((cId) => ({
          userId: user.id,
          companyId: cId,
        })),
      });
    }

    return user;
  }

  // Update existing user account
  async updateUser(
    adminUserId: number,
    userId: number,
    payload: {
      employeeCode: string;
      fullName: string;
      userIdHandle: string;
      email: string;
      mobile?: string;
      department?: string;
      designation?: string;
      remarks?: string;
      assignedCompanyIds: number[];
    }
  ) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new Error('User profile not found.');
    }

    // Validations
    if (payload.employeeCode && payload.employeeCode !== existingUser.employeeCode) {
      const codeExists = await this.prisma.user.findFirst({
        where: { employeeCode: payload.employeeCode, NOT: { id: userId }, isDeleted: false },
      });
      if (codeExists) {
        throw new Error('Employee Code is already assigned.');
      }
    }

    if (payload.userIdHandle !== existingUser.userIdHandle) {
      const handleExists = await this.prisma.user.findFirst({
        where: { userIdHandle: payload.userIdHandle, NOT: { id: userId } },
      });
      if (handleExists) {
        throw new Error('Login Username is already taken.');
      }
    }

    if (payload.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: payload.email, NOT: { id: userId } },
      });
      if (emailExists) {
        throw new Error('Email address is already registered.');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        employeeCode: payload.employeeCode || null,
        fullName: payload.fullName,
        userIdHandle: payload.userIdHandle,
        email: payload.email,
        mobile: payload.mobile || null,
        department: payload.department || null,
        designation: payload.designation || null,
        remarks: payload.remarks || null,
        updatedBy: adminUserId,
      },
    });

    // Sync company access
    await this.prisma.userCompanyAccess.deleteMany({ where: { userId } });
    if (payload.assignedCompanyIds && payload.assignedCompanyIds.length > 0) {
      await this.prisma.userCompanyAccess.createMany({
        data: payload.assignedCompanyIds.map((cId) => ({
          userId,
          companyId: cId,
        })),
      });
    }

    return updatedUser;
  }

  // Administrative password override/reset
  async changeUserPasswordByAdmin(adminUserId: number, userId: number, newPass: string) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    if (newPass.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPass, salt);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        lastPasswordChange: new Date(),
        updatedBy: adminUserId,
      },
    });
  }

  // Toggle user Lockout
  async toggleUserLockByAdmin(adminUserId: number, userId: number) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw new Error('User not found.');
    }

    const isLocked = targetUser.status === 'LOCKED';
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: isLocked ? 'ACTIVE' : 'LOCKED',
        failedLoginAttempts: isLocked ? 0 : targetUser.failedLoginAttempts,
        updatedBy: adminUserId,
      },
    });
  }

  // Toggle user status
  async toggleUserStatusByAdmin(
    adminUserId: number,
    userId: number,
    status: 'ACTIVE' | 'INACTIVE' | 'DISABLED'
  ) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status,
        updatedBy: adminUserId,
      },
    });
  }

  // Soft-delete user
  async deleteUserByAdmin(adminUserId: number, userId: number) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw new Error('User not found.');
    }

    if (targetUser.isSuperAdmin) {
      throw new Error('Root Super Admin cannot be deleted.');
    }

    await this.prisma.userCompanyAccess.deleteMany({ where: { userId } });

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedBy: adminUserId,
        deletedAt: new Date(),
      },
    });
  }

  // ─── Phase 14.4: Page Access Control ────────────────────────

  // Get all allowed page URIs for a user
  async getUserPagePermissions(adminUserId: number, targetUserId: number) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const perms = await this.prisma.pagePermission.findMany({
      where: { userId: targetUserId, canView: true },
    });

    return perms.map((p) => p.pageUri);
  }

  // Replace all page permissions for a user atomically
  async saveUserPagePermissions(adminUserId: number, targetUserId: number, allowedPages: string[]) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new Error('Target user not found.');
    }
    if (targetUser.isSuperAdmin) {
      throw new Error('Super Admin permissions cannot be modified.');
    }

    // Delete all existing page permissions for this user
    await this.prisma.pagePermission.deleteMany({
      where: { userId: targetUserId },
    });

    // Insert new permissions
    if (allowedPages.length > 0) {
      await this.prisma.pagePermission.createMany({
        data: allowedPages.map((pageUri) => ({
          userId: targetUserId,
          pageUri,
          canView: true,
        })),
      });
    }

    return { success: true, count: allowedPages.length };
  }

  // Copy permissions from one user to another
  async copyUserPermissions(adminUserId: number, fromUserId: number, toUserId: number) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const toUser = await this.prisma.user.findUnique({ where: { id: toUserId } });
    if (!toUser) {
      throw new Error('Target user not found.');
    }
    if (toUser.isSuperAdmin) {
      throw new Error('Super Admin permissions cannot be modified.');
    }

    const sourcePerms = await this.prisma.pagePermission.findMany({
      where: { userId: fromUserId, canView: true },
    });

    // Delete existing permissions for target user
    await this.prisma.pagePermission.deleteMany({
      where: { userId: toUserId },
    });

    // Copy source permissions
    if (sourcePerms.length > 0) {
      await this.prisma.pagePermission.createMany({
        data: sourcePerms.map((p) => ({
          userId: toUserId,
          pageUri: p.pageUri,
          canView: true,
        })),
      });
    }

    return { success: true, copiedCount: sourcePerms.length };
  }

  // Public: Get allowed pages for any user (used during session bootstrap)
  async getAllowedPagesForUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found.');
    }

    // Super Admin bypasses all restrictions
    if (user.isSuperAdmin) {
      return { isSuperAdmin: true, allowedPages: [] as string[] };
    }

    const perms = await this.prisma.pagePermission.findMany({
      where: { userId, canView: true },
    });

    return {
      isSuperAdmin: false,
      allowedPages: perms.map((p) => p.pageUri),
    };
  }

  // ─── Phase 14.5: Module Actions Security ──────────────────────

  // Get module action permissions for a user
  async getUserModulePermissions(adminUserId: number, targetUserId: number) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const perms = await this.prisma.modulePermission.findMany({
      where: { userId: targetUserId },
    });

    return perms.map((p) => ({
      moduleCode: p.moduleCode,
      actionCode: p.actionCode,
      isAllowed: p.isAllowed,
    }));
  }

  // Replace all module action permissions for a user
  async saveUserModulePermissions(
    adminUserId: number,
    targetUserId: number,
    permissions: { moduleCode: string; actionCode: string; isAllowed: boolean }[]
  ) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new Error('Target user not found.');
    }
    if (targetUser.isSuperAdmin) {
      throw new Error('Super Admin permissions cannot be modified.');
    }

    // Delete existing module permissions for this user
    await this.prisma.modulePermission.deleteMany({
      where: { userId: targetUserId },
    });

    // Insert new module permissions
    if (permissions.length > 0) {
      await this.prisma.modulePermission.createMany({
        data: permissions.map((p) => ({
          userId: targetUserId,
          moduleCode: p.moduleCode,
          actionCode: p.actionCode,
          isAllowed: p.isAllowed,
        })),
      });
    }

    return { success: true, count: permissions.length };
  }

  // Public: Get module action permissions for session hydration
  async getAllowedModuleActionsForUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found.');
    }

    if (user.isSuperAdmin) {
      return { isSuperAdmin: true, actions: [] };
    }

    const perms = await this.prisma.modulePermission.findMany({
      where: { userId, isAllowed: true },
    });

    return {
      isSuperAdmin: false,
      actions: perms.map((p) => ({
        moduleCode: p.moduleCode,
        actionCode: p.actionCode,
      })),
    };
  }

  // ─── Phase 14.6: User Activity Monitoring & Productivity ──────

  async getActivityLogs(
    adminUserId: number,
    filters?: {
      targetUserId?: number;
      moduleCode?: string;
      action?: string;
      search?: string;
      limit?: number;
    }
  ) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const where: any = {};

    if (filters?.targetUserId) {
      where.userId = filters.targetUserId;
    }
    if (filters?.moduleCode) {
      where.moduleCode = filters.moduleCode;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.search) {
      where.OR = [
        { description: { contains: filters.search } },
        { action: { contains: filters.search } },
        { moduleCode: { contains: filters.search } },
      ];
    }

    const activityLogs = await this.prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            userIdHandle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });

    const sessions = await this.prisma.userSession.findMany({
      where: filters?.targetUserId ? { userId: filters.targetUserId } : {},
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            userIdHandle: true,
          },
        },
      },
      orderBy: { loginAt: 'desc' },
      take: filters?.limit || 100,
    });

    // Filter activity logs to exclude raw LOGIN / LOGOUT actions (which are paired in UserSession)
    const filteredActivityLogs = activityLogs.filter(l => l.action !== 'LOGIN' && l.action !== 'LOGOUT');

    const combined = [
      ...sessions.map((s) => {
        const loginStr = new Date(s.loginAt).toLocaleTimeString();
        const logoutStr = s.logoutAt ? new Date(s.logoutAt).toLocaleTimeString() : 'Active Session';
        
        // Calculate session duration string
        let durationStr = 'Active';
        if (s.logoutAt) {
          const diffMs = new Date(s.logoutAt).getTime() - new Date(s.loginAt).getTime();
          const mins = Math.floor(diffMs / 60000);
          const secs = Math.floor((diffMs % 60000) / 1000);
          durationStr = `${mins}m ${secs}s`;
        }

        return {
          id: `sess_${s.id}`,
          userId: s.userId,
          userName: s.user.fullName,
          username: s.user.userIdHandle,
          action: s.isActive ? 'SESSION ACTIVE' : 'SESSION COMPLETED',
          moduleCode: 'SESSION',
          entityType: 'UserSession',
          entityId: s.id,
          description: `Login: ${loginStr} | Logout: ${logoutStr} (Duration: ${durationStr})`,
          ipAddress: s.ipAddress || '127.0.0.1',
          createdAt: s.loginAt,
          loginAt: s.loginAt,
          logoutAt: s.logoutAt,
          durationStr,
        };
      }),
      ...filteredActivityLogs.map((l) => ({
        id: `act_${l.id}`,
        userId: l.userId,
        userName: l.user.fullName,
        username: l.user.userIdHandle,
        action: l.action,
        moduleCode: l.moduleCode || 'SYSTEM',
        entityType: l.entityType,
        entityId: l.entityId,
        description: l.description,
        ipAddress: l.ipAddress || '127.0.0.1',
        createdAt: l.createdAt,
        loginAt: null,
        logoutAt: null,
        durationStr: null,
      })),
    ];

    // Sort combined records strictly latest first (descending timestamp)
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return combined.slice(0, filters?.limit || 100);
  }

  async getUserTimeline(adminUserId: number, targetUserId: number) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const logs = await this.prisma.activityLog.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map((l) => ({
      id: l.id,
      action: l.action,
      moduleCode: l.moduleCode,
      description: l.description,
      timestamp: l.createdAt,
    }));
  }

  async getProductivityMetrics(adminUserId: number) {
    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.isSuperAdmin) {
      throw new UnauthorizedException('Access restricted to Super Admin only.');
    }

    const totalEvents = await this.prisma.activityLog.count();
    const activeSessionsCount = await this.prisma.userSession.count({ where: { isActive: true } });

    // Activity counts grouped by action
    const actionGroups = await this.prisma.activityLog.groupBy({
      by: ['action'],
      _count: { action: true },
    });

    const topActions = actionGroups.map((g) => ({
      action: g.action,
      count: g._count.action,
    }));

    return {
      totalEvents,
      activeSessionsCount,
      topActions,
    };
  }
}


