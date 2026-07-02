// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Financial Year Module Backend
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { FinancialYearService } from './fy.service';
import { FinancialYearController } from './fy.controller';

@Module({
  providers: [FinancialYearService, FinancialYearController],
  exports: [FinancialYearService, FinancialYearController],
})
export class FinancialYearModule {}
