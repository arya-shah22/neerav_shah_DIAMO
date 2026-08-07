import { FinancialReportService } from '../src/backend/modules/report/services/financial-report.service';
import { PrismaClient } from '@prisma/client';

async function test() {
  const prisma = new PrismaClient();
  const service = new FinancialReportService();
  (service as any).prisma = prisma;
  const bs = await service.getBalanceSheet(1);
  console.log('ASSETS:', JSON.stringify(bs.assets, null, 2));
  console.log('LIABILITIES:', JSON.stringify(bs.liabilities, null, 2));
  console.log('CAPITAL:', JSON.stringify(bs.capital, null, 2));
  console.log('TOTAL ASSETS:', bs.totalAssets);
  console.log('TOTAL LIABILITIES:', bs.totalLiabilities);
  console.log('TOTAL CAPITAL:', bs.totalCapital);
  console.log('VARIANCE:', bs.variance);
  console.log('IS BALANCED:', bs.isBalanced);
  await prisma.$disconnect();
}
test().catch(err => {
  console.error(err);
});
