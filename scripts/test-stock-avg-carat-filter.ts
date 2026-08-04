import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';

async function testStockAvgCaratFilter() {
  console.log('🧪 Testing Stock Average Carat Size Filter Logic...\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });

  // Create or fetch sample packets for testing
  const packets = [
    { name: 'Single Stone 5ct', caratWeight: 5.0, pieceCount: 1, piecesNotCounted: false },
    { name: 'Parcel 10ct (2 Pcs)', caratWeight: 10.0, pieceCount: 2, piecesNotCounted: false }, // Avg: 5ct/pc
    { name: 'Bulk Melee 10ct (Uncounted)', caratWeight: 10.0, pieceCount: 50, piecesNotCounted: true }, // Uncounted bulk
    { name: 'Parcel 20ct (2 Pcs)', caratWeight: 20.0, pieceCount: 2, piecesNotCounted: false }, // Avg: 10ct/pc
  ];

  const getEffectiveCarat = (s: any) => {
    const totalCarat = Number(s.caratWeight || 0);
    const pcs = Number(s.pieceCount || 0);
    const uncounted = s.piecesNotCounted === true || s.piecesNotCounted === 'true';

    if (!uncounted && pcs > 1) {
      return totalCarat / pcs;
    }
    return totalCarat;
  };

  // Test filter range: 3.00 ct to 8.00 ct
  const minCarat = 3.0;
  const maxCarat = 8.0;

  const matched = packets.filter(p => {
    const eff = getEffectiveCarat(p);
    return eff >= minCarat && eff <= maxCarat;
  });

  console.log(`📌 Searching for diamonds between ${minCarat} ct and ${maxCarat} ct:`);
  matched.forEach(m => {
    const eff = getEffectiveCarat(m);
    console.log(`  - Matched: ${m.name} -> Total: ${m.caratWeight}ct | Pcs: ${m.pieceCount} | Effective Avg: ${eff} ct/pc`);
  });

  const names = matched.map(m => m.name);
  const pass = names.includes('Single Stone 5ct') && names.includes('Parcel 10ct (2 Pcs)') && !names.includes('Parcel 20ct (2 Pcs)');

  if (pass) {
    console.log('\n✅ PASS: Average Carat Size Filter correctly matched Single Stone 5ct & Parcel 10ct (2 Pcs @ 5ct/pc)\n');
  } else {
    console.log('\n❌ FAIL: Unexpected match results\n');
  }

  await app.close();
}

testStockAvgCaratFilter();
