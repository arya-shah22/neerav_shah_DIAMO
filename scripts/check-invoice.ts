import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const sinv = await prisma.saleInvoice.findUnique({
    where: { id: 10 }
  });
  console.log('SaleInvoice ID 10:', sinv);
  
  const pinvs = await prisma.purchaseInvoice.findMany();
  console.log('PurchaseInvoice count:', pinvs.length);
}

run().catch(console.error).finally(() => prisma.$disconnect());
