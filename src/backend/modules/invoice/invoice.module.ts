// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Invoice Module definition
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';

@Module({
  providers: [InvoiceService, InvoiceController],
  exports: [InvoiceService, InvoiceController],
})
export class InvoiceModule {}
