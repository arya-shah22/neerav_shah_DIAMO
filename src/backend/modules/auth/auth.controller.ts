// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Auth Controller (IPC Bridge handler)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { IApiResponse } from '../../../shared/types/common.types';

@Injectable()
@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  async handleLogin(payload: LoginDto): Promise<IApiResponse> {
    try {
      const user = await this.authService.validateUser(payload);
      await this.authService.logActivity(user.id, 'LOGIN', `User ${user.userIdHandle} logged in successfully.`);
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  async handleLogout(payload: { userId: number; username: string }): Promise<IApiResponse> {
    try {
      await this.authService.logActivity(payload.userId, 'LOGOUT', `User ${payload.username} logged out.`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout logging failed',
      };
    }
  }
}
