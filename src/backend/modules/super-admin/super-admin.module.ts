// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Super Admin & System Ownership NestJS Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';

@Module({
  providers: [SuperAdminService, SuperAdminController],
  exports: [SuperAdminService, SuperAdminController],
})
export class SuperAdminModule {}
