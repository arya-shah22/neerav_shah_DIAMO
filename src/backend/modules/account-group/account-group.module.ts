// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Group Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { AccountGroupService } from './account-group.service';
import { AccountGroupController } from './account-group.controller';

@Module({
  providers: [AccountGroupService, AccountGroupController],
  exports: [AccountGroupService, AccountGroupController],
})
export class AccountGroupModule {}
