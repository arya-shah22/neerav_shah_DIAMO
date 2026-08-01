import { resolveHeaderAlias, normalizeHeader } from '../src/shared/constants/csv-header-map';

function runTests() {
  console.log('=== RUNNING SUITE OF TEST CASES FOR UNIVERSAL DIAMOND CSV & STOCK EXTENDED FIELDS ===\n');

  let passed = 0;
  let failed = 0;

  function assert(description: string, condition: boolean) {
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
      failed++;
    }
  }

  // TEST CASE 1: Header normalization with spaces, uppercase, and special chars
  assert('Header Normalization - RapNet "Report No."', normalizeHeader('  Report No.  ') === 'report no');
  assert('Header Normalization - VDB "Measurement Legth"', normalizeHeader('Measurement Legth') === 'measurement legth');
  assert('Header Normalization - Nivoda "H&A"', normalizeHeader('H&A') === 'ha');
  assert('Header Normalization - Mixed spaces & casing "  Table   Inclusion  "', normalizeHeader('  Table   Inclusion  ') === 'table inclusion');

  // TEST CASE 2: VDB Specific Columns
  assert('VDB Column Mapping - Measurement legth -> lengthMm', resolveHeaderAlias('Measurement legth') === 'lengthMm');
  assert('VDB Column Mapping - measurements width -> widthMm', resolveHeaderAlias('measurements width') === 'widthMm');
  assert('VDB Column Mapping - measurements depth -> depthMm', resolveHeaderAlias('measurements depth') === 'depthMm');
  assert('VDB Column Mapping - Certificate URL -> certificateUrl', resolveHeaderAlias('Certificate URL') === 'certificateUrl');
  assert('VDB Column Mapping - H&A -> heartsAndArrows', resolveHeaderAlias('H&A') === 'heartsAndArrows');
  assert('VDB Column Mapping - Eye clean -> eyeClean', resolveHeaderAlias('Eye clean') === 'eyeClean');
  assert('VDB Column Mapping - Table Open -> tableOpen', resolveHeaderAlias('Table Open') === 'tableOpen');
  assert('VDB Column Mapping - Crown Open -> crownOpen', resolveHeaderAlias('Crown Open') === 'crownOpen');
  assert('VDB Column Mapping - girdle open -> girdleOpen', resolveHeaderAlias('girdle open') === 'girdleOpen');
  assert('VDB Column Mapping - Tinge -> tinge', resolveHeaderAlias('Tinge') === 'tinge');
  assert('VDB Column Mapping - Lustre -> lustre', resolveHeaderAlias('Lustre') === 'lustre');
  assert('VDB Column Mapping - Table Inclusion -> tableInclusion', resolveHeaderAlias('Table Inclusion') === 'tableInclusion');
  assert('VDB Column Mapping - Treatment -> treatment', resolveHeaderAlias('Treatment') === 'treatment');

  // TEST CASE 3: Nivoda Specific Columns
  assert('Nivoda Column Mapping - Weburl -> webUrl', resolveHeaderAlias('Weburl') === 'webUrl');
  assert('Nivoda Column Mapping - Inscription -> inscription', resolveHeaderAlias('Inscription') === 'inscription');
  assert('Nivoda Column Mapping - COP -> origin', resolveHeaderAlias('COP') === 'origin');
  assert('Nivoda Column Mapping - Country of Origin -> origin', resolveHeaderAlias('Country of Origin') === 'origin');

  // TEST CASE 4: RapNet Specific Columns
  assert('RapNet Column Mapping - Rap Price -> rapPricePerCarat', resolveHeaderAlias('Rap Price') === 'rapPricePerCarat');
  assert('RapNet Column Mapping - Rap Discount -> rapDiscountPct', resolveHeaderAlias('Rap Discount') === 'rapDiscountPct');
  assert('RapNet Column Mapping - Crown Angle -> crownAngle', resolveHeaderAlias('Crown Angle') === 'crownAngle');
  assert('RapNet Column Mapping - Crown Height -> crownHeight', resolveHeaderAlias('Crown Height') === 'crownHeight');
  assert('RapNet Column Mapping - Pavilion Angle -> pavilionAngle', resolveHeaderAlias('Pavilion Angle') === 'pavilionAngle');
  assert('RapNet Column Mapping - Pavilion Depth -> pavilionDepth', resolveHeaderAlias('Pavilion Depth') === 'pavilionDepth');
  assert('RapNet Column Mapping - Girdle Thin -> girdleMin', resolveHeaderAlias('Girdle Thin') === 'girdleMin');
  assert('RapNet Column Mapping - Girdle Thick -> girdleMax', resolveHeaderAlias('Girdle Thick') === 'girdleMax');
  assert('RapNet Column Mapping - Culet Size -> culetSize', resolveHeaderAlias('Culet Size') === 'culetSize');
  assert('RapNet Column Mapping - Fluor Intensity -> fluorescenceIntensity', resolveHeaderAlias('Fluor Intensity') === 'fluorescenceIntensity');

  // TEST CASE 5: Custom Column Aliases & Tolerance
  assert('Custom Column Mapping - Stone ID -> stockIdNumber', resolveHeaderAlias('Stone ID') === 'stockIdNumber');
  assert('Custom Column Mapping - Asking Price -> targetSaleRate', resolveHeaderAlias('Asking Price') === 'targetSaleRate');
  assert('Custom Column Mapping - Laser Inscription -> inscription', resolveHeaderAlias('Laser Inscription') === 'inscription');
  assert('Custom Column Mapping - Brown Shade -> shade', resolveHeaderAlias('Brown Shade') === 'shade');

  console.log(`\n==================================================`);
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
