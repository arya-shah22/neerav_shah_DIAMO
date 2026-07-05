// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Job Book Module (Stage 8 / Phase 7)
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { JobService } from './job.service';
import { JobController } from './job.controller';

@Module({
  imports: [PrismaModule],
  providers: [JobService],
  controllers: [JobController],
  exports: [JobService],
})
export class JobModule {}
