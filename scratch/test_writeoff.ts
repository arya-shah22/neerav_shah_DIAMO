import { PrismaService } from '../src/backend/database/prisma.service';
import { LoanService } from '../src/backend/modules/loan/loan.service';

const prisma = new PrismaService();
const loanService = new (LoanService as any)();
loanService.prisma = prisma;

async function main() {
  const loan = await prisma.loan.findFirst({
    where: { voucherNumber: 'LN-2627-000002', isDeleted: false },
    include: { party: true }
  });

  if (!loan) {
    console.error("Test loan 'LN-2627-000002' not found.");
    return;
  }

  const destAccount = await prisma.account.findFirst({
    where: {
      id: { not: loan.partyId },
      isDeleted: false
    }
  });

  if (!destAccount) {
    console.error("No destination account found.");
    return;
  }

  console.log(`Loan ID: ${loan.id}, Balance: ₹${loan.balanceRemaining}`);
  console.log(`Writing off to Account: ${destAccount.accountName}`);

  // Call the service method
  await loanService.writeOff(loan.companyId, {
    loanId: loan.id,
    amount: Number(loan.balanceRemaining),
    writeOffAccountId: destAccount.id,
    writeOffDate: new Date('2026-08-01'),
    narration: 'Programmatic bad debt write-off test execution'
  });

  // Verify
  const updatedLoan = await prisma.loan.findUnique({
    where: { id: loan.id }
  });
  console.log("Updated Status:", updatedLoan?.status);
  console.log("Updated Balance Remaining: ₹", Number(updatedLoan?.balanceRemaining));

  const glEntries = await prisma.generalLedgerEntry.findMany({
    where: {
      sourceVoucherType: 'LOAN_VOUCHER',
      sourceVoucherId: loan.id,
      narration: { contains: 'Write-Off' }
    },
    include: { account: true }
  });

  console.table(glEntries.map(e => ({
    account: e.account.accountName,
    type: e.debitCreditType,
    amount: Number(e.amount),
    narration: e.narration
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
