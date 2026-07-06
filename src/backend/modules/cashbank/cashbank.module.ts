// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Cash & Bank Voucher Module (Phase 9)
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CashBankService } from './cashbank.service';
import { CashBankController } from './cashbank.controller';

@Module({
  imports: [PrismaModule],
  providers: [CashBankService],
  controllers: [CashBankController],
  exports: [CashBankService],
})
export class CashBankModule {}
// ═══════════════════════════════════════════════════════════════
