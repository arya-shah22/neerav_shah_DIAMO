import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mergeDuplicateAccounts() {
  console.log('Merging duplicate Customer/Supplier party accounts...');

  const accounts = await prisma.account.findMany({
    where: { isDeleted: false },
  });

  const nameMap = new Map<string, typeof accounts>();

  for (const acc of accounts) {
    let cleanName = acc.accountName
      .replace(/\s*\(Customer\)/i, '')
      .replace(/\s*\(Supplier\)/i, '')
      .trim();

    if (!nameMap.has(cleanName)) {
      nameMap.set(cleanName, []);
    }
    nameMap.get(cleanName)!.push(acc);
  }

  for (const [cleanName, accList] of nameMap.entries()) {
    if (accList.length > 1) {
      console.log(`Found duplicates for "${cleanName}":`, accList.map((a) => a.accountName));

      // Keep the first account (rename to cleanName)
      const primary = accList[0];
      await prisma.account.update({
        where: { id: primary.id },
        data: { accountName: cleanName },
      });

      // Point all references from other duplicate accounts to primary account
      for (let i = 1; i < accList.length; i++) {
        const dup = accList[i];

        // Update Sale Invoices
        await prisma.saleInvoice.updateMany({
          where: { customerId: dup.id },
          data: { customerId: primary.id },
        });

        // Update Purchase Invoices
        await prisma.purchaseInvoice.updateMany({
          where: { supplierId: dup.id },
          data: { supplierId: primary.id },
        });

        // Update General Ledger Entries
        await prisma.generalLedgerEntry.updateMany({
          where: { accountId: dup.id },
          data: { accountId: primary.id },
        });

        // Update Journal Voucher Lines
        await prisma.journalVoucherLine.updateMany({
          where: { accountId: dup.id },
          data: { accountId: primary.id },
        });

        // Update Outstanding Bills
        await prisma.outstandingBill.updateMany({
          where: { accountId: dup.id },
          data: { accountId: primary.id },
        });

        // Soft delete the duplicate account
        await prisma.account.update({
          where: { id: dup.id },
          data: { isDeleted: true },
        });

        console.log(`Merged ${dup.accountName} (ID: ${dup.id}) into ${cleanName} (ID: ${primary.id})`);
      }
    } else if (accList.length === 1) {
      const single = accList[0];
      if (single.accountName.includes('(Customer)') || single.accountName.includes('(Supplier)')) {
        await prisma.account.update({
          where: { id: single.id },
          data: { accountName: cleanName },
        });
        console.log(`Renamed single account ${single.accountName} -> ${cleanName}`);
      }
    }
  }

  console.log('Done merging party accounts.');
}

mergeDuplicateAccounts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
