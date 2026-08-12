// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Database Seed Script
// Pre-populate reference data: State Codes, HSN Codes, Super Admin
// ═══════════════════════════════════════════════════════════════

import { PrismaClient, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { STATE_CODES, HSN_CODES } from '../src/shared/constants/seed-data';

const prisma = new PrismaClient();



async function main() {
  console.log('🔷 DIAMO ERP — Seeding database...\n');

  // ─── Seed State Codes ─────────────────────────────────────
  console.log('📍 Seeding state codes...');
  for (const state of STATE_CODES) {
    await prisma.stateCode.upsert({
      where: { stateCode: state.code },
      update: { stateName: state.name },
      create: { stateCode: state.code, stateName: state.name },
    });
  }
  console.log(`   ✅ ${STATE_CODES.length} state codes loaded`);

  // ─── Seed HSN Codes ───────────────────────────────────────
  console.log('📋 Seeding HSN codes...');
  for (const hsn of HSN_CODES) {
    await prisma.hsnCode.upsert({
      where: { hsnCode: hsn.code },
      update: { description: hsn.description, gstPct: hsn.gstPct },
      create: { hsnCode: hsn.code, description: hsn.description, gstPct: hsn.gstPct },
    });
  }
  console.log(`   ✅ ${HSN_CODES.length} HSN codes loaded`);

  // ─── Seed Super Admin ─────────────────────────────────────
  console.log('👤 Seeding Super Admin user...');
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.upsert({
    where: { userIdHandle: 'superadmin' },
    update: { passwordHash: passwordHash, status: UserStatus.ACTIVE },
    create: {
      userIdHandle: 'superadmin',
      passwordHash: passwordHash,
      fullName: 'Super Administrator',
      email: 'superadmin@diamo.local',
      isSuperAdmin: true,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('   ✅ Super Admin created (username: superadmin, password: Admin@123)');

  console.log('\n🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
