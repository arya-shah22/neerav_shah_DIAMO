import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVDB() {
  const comp = await prisma.company.findFirst({ where: { companyName: { contains: 'VDB' } } });
  console.log('Company:', comp);

  if (comp) {
    const packets = await prisma.stockPacket.findMany({
      where: { companyId: comp.id, isDeleted: false },
      select: { id: true, stockIdNumber: true, certificateNumber: true }
    });
    console.log(`Packets in ${comp.companyName}: ${packets.length}`);
    console.log(packets);
  }
}

checkVDB().finally(() => prisma.$disconnect());
