// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Script to Fix & Update Conversion Lots In-Place
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixConversionLots() {
  console.log('🔄 Fixing and updating existing conversion lots in DB...');

  const conversions = await prisma.stockConversion.findMany({
    where: { isDeleted: false },
    include: {
      sourcePacket: true,
      outputItems: true,
    },
  });

  console.log(`Found ${conversions.length} stock conversions to process.`);

  let updatedCount = 0;

  for (const conv of conversions) {
    if (!conv.sourcePacket || !conv.outputItems || conv.outputItems.length === 0) continue;

    const sourceCost = Number(conv.sourceCost || conv.sourcePacket.totalCost);
    const processingCost = Number(conv.processingCost || 0);
    const totalInputInvestment = sourceCost + processingCost;

    // Calculate valuations for proportionate cost allocation
    const itemValuations = conv.outputItems.map((item) => {
      const carats = Number(item.carats || 0);
      const rate = item.targetSaleRate != null && Number(item.targetSaleRate) > 0
        ? Number(item.targetSaleRate)
        : Number(item.costPerCarat || 0);
      return {
        id: item.id,
        outputPacketId: item.outputPacketId,
        carats,
        targetRate: rate,
        valuation: carats * rate,
      };
    });

    const totalLotValuation = itemValuations.reduce((sum, v) => sum + v.valuation, 0);

    for (const valInfo of itemValuations) {
      let allocatedCost = 0;
      if (totalLotValuation > 0) {
        allocatedCost = totalInputInvestment * (valInfo.valuation / totalLotValuation);
      } else {
        const totalOutputCarats = Number(conv.totalOutputCarats) || 1;
        allocatedCost = totalInputInvestment * (valInfo.carats / totalOutputCarats);
      }

      const allocatedCostRate = valInfo.carats > 0 ? allocatedCost / valInfo.carats : 0;
      const targetAskingRate = valInfo.targetRate;

      // 1. Update StockPacket
      await prisma.stockPacket.update({
        where: { id: valInfo.outputPacketId },
        data: {
          costPerCarat: allocatedCostRate,
          totalCost: allocatedCost,
          targetSaleRate: targetAskingRate > 0 ? targetAskingRate : null,
          sourcePacketId: conv.sourcePacketId,
          sourceTransformId: conv.id,
        },
      });

      // 2. Update StockConversionOutput item
      await prisma.stockConversionOutput.update({
        where: { id: valInfo.id },
        data: {
          costPerCarat: allocatedCostRate,
          totalCost: allocatedCost,
          targetSaleRate: targetAskingRate > 0 ? targetAskingRate : null,
        },
      });
    }

    updatedCount++;
  }

  console.log(`✅ Successfully updated ${updatedCount} conversion lots in DB!`);

  // Ensure DB packets that were generated from conversion have their target rates set
  const convertedPackets = await prisma.stockPacket.findMany({
    where: { sourcePacketId: { not: null }, isDeleted: false },
  });

  for (const pkt of convertedPackets) {
    if (pkt.targetSaleRate == null || Number(pkt.targetSaleRate) === 0) {
      // If targetSaleRate was previously stored in costPerCarat when costPerCarat was high (> ₹2000)
      if (Number(pkt.costPerCarat) > 2000) {
        const rate = Number(pkt.costPerCarat);
        await prisma.stockPacket.update({
          where: { id: pkt.id },
          data: {
            targetSaleRate: rate,
          },
        });
      }
    }
  }

  console.log('✨ All conversion lot entries have been updated in-place!');
}

fixConversionLots()
  .catch((e) => {
    console.error('Error fixing conversion lots:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
