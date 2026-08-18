// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Reference Seed Data
// Single source of truth shared by prisma/seed.ts (CI / manual seeding)
// and the runtime first-run bootstrap in src/apps/db-bootstrap.ts.
// ═══════════════════════════════════════════════════════════════

/** Default Super Admin credentials created on a brand-new database. */
export const DEFAULT_ADMIN = {
  userIdHandle: 'superadmin',
  password: 'Admin@123',
  fullName: 'Super Administrator',
  email: 'superadmin@diamo.local',
};

// ─── Indian State Codes (GST) ─────────────────────────────────
export const STATE_CODES = [
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
export const HSN_CODES = [
  { code: '71023910', description: 'NATURAL DIAMOND ( 71023910 )', gstPct: 1.5 },
  { code: '71049120', description: 'CVD ( 71049120 )', gstPct: 1.5 },
];
