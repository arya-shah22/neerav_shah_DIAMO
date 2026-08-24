require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', target: 'ES2020', esModuleInterop: true, moduleResolution: 'node' } });
const C = require('../src/shared/utils/invoice-calc.ts');
let pass = 0, fail = 0;
const ok = (n, c, extra = '') => { if (c) { console.log('  pass:', n); pass++; } else { console.log('  FAIL:', n, extra); fail++; } };
const close = (a, b, t = 0.005) => Math.abs(a - b) <= t;

console.log('1) discount IS included in the header taxable (old bug: dropped)');
let r = C.computeInvoiceTotals([{ carats: 10, rate: 1000, discountPct: 10, gstPct: 3 }], { isSameState: true, currency: 'INR', exchangeRate: 1 });
ok('gross 10000', r.totalGrossAmount === 10000, r.totalGrossAmount);
ok('taxable 9000 (not 10000)', r.taxableTotal === 9000, r.taxableTotal);
ok('cgst 135', r.totalCgst === 135, r.totalCgst);
ok('net 9270', r.netAmount === 9270, r.netAmount);

console.log('2) header net === sum of line nets');
r = C.computeInvoiceTotals([
  { carats: 3.33, rate: 1111.11, discountPct: 7, gstPct: 3 },
  { carats: 1.17, rate: 987.65, discountPct: 0, gstPct: 3 },
  { carats: 0.55, rate: 4321.5, discountPct: 12.5, gstPct: 0.25 }],
  { isSameState: false, currency: 'INR', exchangeRate: 1, addPct: 2, lessPct: 1 });
const lineNet = C.round2(r.lines.reduce((a, l) => a + l.net, 0));
const lineTax = C.round2(r.lines.reduce((a, l) => a + l.taxable, 0));
ok('taxable == sum line taxable', close(r.taxableTotal, lineTax), `${r.taxableTotal} vs ${lineTax}`);
ok('rawNet == sum line nets', close(r.rawNet, lineNet), `${r.rawNet} vs ${lineNet}`);

console.log('3) currency-aware rounding');
const usd = C.computeInvoiceTotals([{ carats: 1, rate: 12345.49, gstPct: 0 }], { isSameState: true, currency: 'USD', exchangeRate: 83.25 });
ok('USD keeps cents', usd.netAmount === 12345.49, usd.netAmount);
ok('USD round-off ~0', close(usd.roundOff, 0), usd.roundOff);
const inr = C.computeInvoiceTotals([{ carats: 1, rate: 12345.49, gstPct: 0 }], { isSameState: true, currency: 'INR', exchangeRate: 1 });
ok('INR rounds to whole rupee', inr.netAmount === 12345, inr.netAmount);
ok('INR round-off -0.49', close(inr.roundOff, -0.49), inr.roundOff);

console.log('4) intra vs inter state');
const intra = C.computeInvoiceTotals([{ carats: 10, rate: 1000, gstPct: 3 }], { isSameState: true, currency: 'INR', exchangeRate: 1 });
const inter = C.computeInvoiceTotals([{ carats: 10, rate: 1000, gstPct: 3 }], { isSameState: false, currency: 'INR', exchangeRate: 1 });
ok('intra 150/150', intra.totalCgst === 150 && intra.totalSgst === 150 && intra.totalIgst === 0);
ok('inter 300 igst', inter.totalIgst === 300 && inter.totalCgst === 0);
ok('same tax total', intra.taxTotal === inter.taxTotal);

console.log('5) extra charges added but not taxed');
r = C.computeInvoiceTotals([{ carats: 10, rate: 1000, gstPct: 3 }], { isSameState: true, currency: 'INR', exchangeRate: 1, extraChargesTotal: 500 });
ok('taxable includes extras (10500)', r.taxableTotal === 10500, r.taxableTotal);
ok('tax on goods only (300)', r.taxTotal === 300, r.taxTotal);

console.log('6) alt amount = other currency');
ok('USD -> INR alt', C.altAmount(100, 'USD', 83.25) === 8325);
ok('INR -> USD alt', close(C.altAmount(8325, 'INR', 83.25), 100));
ok('rate 0 falls back to 1', C.altAmount(100, 'USD', 0) === 100);

console.log('7) empty/NaN inputs never produce NaN');
r = C.computeInvoiceTotals([{ carats: '', rate: null, gstPct: undefined }], { isSameState: true, currency: 'INR', exchangeRate: 1 });
ok('no NaN', Object.values(r).every(v => typeof v !== 'number' || Number.isFinite(v)));

console.log('8) GST resolved by invoice date');
const hist = [{ applyDate: '2024-01-01', gstPct: 1.5 }, { applyDate: '2026-06-01', gstPct: 3 }];
ok('old invoice -> 1.5', C.resolveGstPct(hist, new Date('2025-05-01')) === 1.5);
ok('new invoice -> 3', C.resolveGstPct(hist, new Date('2026-08-01')) === 3);
ok('pre-history -> earliest', C.resolveGstPct(hist, new Date('2020-01-01')) === 1.5);
ok('empty -> 0', C.resolveGstPct([], new Date()) === 0);

console.log(`\n${fail === 0 ? 'ALL TESTS PASSED' : 'FAILURES'} (${pass} passed, ${fail} failed)`);
process.exit(fail === 0 ? 0 : 1);
