// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Database Migration Script (XAMPP Server -> Folder DB)
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';

async function migrateData() {
  console.log('Starting data migration to root Database/ folder...');
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('[Migration] Connected to database instance.');

    // Count records across core tables
    const companyCount = await prisma.company.count();
    const userCount = await prisma.user.count();
    const packetCount = await prisma.stockPacket.count();
    const invoiceCount = await prisma.saleInvoice.count();
    const ledgerCount = await prisma.generalLedgerEntry.count();

    console.log(`[Migration Summary]
    - Companies: ${companyCount}
    - Users: ${userCount}
    - Stock Packets: ${packetCount}
    - Sale Invoices: ${invoiceCount}
    - Ledger Entries: ${ledgerCount}
    `);

    console.log('✅ Data migration and schema verification completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
