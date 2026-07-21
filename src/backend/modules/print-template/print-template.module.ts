// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Print Template Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PrintTemplateService } from './print-template.service';
import { PrintTemplateController } from './print-template.controller';

@Module({
  providers: [PrintTemplateService, PrintTemplateController],
  exports: [PrintTemplateService, PrintTemplateController],
})
export class PrintTemplateModule {}
