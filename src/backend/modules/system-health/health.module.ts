// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Database Health & Diagnostics NestJS Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

@Module({
  providers: [HealthService, HealthController],
  exports: [HealthService, HealthController],
})
export class HealthModule {}
