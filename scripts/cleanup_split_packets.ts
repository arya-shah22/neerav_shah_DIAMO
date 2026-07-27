// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Script to Cleanup Split Packets (Option A Migration)
// ═══════════════════════════════════════════════════════════════

import { PrismaClient, StockStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupSplitPackets() {
  console.log('🔄 Cleaning up split packets and consolidating single packet lifecycles...');

  // Find all split packets (stockIdNumber contains "-S")
  const splitPackets = await prisma.stockPacket.findMany({
    where: {
      stockIdNumber: { contains: '-S' },
      sourcePacketId: { not: null },
    },
  });

  console.log(`Found ${splitPackets.length} split packets to merge back into single packets.`);

  let mergedCount = 0;

  for (const splitPkt of splitPackets) {
    if (!splitPkt.sourcePacketId) continue;

    const parentPkt = await prisma.stockPacket.findUnique({
      where: { id: splitPkt.sourcePacketId },
    });

    if (parentPkt) {
      // 1. Re-link all sale invoice items from split packet back to parent packet
      await prisma.saleInvoiceItem.updateMany({
        where: { stockPacketId: splitPkt.id },
        data: { stockPacketId: parentPkt.id },
      });

      // 2. Re-link stock movements from split packet back to parent packet
      await prisma.stockMovement.updateMany({
        where: { stockPacketId: splitPkt.id },
        data: { stockPacketId: parentPkt.id },
      });

      // 3. Update parent packet: if parent packet has remaining carats, keep AVAILABLE; if 0, mark SOLD
      const currentVaultCarats = Number(parentPkt.caratWeight || 0);
      const isAvailable = currentVaultCarats > 0.0001;

      await prisma.stockPacket.update({
        where: { id: parentPkt.id },
        data: {
          currentStatus: isAvailable ? StockStatus.AVAILABLE : StockStatus.SOLD,
        },
      });

      // 4. Delete the temporary split packet
      await prisma.stockPacket.delete({
        where: { id: splitPkt.id },
      });

      mergedCount++;
    }
  }

  console.log(`✅ Successfully consolidated ${mergedCount} split packets back into clean single packets!`);
}

cleanupSplitPackets()
  .catch((e) => {
    console.error('Error cleaning up split packets:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
