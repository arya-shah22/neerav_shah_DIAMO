// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Module (Stage 3)
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';

@Module({
  providers: [StockService, StockController],
  exports: [StockService, StockController],
})
export class StockModule {}
