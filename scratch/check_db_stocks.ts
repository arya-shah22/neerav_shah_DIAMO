import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const count = await prisma.stockPacket.count();
  const all = await prisma.stockPacket.findMany({
    select: { id: true, companyId: true, stockIdNumber: true, isDeleted: true, currentStatus: true }
  });
  console.log(`Total stockPackets in DB: ${count}`);
  console.log(all);
}

check().finally(() => prisma.$disconnect());
