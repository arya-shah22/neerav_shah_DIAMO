import { PrismaClient, DebitCreditType } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const companyId = 1; // Company ID = 1 (Test / DST)
  
  // Find accounts containing "cash" or "bank"
  const accounts = await prisma.account.findMany({
    where: { companyId, isDeleted: false }
  });

  console.log('--- Accounts found for Company 1 ---');
  for (const acc of accounts) {
    // Calculate total debits
    const debits = await prisma.generalLedgerEntry.aggregate({
      where: { companyId, accountId: acc.id, debitCreditType: DebitCreditType.DEBIT },
      _sum: { amount: true }
    });
    // Calculate total credits
    const credits = await prisma.generalLedgerEntry.aggregate({
      where: { companyId, accountId: acc.id, debitCreditType: DebitCreditType.CREDIT },
      _sum: { amount: true }
    });

    const dSum = Number(debits._sum.amount) || 0;
    const cSum = Number(credits._sum.amount) || 0;
    const op = Number(acc.openingBalanceAmount) || 0;
    const isDebit = acc.openingBalanceType === DebitCreditType.DEBIT;
    const running = isDebit ? (op + dSum - cSum) : (-op + dSum - cSum);

    console.log(`Account: "${acc.accountName}" (ID: ${acc.id})`);
    console.log(`  Opening Balance: ${op} (${acc.openingBalanceType})`);
    console.log(`  Total Debits in GL: ${dSum}`);
    console.log(`  Total Credits in GL: ${cSum}`);
    console.log(`  Calculated Running Balance: ${running}`);
    
    // List GL entries for this account
    const entries = await prisma.generalLedgerEntry.findMany({
      where: { companyId, accountId: acc.id }
    });
    if (entries.length > 0) {
      console.log('  GL Entries:');
      for (const e of entries) {
        console.log(`    - Date: ${e.voucherDate.toISOString().split('T')[0]}, Type: ${e.debitCreditType}, Amount: ${e.amount}, Source: ${e.sourceVoucherType} (${e.sourceBillNumber})`);
      }
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
