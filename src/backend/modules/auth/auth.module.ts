// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Auth Module Wrapper
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [AuthService, AuthController],
  exports: [AuthService, AuthController],
})
export class AuthModule {}
