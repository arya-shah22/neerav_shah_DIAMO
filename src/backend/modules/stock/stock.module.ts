// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Module (Stage 3)
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { StockConversionService } from './stock-conversion.service';
import { StockConversionController } from './stock-conversion.controller';

@Module({
  providers: [StockService, StockController, StockConversionService, StockConversionController],
  exports: [StockService, StockController, StockConversionService, StockConversionController],
})
export class StockModule {}
