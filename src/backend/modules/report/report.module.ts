import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { FinancialReportService } from './services/financial-report.service';
import { GstReportService } from './services/gst-report.service';
import { TdsTcsReportService } from './services/tds-tcs-report.service';
import { MisReportService } from './services/mis-report.service';

@Module({
  controllers: [ReportController],
  providers: [
    ReportService,
    FinancialReportService,
    GstReportService,
    TdsTcsReportService,
    MisReportService,
  ],
  exports: [
    ReportService,
    FinancialReportService,
    GstReportService,
    TdsTcsReportService,
    MisReportService,
  ],
})
export class ReportModule {}
