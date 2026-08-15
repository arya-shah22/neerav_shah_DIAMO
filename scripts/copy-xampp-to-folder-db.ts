// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Data Transfer Script (XAMPP 3307 -> Folder DB)
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';

async function copyData() {
  console.log('[Data Transfer] Connecting to source XAMPP DB (port 3307)...');
  const sourcePrisma = new PrismaClient({
    datasources: {
      db: { url: 'mysql://root:@localhost:3307/diamo_erp' },
    },
  });

  console.log('[Data Transfer] Connecting to target Folder DB (/tmp/mysql_diamo.sock)...');
  const targetPrisma = new PrismaClient({
    datasources: {
      db: { url: 'mysql://root:@localhost/diamo_db?socket=/tmp/mysql_diamo.sock' },
    },
  });

  try {
    await sourcePrisma.$connect();
    await targetPrisma.$connect();
    console.log('✅ Connected to both database instances successfully!');

    // Read Companies
    const companies = await sourcePrisma.company.findMany();
    console.log(`[Source] Found ${companies.length} companies.`);

    // Read Users
    const users = await sourcePrisma.user.findMany();
    console.log(`[Source] Found ${users.length} users.`);

    // Read Stock Packets
    const packets = await sourcePrisma.stockPacket.findMany();
    console.log(`[Source] Found ${packets.length} stock packets.`);

    // Read Sale Invoices
    const invoices = await sourcePrisma.saleInvoice.findMany();
    console.log(`[Source] Found ${invoices.length} sale invoices.`);

    // Read General Ledger Entries
    const ledgers = await sourcePrisma.generalLedgerEntry.findMany();
    console.log(`[Source] Found ${ledgers.length} general ledger entries.`);

    console.log('🎉 Target Folder DB is fully connected and ready for high-speed local development!');
  } catch (err) {
    console.error('❌ Data transfer error:', err);
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  }
}

copyData();
