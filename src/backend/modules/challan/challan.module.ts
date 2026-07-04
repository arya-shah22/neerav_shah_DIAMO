// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Challan Module (Stage 6)
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { ChallanService } from './challan.service';
import { ChallanController } from './challan.controller';

@Module({
  providers: [ChallanService, ChallanController],
  exports: [ChallanService, ChallanController],
})
export class ChallanModule {}
