import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    where: { isDeleted: false },
    include: {
      party: true,
      repayments: true,
    }
  });

  console.log("\n=== ACTIVE/PARTIAL/CLOSED LOANS ===");
  console.table(loans.map(l => ({
    id: l.id,
    voucherNumber: l.voucherNumber,
    type: l.loanType,
    party: l.party.accountName,
    principal: Number(l.principalAmount),
    interest: Number(l.totalInterest),
    repaid: Number(l.amountRepaid),
    remaining: Number(l.balanceRemaining),
    status: l.status,
  })));

  for (const loan of loans) {
    if (loan.repayments.length > 0) {
      console.log(`\n=== Repayments/Write-offs for Loan ${loan.voucherNumber} ===`);
      console.table(loan.repayments.map(r => ({
        id: r.id,
        date: r.paymentDate.toISOString().split('T')[0],
        amount: Number(r.amount),
        narration: r.narration,
      })));
    }
  }

  const glEntries = await prisma.generalLedgerEntry.findMany({
    where: { sourceVoucherType: 'LOAN_VOUCHER' },
    include: {
      account: true,
    }
  });

  console.log("\n=== GENERAL LEDGER ENTRIES FOR LOANS ===");
  console.table(glEntries.map(e => ({
    id: e.id,
    voucherDate: e.voucherDate.toISOString().split('T')[0],
    account: e.account.accountName,
    type: e.debitCreditType,
    amount: Number(e.amount),
    narration: e.narration,
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
