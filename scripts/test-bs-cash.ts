import { FinancialReportService } from '../src/backend/modules/report/services/financial-report.service';
import { PrismaClient } from '@prisma/client';

async function testBSCash() {
  const prisma = new PrismaClient();
  const service = new FinancialReportService();
  (service as any).prisma = prisma;
  const bs = await service.getBalanceSheet(1);
  const cashAssets = bs.assets.filter(a => a.groupName.includes('Cash') || a.groupName.includes('Bank'));
  console.log('Cash & Bank Assets on Balance Sheet:', cashAssets);
  const sumCashBS = cashAssets.reduce((s, a) => s + a.amount, 0);
  console.log('Total Cash & Bank Assets on Balance Sheet:', sumCashBS);
  await prisma.$disconnect();
}

testBSCash().catch(console.error);
