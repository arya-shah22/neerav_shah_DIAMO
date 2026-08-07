import { PrismaClient } from '@prisma/client';

async function checkOpBals() {
  const prisma = new PrismaClient();
  const accs = await prisma.account.findMany({ where: { companyId: 1, isDeleted: false }, include: { accountGroup: true } });

  console.log('--- ALL OPENING BALANCES IN SYSTEM ---');
  let totalDrOp = 0;
  let totalCrOp = 0;

  for (const acc of accs) {
    const raw = Number(acc.openingBalanceAmount || 0);
    if (raw > 0) {
      console.log(`Account ID ${acc.id} (${acc.accountName}) [${acc.accountGroup?.groupName} - ${acc.accountGroup?.nature}]: ${acc.openingBalanceType} ₹${raw}`);
      if (acc.openingBalanceType === 'DEBIT') totalDrOp += raw;
      if (acc.openingBalanceType === 'CREDIT') totalCrOp += raw;
    }
  }

  console.log(`\nTOTAL DEBIT OPENING BALANCES: ₹${totalDrOp.toLocaleString('en-IN')}`);
  console.log(`TOTAL CREDIT OPENING BALANCES: ₹${totalCrOp.toLocaleString('en-IN')}`);
  console.log(`NET OPENING BALANCE DIFFERENCE: ₹${(totalDrOp - totalCrOp).toLocaleString('en-IN')}`);

  await prisma.$disconnect();
}

checkOpBals().catch(console.error);
