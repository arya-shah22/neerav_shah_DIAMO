import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditBalanceSheet() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('No company found');
    return;
  }
  console.log(`Auditing Balance Sheet for Company: ${company.companyName} (ID: ${company.id})`);

  // 1. Fetch Accounts & Groups
  const accounts = await prisma.account.findMany({
    where: { companyId: company.id, isDeleted: false },
    include: { accountGroup: true },
  });

  console.log(`Total active accounts: ${accounts.length}`);

  // 2. Fetch General Ledger entries
  const glEntries = await prisma.generalLedgerEntry.findMany({
    where: { companyId: company.id },
  });
  console.log(`Total GL entries in DB: ${glEntries.length}`);

  // Group by account
  const accountBalances: Array<{ id: number; name: string; group: string; nature: string; debits: number; credits: number; closing: number }> = [];

  for (const acc of accounts) {
    const accEntries = glEntries.filter(e => e.accountId === acc.id);
    let debits = 0;
    let credits = 0;

    for (const e of accEntries) {
      if (e.debitCreditType === 'DEBIT') debits += Number(e.amount);
      if (e.debitCreditType === 'CREDIT') credits += Number(e.amount);
    }

    const rawOpBal = Number(acc.openingBalanceAmount || 0);
    const opBal = acc.openingBalanceType === 'CREDIT' ? -rawOpBal : rawOpBal;
    const closing = opBal + (debits - credits);

    if (debits !== 0 || credits !== 0 || Math.abs(closing) > 0.001) {
      accountBalances.push({
        id: acc.id,
        name: acc.accountName,
        group: acc.accountGroup?.groupName || 'Unassigned',
        nature: acc.accountGroup?.nature || 'Assets',
        debits,
        credits,
        closing,
      });
    }
  }

  console.log('\n--- ACTIVE ACCOUNT BALANCES ---');
  console.table(accountBalances);

  // Calculate Income / Expense for Net Profit
  const incomeAccounts = accountBalances.filter(a => a.nature === 'Income' || a.nature === 'Revenue' || a.group.toLowerCase().includes('income') || a.group.toLowerCase().includes('sales'));
  const expenseAccounts = accountBalances.filter(a => a.nature === 'Expense' || a.nature === 'Cost of Goods Sold' || a.group.toLowerCase().includes('expense') || a.group.toLowerCase().includes('purchase') || a.group.toLowerCase().includes('job'));

  const totalIncome = incomeAccounts.reduce((sum, a) => sum + (a.credits - a.debits), 0);
  const totalExpenses = expenseAccounts.reduce((sum, a) => sum + (a.debits - a.credits), 0);
  const netProfit = totalIncome - totalExpenses;

  console.log(`\nTotal Income: ₹${totalIncome.toLocaleString('en-IN')}`);
  console.log(`Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}`);
  console.log(`Net Profit: ₹${netProfit.toLocaleString('en-IN')}`);

  const isAsset = (n: string) => n.toUpperCase() === 'ASSET' || n.toUpperCase() === 'ASSETS';
  const isLiability = (n: string) => n.toUpperCase() === 'LIABILITY' || n.toUpperCase() === 'LIABILITIES';

  // Assets, Liabilities, Capital
  const assetAccounts = accountBalances.filter(a => isAsset(a.nature) && !incomeAccounts.includes(a) && !expenseAccounts.includes(a));
  const liabilityAccounts = accountBalances.filter(a => isLiability(a.nature) && !a.group.toLowerCase().includes('capital') && !a.group.toLowerCase().includes('reserve'));
  const capitalAccounts = accountBalances.filter(a => a.nature === 'Equity' || a.group.toLowerCase().includes('capital') || a.group.toLowerCase().includes('reserve'));

  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.closing, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + Math.abs(a.closing), 0);
  const totalCapital = capitalAccounts.reduce((sum, a) => sum + Math.abs(a.closing), 0) + netProfit;

  console.log('\n--- BALANCE SHEET RECONCILIATION ---');
  console.log(`Total Assets: ₹${totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`Total Liabilities: ₹${totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`Total Capital & Reserves (including Net Profit): ₹${totalCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`Total Liabilities & Capital: ₹${(totalLiabilities + totalCapital).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`Variance (Assets - (Liabilities + Capital)): ₹${Math.abs(totalAssets - (totalLiabilities + totalCapital)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

  await prisma.$disconnect();
}

auditBalanceSheet().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
