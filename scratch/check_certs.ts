import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCerts() {
  const certs = [
    "732543565", "790622910", "780640673", "783655445", "773615569", 
    "788643366", "784670721", "784670735", "784670709", "786691362", 
    "786650493", "729581054", "777624836", "724505715", "799689470"
  ];

  const matches = await prisma.stockPacket.findMany({
    where: { certificateNumber: { in: certs } },
    select: { id: true, companyId: true, stockIdNumber: true, certificateNumber: true, isDeleted: true }
  });

  console.log('Matches in DB for these Certificate Numbers:');
  console.log(matches);
}

checkCerts().finally(() => prisma.$disconnect());
