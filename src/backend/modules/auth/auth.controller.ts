// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Auth Controller (IPC Bridge handler)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { IApiResponse } from '../../../shared/types/common.types';

@Injectable()
@Controller()
export class AuthController {
  @Inject(AuthService)
  private readonly authService!: AuthService;

  async handleLogin(payload: LoginDto): Promise<IApiResponse> {
    try {
      const user = await this.authService.validateUser(payload);
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  async handleLogout(payload: {
    sessionToken: string;
    userId: number;
    username: string;
  }): Promise<IApiResponse> {
    try {
      await this.authService.endSession(payload.sessionToken, payload.userId, payload.username);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  async handleSession(payload: { sessionToken: string }): Promise<IApiResponse> {
    try {
      const user = await this.authService.validateSession(payload.sessionToken);
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session invalid',
      };
    }
  }
}
