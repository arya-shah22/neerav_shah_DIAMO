import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bills = await prisma.outstandingBill.findMany({
    take: 10,
    orderBy: { id: 'desc' }
  });
  console.log('Last 10 Outstanding Bills:', JSON.stringify(bills, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
