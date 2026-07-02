// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Auth Service Backend
// ═══════════════════════════════════════════════════════════════

import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async validateUser(loginDto: LoginDto) {
    const { userIdHandle, password } = loginDto;
    console.log(`[AuthService] Attempting login for user: "${userIdHandle}"`);

    // Fetch user from DB
    const user = await this.prisma.user.findFirst({
      where: {
        userIdHandle: userIdHandle,
        isDeleted: false,
      },
    });

    if (!user) {
      console.log(`[AuthService] User not found or deleted: "${userIdHandle}"`);
      throw new UnauthorizedException('Invalid username or password');
    }

    console.log(`[AuthService] User found. ID: ${user.id}, Status: ${user.status}`);

    if (user.status !== 'ACTIVE') {
      console.log(`[AuthService] User account is not active. Status: ${user.status}`);
      throw new UnauthorizedException('User account is inactive or blocked');
    }

    // Compare bcrypt hashes
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log(`[AuthService] Bcrypt comparison result: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      // Increment failed login count
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid username or password');
    }

    // Reset failed login attempts and update last login timestamp
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    console.log(`[AuthService] Login successful for user: "${userIdHandle}"`);

    // Return safe user data without password hash
    return {
      id: updatedUser.id,
      userIdHandle: updatedUser.userIdHandle,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      isSuperAdmin: updatedUser.isSuperAdmin,
    };
  }

  async logActivity(userId: number, action: string, description: string) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          description,
          ipAddress: '127.0.0.1', // Desktop offline app default
        },
      });
    } catch (error) {
      console.error('Failed to log user activity:', error);
    }
  }
}
