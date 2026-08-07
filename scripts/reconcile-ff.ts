import { PrismaClient } from '@prisma/client';

async function reconcileFF() {
  const prisma = new PrismaClient();
  const accs = await prisma.account.findMany({
    where: { companyId: 1, isDeleted: false },
    include: { accountGroup: true }
  });

  let sumCA_Op = 0, sumCA_Cl = 0;
  let sumCL_Op = 0, sumCL_Cl = 0;

  for (const acc of accs) {
    const gName = (acc.accountGroup?.groupName || '').toLowerCase();
    const nature = (acc.accountGroup?.nature || '').toUpperCase();

    const isCA = (nature === 'ASSETS' || nature === 'ASSET') && (gName.includes('current') || gName.includes('debtors') || gName.includes('stock') || gName.includes('cash') || gName.includes('bank'));
    const isCL = (nature === 'LIABILITIES' || nature === 'LIABILITY') && (gName.includes('current') || gName.includes('creditors') || gName.includes('duties') || gName.includes('suspense') || gName.includes('job worker'));

    if (!isCA && !isCL) continue;

    const gls = await (prisma as any).generalLedgerEntry.findMany({ where: { companyId: 1, accountId: acc.id } });
    let d = 0, c = 0;
    for (const g of gls) {
      const dc = g.debitCreditType || g.debitCredit;
      if (dc === 'DEBIT') d += Number(g.amount);
      if (dc === 'CREDIT') c += Number(g.amount);
    }

    const rawOp = Number(acc.openingBalanceAmount || 0);
    const op = acc.openingBalanceType === 'CREDIT' ? -rawOp : rawOp;
    const closing = op + d - c;

    if (isCA) {
      sumCA_Op += op;
      sumCA_Cl += closing;
    }
    if (isCL) {
      // Normal liability is -closing (since Credit is negative net movement)
      sumCL_Op += (-op);
      sumCL_Cl += (-closing);
    }
  }

  console.log('Opening CA:', sumCA_Op);
  console.log('Opening CL:', sumCL_Op);
  console.log('Opening WC (CA - CL):', sumCA_Op - sumCL_Op);
  console.log('---');
  console.log('Closing CA:', sumCA_Cl);
  console.log('Closing CL:', sumCL_Cl);
  console.log('Closing WC (CA - CL):', sumCA_Cl - sumCL_Cl);
  console.log('---');
  console.log('Increase in WC (Closing WC - Opening WC):', (sumCA_Cl - sumCL_Cl) - (sumCA_Op - sumCL_Op));

  await prisma.$disconnect();
}

reconcileFF().catch(console.error);
