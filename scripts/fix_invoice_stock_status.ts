// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Script to Sync Invoice Stock Statuses In-Place
// ═══════════════════════════════════════════════════════════════

import { PrismaClient, StockStatus, MovementType } from '@prisma/client';

const prisma = new PrismaClient();

async function fixInvoiceStockStatus() {
  console.log('🔄 Syncing invoice stock packet statuses in DB...');

  // 1. Fetch all stock packets
  const packets = await prisma.stockPacket.findMany({
    where: { isDeleted: false },
    include: {
      movements: true,
    },
  });

  console.log(`Analyzing ${packets.length} stock packets in DB...`);

  let updatedCount = 0;

  for (const pkt of packets) {
    // Fetch purchase movements / initial weight
    const initialMovements = pkt.movements.filter(m => m.movementType === MovementType.PURCHASE);
    const initialCarats = initialMovements.length > 0
      ? initialMovements.reduce((sum, m) => sum + Number(m.carats), 0)
      : Number(pkt.caratWeight);

    // Fetch sale items linked to this packet in saved/approved invoices
    const saleItems = await prisma.saleInvoiceItem.findMany({
      where: {
        stockPacketId: pkt.id,
        saleInvoice: { isDeleted: false, status: { in: ['SAVED', 'APPROVED'] as any[] } },
      },
    });

    const totalSoldCarats = saleItems.reduce((sum, item) => sum + Number(item.carats), 0);
    const remainingCarats = Math.max(0, initialCarats - totalSoldCarats);
    const targetStatus = remainingCarats <= 0.0001 ? StockStatus.SOLD : StockStatus.AVAILABLE;

    const needsCaratUpdate = Math.abs(Number(pkt.caratWeight) - remainingCarats) > 0.0001;
    const needsStatusUpdate = pkt.currentStatus !== targetStatus;

    if (needsCaratUpdate || needsStatusUpdate) {
      console.log(`Syncing Packet ${pkt.stockIdNumber}: Sold ${totalSoldCarats} ct, Remaining ${remainingCarats} ct, Status ${targetStatus}`);

      await prisma.stockPacket.update({
        where: { id: pkt.id },
        data: {
          caratWeight: remainingCarats,
          totalCost: remainingCarats * Number(pkt.costPerCarat || 0),
          currentStatus: targetStatus,
        },
      });

      updatedCount++;
    }
  }

  console.log(`✅ Successfully synced ${updatedCount} stock packet statuses in DB!`);
}

fixInvoiceStockStatus()
  .catch((e) => {
    console.error('Error syncing invoice stock status:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
