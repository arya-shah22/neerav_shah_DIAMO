// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Script to Fix & Split Partial Stock Sales In-Place
// ═══════════════════════════════════════════════════════════════

import { PrismaClient, StockStatus, MovementType } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPartialSales() {
  console.log('🔄 Checking and fixing partial stock sales in DB...');

  // Find all approved sale invoices with items linked to packets
  const saleItems = await prisma.saleInvoiceItem.findMany({
    where: {
      stockPacketId: { not: null },
      saleInvoice: { isDeleted: false, status: { in: ['SAVED', 'APPROVED'] as any[] } },
    },
    include: {
      saleInvoice: true,
    },
  });

  console.log(`Found ${saleItems.length} sale invoice items linked to packets.`);

  let fixedCount = 0;

  for (const item of saleItems) {
    if (!item.stockPacketId) continue;
    const packet = await prisma.stockPacket.findUnique({
      where: { id: item.stockPacketId },
    });
    if (!packet) continue;

    // Check purchase movements for this packet or parent packet to see initial purchased carat weight
    const initialMovements = await prisma.stockMovement.findMany({
      where: {
        stockPacketId: packet.id,
        movementType: MovementType.PURCHASE,
      },
    });

    const initialCarats = initialMovements.length > 0
      ? initialMovements.reduce((sum, m) => sum + Number(m.carats), 0)
      : Number(packet.caratWeight);

    const soldCarats = Number(item.carats);

    // If packet status is SOLD, but initialCarats > soldCarats (partial sale that was mislabeled as full SOLD)
    if (packet.currentStatus === StockStatus.SOLD && initialCarats > (soldCarats + 0.001)) {
      console.log(`Fixing partial sale for packet ${packet.stockIdNumber}: Total initial ${initialCarats} ct, Sold ${soldCarats} ct.`);

      const remainingCarats = initialCarats - soldCarats;
      const unitCost = Number(packet.costPerCarat || 0);
      const soldCost = soldCarats * unitCost;
      const remainingCost = remainingCarats * unitCost;

      const splitSuffix = Math.floor(1000 + Math.random() * 9000);
      const splitStockId = `${packet.stockIdNumber}-S${splitSuffix}`;

      // 1. Create split sold packet for sold portion
      const soldPacket = await prisma.stockPacket.create({
        data: {
          companyId: packet.companyId,
          stockIdNumber: splitStockId,
          category: packet.category,
          qualityId: packet.qualityId,
          shape: packet.shape,
          color: packet.color,
          clarity: packet.clarity,
          cut: packet.cut,
          polish: packet.polish,
          symmetry: packet.symmetry,
          caratWeight: soldCarats,
          pieceCount: item.pieces || 1,
          costPerCarat: unitCost,
          totalCost: soldCost,
          targetSaleRate: Number(item.rate),
          currentStatus: StockStatus.SOLD,
          currentLocation: 'Sold Vault',
          sourcePacketId: packet.id,
          sourceTransformId: packet.sourceTransformId,
          registrationDate: item.saleInvoice.invoiceDate || packet.registrationDate,
        },
      });

      // 2. Link sale invoice item to sold split packet
      await prisma.saleInvoiceItem.update({
        where: { id: item.id },
        data: { stockPacketId: soldPacket.id },
      });

      // 3. Revert original packet to AVAILABLE with remaining carats
      await prisma.stockPacket.update({
        where: { id: packet.id },
        data: {
          caratWeight: remainingCarats,
          totalCost: remainingCost,
          currentStatus: StockStatus.AVAILABLE,
          currentLocation: 'Central Vault',
        },
      });

      // 4. Update movements
      await prisma.stockMovement.create({
        data: {
          stockPacketId: soldPacket.id,
          movementDate: item.saleInvoice.invoiceDate,
          movementType: MovementType.SALES,
          previousStatus: StockStatus.AVAILABLE,
          newStatus: StockStatus.SOLD,
          carats: soldCarats,
          pieces: item.pieces || 1,
          sourceVoucherType: 'SALE_INVOICE',
          sourceVoucherId: item.saleInvoiceId,
          remarks: `Partial sale split from ${packet.stockIdNumber} ref: ${item.saleInvoice.billNumber}`,
        },
      });

      fixedCount++;
    }
  }

  console.log(`✅ Successfully fixed and split ${fixedCount} partial stock sales in DB!`);
}

fixPartialSales()
  .catch((e) => {
    console.error('Error fixing partial sales:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
