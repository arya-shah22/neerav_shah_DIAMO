// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Quality Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';

@Module({
  providers: [QualityService, QualityController],
  exports: [QualityService, QualityController],
})
export class QualityModule {}
