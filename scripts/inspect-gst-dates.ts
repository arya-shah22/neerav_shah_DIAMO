import { PrismaClient } from '@prisma/client';

async function checkGstDates() {
  const prisma = new PrismaClient();
  const sales = await prisma.saleInvoice.findMany({
    take: 5,
    select: {
      id: true,
      voucherNumber: true,
      invoiceDate: true,
      status: true,
      companyId: true,
      totalGrossAmount: true,
      totalCgst: true,
      totalSgst: true,
      totalIgst: true
    }
  });

  console.log('Sample Sales Invoices:');
  for (const s of sales) {
    console.log(`ID: ${s.id}, Voucher: ${s.voucherNumber}, Date: ${s.invoiceDate?.toISOString()}, Status: ${s.status}, CoId: ${s.companyId}, Gross: ${s.totalGrossAmount}, CGST: ${s.totalCgst}`);
  }

  await prisma.$disconnect();
}

checkGstDates().catch(console.error);
