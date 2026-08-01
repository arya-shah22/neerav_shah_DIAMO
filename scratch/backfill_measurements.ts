import { PrismaClient } from '@prisma/client';
import { syncStockMeasurements } from '../src/shared/utils/diamond-measurement';

const prisma = new PrismaClient();

async function backfillExistingMeasurements() {
  console.log('--- Starting Backfill of Diamond Measurements across ALL Companies ---');

  const packets = await prisma.stockPacket.findMany({
    select: {
      id: true,
      lengthMm: true,
      widthMm: true,
      depthMm: true,
      measurements: true,
      shape: true,
      stockIdNumber: true,
      companyId: true,
    },
  });

  console.log(`Total stock packets in DB: ${packets.length}`);
  let updatedCount = 0;

  for (const pkt of packets) {
    const synced = syncStockMeasurements({
      lengthMm: pkt.lengthMm != null ? Number(pkt.lengthMm) : null,
      widthMm: pkt.widthMm != null ? Number(pkt.widthMm) : null,
      depthMm: pkt.depthMm != null ? Number(pkt.depthMm) : null,
      measurements: pkt.measurements,
      shape: pkt.shape,
    });

    const needUpdate =
      (synced.lengthMm != null && pkt.lengthMm == null) ||
      (synced.widthMm != null && pkt.widthMm == null) ||
      (synced.depthMm != null && pkt.depthMm == null) ||
      (synced.measurements && synced.measurements !== pkt.measurements);

    if (needUpdate) {
      await prisma.stockPacket.update({
        where: { id: pkt.id },
        data: {
          lengthMm: synced.lengthMm,
          widthMm: synced.widthMm,
          depthMm: synced.depthMm,
          measurements: synced.measurements,
        },
      });
      updatedCount++;
    }
  }

  console.log(`✅ Backfill complete! Updated ${updatedCount} stock packets across all companies with synced measurement data.`);
}

backfillExistingMeasurements().finally(() => prisma.$disconnect());
