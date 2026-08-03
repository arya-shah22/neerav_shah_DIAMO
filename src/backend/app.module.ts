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
import { JobModule } from './modules/job/job.module';
import { JournalModule } from './modules/journal/journal.module';
import { CashBankModule } from './modules/cashbank/cashbank.module';
import { LoanModule } from './modules/loan/loan.module';
import { ReportModule } from './modules/report/report.module';
import { ReportValidationModule } from './modules/report-validation/report-validation.module';
import { PrintTemplateModule } from './modules/print-template/print-template.module';
import { BackupModule } from './modules/backup/backup.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/system-health/health.module';
import { LicenseModule } from './modules/system-license/license.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UserWorkspaceModule } from './modules/user-workspace/workspace.module';
import { ExchangeRateModule } from './modules/exchange-rate/exchange-rate.module';

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
    JobModule,
    JournalModule,
    CashBankModule,
    LoanModule,
    ReportModule,
    ReportValidationModule,
    PrintTemplateModule,
    BackupModule,
    PreferencesModule,
    AuditModule,
    HealthModule,
    LicenseModule,
    SuperAdminModule,
    DashboardModule,
    NotificationModule,
    UserWorkspaceModule,
    ExchangeRateModule,
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
