// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Dashboard Module
// Phase 15.1: Dashboard Foundation Nest Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardController],
  exports: [DashboardService, DashboardController],
})
export class DashboardModule {}
