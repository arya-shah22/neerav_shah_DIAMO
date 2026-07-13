import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.saleInvoice.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      voucherNumber: true,
      invoiceDate: true,
      totalGrossAmount: true,
      totalCgst: true,
      totalSgst: true,
      totalIgst: true,
      status: true,
    }
  });

  console.log("=== SALE INVOICES ===");
  console.table(sales.map(s => ({
    id: s.id,
    voucher: s.voucherNumber,
    date: s.invoiceDate.toISOString().split('T')[0],
    gross: Number(s.totalGrossAmount),
    cgst: Number(s.totalCgst),
    sgst: Number(s.totalSgst),
    igst: Number(s.totalIgst),
    status: s.status,
  })));

  const purchases = await prisma.purchaseInvoice.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      voucherNumber: true,
      invoiceDate: true,
      totalGrossAmount: true,
      totalCgst: true,
      totalSgst: true,
      totalIgst: true,
      status: true,
    }
  });

  console.log("=== PURCHASE INVOICES ===");
  console.table(purchases.map(p => ({
    id: p.id,
    voucher: p.voucherNumber,
    date: p.invoiceDate.toISOString().split('T')[0],
    gross: Number(p.totalGrossAmount),
    cgst: Number(p.totalCgst),
    sgst: Number(p.totalSgst),
    igst: Number(p.totalIgst),
    status: p.status,
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
