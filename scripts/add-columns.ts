import { PrismaClient } from '@prisma/client';

async function main() {
  const dbUrls = [
    process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/diamo_db',
    'mysql://root:@localhost/diamo_db?socket=/tmp/mysql_diamo.sock',
  ];

  for (const url of dbUrls) {
    try {
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      await prisma.$connect();
      console.log(`Connected to ${url}`);

      try {
        await prisma.$executeRawUnsafe(
          'ALTER TABLE `qualities` ADD COLUMN `declaration_text` TEXT NULL'
        );
        console.log('✅ Added declaration_text to qualities');
      } catch (e: any) {
        console.log('declaration_text:', e.message);
      }

      try {
        await prisma.$executeRawUnsafe(
          'ALTER TABLE `qualities` ADD COLUMN `terms_conditions` TEXT NULL'
        );
        console.log('✅ Added terms_conditions to qualities');
      } catch (e: any) {
        console.log('terms_conditions:', e.message);
      }

      await prisma.$disconnect();
    } catch (err: any) {
      console.log(`Could not connect to ${url}:`, err.message);
    }
  }
}

main();
