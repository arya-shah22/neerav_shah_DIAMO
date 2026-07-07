import { PrismaClient } from '@prisma/client';
import { ReportService } from '../src/backend/modules/report/report.service';
import { PrismaService } from '../src/backend/database/prisma.service';

const prisma = new PrismaClient();
const prismaService = prisma as unknown as PrismaService;
const reportService = new ReportService();
(reportService as any).prisma = prismaService;

async function run() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('No company found');
    return;
  }

  console.log(`Company: ${company.companyName} (ID: ${company.id})`);

  // Before
  const beforeCount = await prisma.generalLedgerEntry.count({ where: { companyId: company.id } });
  console.log(`GL Entries BEFORE reconciliation: ${beforeCount}`);

  // Run reconciliation
  await reportService.reconcileLegacyEntries(company.id);

  // After
  const afterCount = await prisma.generalLedgerEntry.count({ where: { companyId: company.id } });
  console.log(`GL Entries AFTER reconciliation: ${afterCount}`);
  console.log(`New entries created: ${afterCount - beforeCount}`);

  // Verify GL entries by voucher type
  const byType = await prisma.generalLedgerEntry.groupBy({
    by: ['sourceVoucherType'],
    where: { companyId: company.id },
    _count: true,
    _sum: { amount: true },
  });
  console.log('\nGL Entries by VoucherType:');
  for (const row of byType) {
    console.log(`  ${row.sourceVoucherType}: ${row._count} entries, total ₹${row._sum.amount}`);
  }

  // Quick ledger test
  const accounts = await prisma.account.findMany({
    where: { companyId: company.id, isDeleted: false },
    select: { id: true, accountName: true },
  });

  if (accounts.length > 0) {
    const testAcc = accounts[0];
    console.log(`\nTesting ledger for: ${testAcc.accountName} (ID: ${testAcc.id})`);
    const ledger = await reportService.getLedger(company.id, testAcc.id);
    console.log(`  Opening: ₹${ledger.openingBalance}, Closing: ₹${ledger.closingBalance}, Entries: ${ledger.statements.length}`);
  }

  // Test outstanding
  const outstanding = await reportService.getOutstanding(company.id, 'RECEIVABLE');
  console.log(`\nOutstanding Receivables: ${outstanding.length} parties`);
  for (const o of outstanding) {
    console.log(`  ${o.accountName}: ₹${o.totalOutstanding}`);
  }

  console.log('\n✅ Reconciliation verification complete!');
}

run().finally(() => prisma.$disconnect());
