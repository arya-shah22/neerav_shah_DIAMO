import { PrismaClient } from '@prisma/client';

async function inspectPacketsAndJobs() {
  const prisma = new PrismaClient();
  const packets = await prisma.stockPacket.findMany({ where: { companyId: 1 } });
  const now = new Date();
  let slowMovingCount = 0;
  let slowMovingValue = 0;
  let totalAvailableValue = 0;

  for (const p of packets) {
    if (p.currentStatus === 'AVAILABLE') {
      const val = Number(p.caratWeight || 0) * Number(p.costPerCarat || 0);
      totalAvailableValue += val;
      const regDate = new Date(p.registrationDate || p.createdAt);
      const diffDays = Math.floor((now.getTime() - regDate.getTime()) / (1000 * 3600 * 24));
      console.log(`Packet #${p.stockIdNumber}: RegDate=${regDate.toISOString().slice(0,10)}, Age=${diffDays} days, Value=₹${val}`);
      if (diffDays > 90) {
        slowMovingCount++;
        slowMovingValue += val;
      }
    }
  }

  const jobVouchers = await prisma.jobVoucher.findMany({
    where: { companyId: 1, isDeleted: false }
  });

  console.log('\n--- STOCK & JOB SUMMARY ---');
  console.log('Total Stock Packets in DB:', packets.length);
  console.log('Total Available Stock Value: ₹', totalAvailableValue);
  console.log('Slow Moving Packets (>90 Days):', slowMovingCount, 'Value: ₹', slowMovingValue);
  console.log('Job Vouchers in DB:', jobVouchers.length);
  console.table(jobVouchers.map(j => ({ id: j.id, no: j.voucherNumber, type: j.jobType, status: j.status, amount: Number(j.totalAmount) })));

  await prisma.$disconnect();
}

inspectPacketsAndJobs().catch(console.error);
