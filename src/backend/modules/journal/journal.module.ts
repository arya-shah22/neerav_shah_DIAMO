// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Journal Voucher Module (Stage 7 / Phase 8)
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';

@Module({
  imports: [PrismaModule],
  providers: [JournalService],
  controllers: [JournalController],
  exports: [JournalService],
})
export class JournalModule {}
