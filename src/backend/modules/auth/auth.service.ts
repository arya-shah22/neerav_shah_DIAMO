// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Auth Service Backend
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcryptjs';

export interface AuthUserPayload {
  id: number;
  userIdHandle: string;
  fullName: string;
  email: string;
  isSuperAdmin: boolean;
}

export interface LoginResult extends AuthUserPayload {
  sessionToken: string;
}

@Injectable()
export class AuthService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async validateUser(loginDto: LoginDto): Promise<LoginResult> {
    const { userIdHandle, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: {
        userIdHandle,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Your account has been locked. Please contact your Super Administrator.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive or blocked');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const nextFailedAttempts = user.failedLoginAttempts + 1;
      const mustLock = nextFailedAttempts >= 5;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          failedLoginAttempts: nextFailedAttempts,
          status: mustLock ? 'LOCKED' : user.status
        },
      });
      await this.logLoginHistory(user.id, 'FAILED', mustLock ? 'Account locked after 5 failed attempts' : 'Invalid password');
      
      if (mustLock) {
        throw new UnauthorizedException('Your account has been locked due to 5 consecutive failed login attempts. Please contact your Super Administrator.');
      }
      throw new UnauthorizedException('Invalid username or password');
    }

    const sessionToken = await this.createSession(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    await this.logLoginHistory(user.id, 'LOGIN');
    await this.logActivity(user.id, 'LOGIN', `User ${user.userIdHandle} logged in successfully.`);

    return {
      id: user.id,
      userIdHandle: user.userIdHandle,
      fullName: user.fullName,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      sessionToken,
    };
  }

  async validateSession(sessionToken: string): Promise<AuthUserPayload> {
    const session = await this.prisma.userSession.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || !session.isActive) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    if (session.user.isDeleted || session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is no longer active');
    }

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return {
      id: session.user.id,
      userIdHandle: session.user.userIdHandle,
      fullName: session.user.fullName,
      email: session.user.email,
      isSuperAdmin: session.user.isSuperAdmin,
    };
  }

  async endSession(sessionToken: string, userId: number, username: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { sessionToken, isActive: true },
      data: {
        isActive: false,
        logoutAt: new Date(),
      },
    });

    await this.logLoginHistory(userId, 'LOGOUT');
    await this.logActivity(userId, 'LOGOUT', `User ${username} logged out.`);
  }

  private async createSession(userId: number): Promise<string> {
    const sessionToken = randomBytes(32).toString('hex');

    await this.prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        hostname: 'localhost',
        ipAddress: '127.0.0.1',
        isActive: true,
        lastActivityAt: new Date(),
      },
    });

    return sessionToken;
  }

  private async logLoginHistory(
    userId: number,
    action: 'LOGIN' | 'LOGOUT' | 'FAILED',
    failReason?: string,
  ): Promise<void> {
    try {
      await this.prisma.loginHistory.create({
        data: {
          userId,
          action,
          hostname: 'localhost',
          ipAddress: '127.0.0.1',
          failReason: failReason || null,
        },
      });
    } catch (error) {
      console.error('[AuthService] Failed to write login history:', error);
    }
  }

  async logActivity(userId: number, action: string, description: string): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          description,
          ipAddress: '127.0.0.1',
        },
      });
    } catch (error) {
      console.error('[AuthService] Failed to log user activity:', error);
    }
  }
}
