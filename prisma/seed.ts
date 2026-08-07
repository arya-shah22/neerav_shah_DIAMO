// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Database Seed Script
// Pre-populate reference data: State Codes, HSN Codes, Super Admin
// ═══════════════════════════════════════════════════════════════

import { PrismaClient, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Indian State Codes (GST) ─────────────────────────────────
const STATE_CODES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman & Diu' },
  { code: '26', name: 'Dadra & Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

// ─── Common Diamond HSN Codes ─────────────────────────────────
const HSN_CODES = [
  { code: '71023910', description: 'Non-industrial diamonds — Sorted, uncut', gstPct: 0.25 },
  { code: '71023920', description: 'Non-industrial diamonds — Cut and polished', gstPct: 0.25 },
  { code: '71023930', description: 'Non-industrial diamonds — Others', gstPct: 0.25 },
  { code: '71042000', description: 'Synthetic or reconstructed diamonds — Worked', gstPct: 0.25 },
  { code: '71042010', description: 'Lab-grown diamonds — Cut and polished', gstPct: 0.25 },
  { code: '71031000', description: 'Precious stones — Unworked or simply sawn', gstPct: 0.25 },
  { code: '71039100', description: 'Rubies, sapphires, emeralds — Worked', gstPct: 0.25 },
  { code: '71131110', description: 'Gold jewellery — Studded with diamonds', gstPct: 3.00 },
  { code: '71131120', description: 'Gold jewellery — Plain', gstPct: 3.00 },
  { code: '71131910', description: 'Silver jewellery — Studded', gstPct: 3.00 },
];

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
