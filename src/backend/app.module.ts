// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Root AppModule
// ═══════════════════════════════════════════════════════════════

import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { FinancialYearModule } from './modules/financial-year/fy.module';
import { AccountGroupModule } from './modules/account-group/account-group.module';
import { AccountModule } from './modules/account/account.module';
import { BrokerModule } from './modules/broker/broker.module';
import { QualityModule } from './modules/quality/quality.module';
import { StockModule } from './modules/stock/stock.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { ChallanModule } from './modules/challan/challan.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CompanyModule,
    FinancialYearModule,
    AccountGroupModule,
    AccountModule,
    BrokerModule,
    QualityModule,
    StockModule,
    InvoiceModule,
    ChallanModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
})
export class AppModule {}
