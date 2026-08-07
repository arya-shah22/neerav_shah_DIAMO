import { PrismaClient } from '@prisma/client';

async function testCF() {
  const prisma = new PrismaClient();
  const accs = await prisma.account.findMany({
    where: {
      companyId: 1,
      isDeleted: false,
      accountGroup: {
        nature: { in: ['ASSET', 'Assets'] },
        OR: [
          { groupName: { contains: 'Cash' } },
          { groupName: { contains: 'Bank' } },
          { groupName: { contains: 'cash' } },
          { groupName: { contains: 'bank' } },
        ]
      }
    },
    include: { accountGroup: true }
  });
  console.log('Cash/Bank accounts found:', accs.map(a => ({ id: a.id, name: a.accountName, group: (a as any).accountGroup?.groupName, op: a.openingBalanceAmount, type: a.openingBalanceType })));
  await prisma.$disconnect();
}

testCF().catch(console.error);
