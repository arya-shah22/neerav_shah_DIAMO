// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  providers: [AccountService, AccountController],
  exports: [AccountService, AccountController],
})
export class AccountModule {}
