// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Automatic Legacy Data Migration (Startup Hook)
// Moves legacy purchase records from sale_invoices to purchase_invoices
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

export async function migrateLegacyPurchaseInvoices(prisma: PrismaClient): Promise<void> {
  try {
    const oldPurchases = await prisma.saleInvoice.findMany({
      where: {
        invoiceType: { in: ['PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PURCHASE_DEBIT_NOTE'] },
      },
      include: { items: true },
    });

    if (oldPurchases.length === 0) return;

    console.log(`[DataMigration] Migrating ${oldPurchases.length} legacy purchase invoice records...`);

    for (const inv of oldPurchases) {
      await prisma.$transaction(async (tx) => {
        await tx.purchaseInvoice.create({
          data: {
            companyId: inv.companyId,
            financialYearId: inv.financialYearId,
            invoiceType: inv.invoiceType,
            voucherNumber: inv.voucherNumber,
            billNumber: inv.billNumber,
            invoiceDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            status: inv.status,
            paymentStatus: inv.paymentStatus,
            supplierId: inv.customerId,
            supplierGstin: inv.customerGstin,
            supplierStateCode: inv.customerStateCode,
            placeOfSupply: inv.placeOfSupply,
            brokerId: inv.brokerId,
            brokeragePct: inv.brokeragePct,
            brokerageAmount: inv.brokerageAmount,
            creditDays: inv.creditDays,
            totalCarats: inv.totalCarats,
            totalPieces: inv.totalPieces,
            totalGrossAmount: inv.totalGrossAmount,
            totalDiscount: inv.totalDiscount,
            totalCgst: inv.totalCgst,
            totalSgst: inv.totalSgst,
            totalIgst: inv.totalIgst,
            totalCess: inv.totalCess,
            roundOff: inv.roundOff,
            netAmount: inv.netAmount,
            jamaAmount: inv.jamaAmount,
            outstandingAmount: inv.outstandingAmount,
            referenceInvoiceId: inv.referenceInvoiceId,
            referenceBillNumber: inv.referenceBillNumber,
            narration: inv.narration,
            createdBy: inv.createdBy,
            createdAt: inv.createdAt,
            updatedBy: inv.updatedBy,
            updatedAt: inv.updatedAt,
            isDeleted: inv.isDeleted,
            deletedBy: inv.deletedBy,
            deletedAt: inv.deletedAt,
            version: inv.version,
            items: {
              create: inv.items.map((it) => ({
                rowNumber: it.rowNumber,
                qualityId: it.qualityId,
                hsnNumber: it.hsnNumber,
                carats: it.carats,
                pieces: it.pieces,
                rate: it.rate,
                lessPct: it.lessPct,
                termsRate: it.termsRate,
                grossAmount: it.grossAmount,
                gstPct: it.gstPct,
                cgstAmount: it.cgstAmount,
                sgstAmount: it.sgstAmount,
                igstAmount: it.igstAmount,
                cessPct: it.cessPct,
                cessAmount: it.cessAmount,
                netAmount: it.netAmount,
                stockPacketId: it.stockPacketId,
              })),
            },
          },
        });

        await tx.saleInvoiceItem.deleteMany({ where: { saleInvoiceId: inv.id } });
        await tx.saleInvoice.delete({ where: { id: inv.id } });
      });
    }

    console.log(`[DataMigration] Successfully migrated legacy purchase records.`);
  } catch (error) {
    console.error('[DataMigration] Error migrating purchase invoices:', error);
  }
}
