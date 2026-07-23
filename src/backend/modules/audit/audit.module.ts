// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Audit & Security NestJS Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  providers: [AuditService, AuditController],
  exports: [AuditService, AuditController],
})
export class AuditModule {}
