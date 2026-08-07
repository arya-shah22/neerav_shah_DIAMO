import { ReportValidationService } from '../src/backend/modules/report-validation/report-validation.service';
import { ReportService } from '../src/backend/modules/report/report.service';
import { FinancialReportService } from '../src/backend/modules/report/services/financial-report.service';
import { PrismaClient } from '@prisma/client';

async function testHealthDiagnostics() {
  const prisma = new PrismaClient();
  const financialReportService = new FinancialReportService();
  (financialReportService as any).prisma = prisma;

  const reportService = new ReportService();
  (reportService as any).financialReportService = financialReportService;

  const validationService = new ReportValidationService();
  (validationService as any).prisma = prisma;
  (validationService as any).reportService = reportService;

  const result = await validationService.runHealthChecks(1);
  console.log('HEALTH DIAGNOSTICS RESULT:', JSON.stringify(result, null, 2));

  await prisma.$disconnect();
}

testHealthDiagnostics().catch(console.error);
