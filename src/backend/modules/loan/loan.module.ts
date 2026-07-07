// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Loan Management Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { LoanService } from './loan.service';
import { LoanController } from './loan.controller';
import { CashBankModule } from '../cashbank/cashbank.module';

@Module({
  imports: [PrismaModule, CashBankModule],
  providers: [LoanService],
  controllers: [LoanController],
  exports: [LoanService],
})
export class LoanModule {}
