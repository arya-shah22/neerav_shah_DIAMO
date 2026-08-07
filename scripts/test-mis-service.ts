import { MisReportService } from '../src/backend/modules/report/services/mis-report.service';
import { PrismaClient } from '@prisma/client';

async function testMis() {
  const prisma = new PrismaClient();
  const service = new MisReportService();
  (service as any).prisma = prisma;

  const dash = await service.getMisDashboard(1);
  console.log('MIS DASHBOARD RESPONSE:', JSON.stringify(dash, null, 2));

  const stockJob = await service.getMisStockJobAnalytics(1);
  console.log('MIS STOCK JOB RESPONSE:', JSON.stringify(stockJob, null, 2));

  const ratios = await service.getMisFinancialRatios(1);
  console.log('MIS RATIOS RESPONSE:', JSON.stringify(ratios, null, 2));

  await prisma.$disconnect();
}

testMis().catch(console.error);
