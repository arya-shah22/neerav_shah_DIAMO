import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    where: { accountName: 'Arya Loan Test' },
    include: {
      company: true
    }
  });

  console.log(accounts.map(a => ({
    id: a.id,
    name: a.accountName,
    companyId: a.companyId,
    companyName: a.company.companyName,
    isDeleted: a.isDeleted
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
