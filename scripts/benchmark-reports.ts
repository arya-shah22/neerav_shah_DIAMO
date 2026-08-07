import { FinancialReportService } from '../src/backend/modules/report/services/financial-report.service';
import { PrismaClient } from '@prisma/client';

async function benchmarkReportPerformance() {
  const prisma = new PrismaClient();
  const service = new FinancialReportService();
  (service as any).prisma = prisma;

  console.log('⏱️ Benchmarking report loading times...');

  let t0 = Date.now();
  await service.getTrialBalance(1);
  console.log(`1. getTrialBalance took: ${Date.now() - t0} ms`);

  t0 = Date.now();
  await service.getProfitLoss(1);
  console.log(`2. getProfitLoss took: ${Date.now() - t0} ms`);

  t0 = Date.now();
  await service.getBalanceSheet(1);
  console.log(`3. getBalanceSheet took: ${Date.now() - t0} ms`);

  t0 = Date.now();
  await service.getCashFlow(1);
  console.log(`4. getCashFlow took: ${Date.now() - t0} ms`);

  t0 = Date.now();
  await service.getFundFlow(1);
  console.log(`5. getFundFlow took: ${Date.now() - t0} ms`);

  t0 = Date.now();
  await service.getOutstanding(1, 'RECEIVABLE');
  console.log(`6. getOutstanding (RECEIVABLE) took: ${Date.now() - t0} ms`);

  await prisma.$disconnect();
}

benchmarkReportPerformance().catch(console.error);
