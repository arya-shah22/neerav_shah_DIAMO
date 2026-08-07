// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Full Software Verification Test Script
// Tests ALL backend modules to verify no functionality is broken
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { DashboardService } from '../src/backend/modules/dashboard/dashboard.service';
import { InvoiceService } from '../src/backend/modules/invoice/invoice.service';
import { CashBankService } from '../src/backend/modules/cashbank/cashbank.service';
import { JournalService } from '../src/backend/modules/journal/journal.service';
import { StockService } from '../src/backend/modules/stock/stock.service';
import { ChallanService } from '../src/backend/modules/challan/challan.service';
import { JobService } from '../src/backend/modules/job/job.service';
import { ReportService } from '../src/backend/modules/report/report.service';
import { AccountService } from '../src/backend/modules/account/account.service';
import { AccountGroupService } from '../src/backend/modules/account-group/account-group.service';
import { CompanyService } from '../src/backend/modules/company/company.service';
import { FinancialYearService } from '../src/backend/modules/financial-year/fy.service';
import { AuthService } from '../src/backend/modules/auth/auth.service';
import { QualityService } from '../src/backend/modules/quality/quality.service';
import { BrokerService } from '../src/backend/modules/broker/broker.service';
import { LoanService } from '../src/backend/modules/loan/loan.service';

let COMPANY_ID = 1;
let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    failed++;
    const msg = err?.message || String(err);
    failures.push(`${name}: ${msg}`);
    console.log(`  ❌ ${name} — ${msg}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  DIAMO ERP — Full Software Verification');
  console.log('═══════════════════════════════════════════════════\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  const dashboardService = app.get(DashboardService);
  const invoiceService = app.get(InvoiceService);
  const cashBankService = app.get(CashBankService);
  const journalService = app.get(JournalService);
  const stockService = app.get(StockService);
  const challanService = app.get(ChallanService);
  const jobService = app.get(JobService);
  const reportService = app.get(ReportService);
  const accountService = app.get(AccountService);
  const accountGroupService = app.get(AccountGroupService);
  const companyService = app.get(CompanyService);
  const fyService = app.get(FinancialYearService);
  const authService = app.get(AuthService);
  const qualityService = app.get(QualityService);
  const brokerService = app.get(BrokerService);
  const loanService = app.get(LoanService);

  // ─── 1. COMPANY & FINANCIAL YEAR ──────────────────────────
  console.log('\n📦 Company & Financial Year');
  let companies = await companyService.list();
  if (!companies || companies.length === 0) {
    await companyService.create({
      companyName: 'DIAMO Test Enterprise',
      companyCode: 'TST',
      stateCode: '24',
      currency: 'INR',
    });
    companies = await companyService.list();
  }
  const testCompany = companies[0];
  COMPANY_ID = testCompany.id;

  let fys = await fyService.list(testCompany.id);
  if (!fys || fys.length === 0) {
    await fyService.create(testCompany.id, {
      fyName: '2026-2027',
      fromDate: '2026-04-01',
      toDate: '2027-03-31',
      isCurrentFY: true,
    });
    fys = await fyService.list(testCompany.id);
  }

  await test('List companies', async () => {
    const list = await companyService.list();
    if (!Array.isArray(list) || list.length === 0) throw new Error('No companies found');
  });
  await test('List financial years', async () => {
    const fys = await fyService.list(testCompany.id);
    if (!Array.isArray(fys) || fys.length === 0) throw new Error('No financial years found');
  });

  // ─── 2. AUTH ──────────────────────────────────────────────
  console.log('\n🔐 Authentication');
  await test('Auth: validate session (invalid token → error)', async () => {
    try {
      await authService.validateSession('invalid-token-12345');
      throw new Error('Should have thrown UnauthorizedException');
    } catch (err: any) {
      if (err.message === 'Should have thrown UnauthorizedException') throw err;
      // Expected: UnauthorizedException
    }
  });

  // ─── 3. ACCOUNTS ──────────────────────────────────────────
  console.log('\n📒 Accounts & Groups');
  await test('List account groups', async () => {
    const groups = await accountGroupService.list(COMPANY_ID);
    if (!Array.isArray(groups) || groups.length === 0) throw new Error('No account groups found');
  });
  await test('List accounts', async () => {
    const accounts = await accountService.list(COMPANY_ID);
    if (!Array.isArray(accounts) || accounts.length === 0) throw new Error('No accounts found');
  });

  // ─── 4. QUALITY ───────────────────────────────────────────
  console.log('\n💎 Quality Master');
  await test('List qualities', async () => {
    const qualities = await qualityService.list(COMPANY_ID);
    if (!Array.isArray(qualities)) throw new Error('Quality list not an array');
  });

  // ─── 5. BROKER ────────────────────────────────────────────
  console.log('\n🤝 Broker Master');
  await test('List brokers', async () => {
    const brokers = await brokerService.list(COMPANY_ID);
    if (!Array.isArray(brokers)) throw new Error('Broker list not an array');
  });

  // ─── 6. STOCK ─────────────────────────────────────────────
  console.log('\n📦 Stock Management');
  await test('List stock packets', async () => {
    const packets = await stockService.list(COMPANY_ID);
    if (!Array.isArray(packets)) throw new Error('Stock list not an array');
  });
  await test('List stock with filter (AVAILABLE)', async () => {
    const packets = await stockService.list(COMPANY_ID, { status: 'AVAILABLE' as any });
    if (!Array.isArray(packets)) throw new Error('Filtered stock not an array');
  });

  // ─── 7. SALE INVOICES ─────────────────────────────────────
  console.log('\n🧾 Sale Invoices');
  await test('List sale invoices', async () => {
    const invoices = await invoiceService.list(COMPANY_ID, 'SALE_INVOICE' as any);
    if (!Array.isArray(invoices)) throw new Error('Sale invoice list not an array');
  });
  await test('List sale returns', async () => {
    const invoices = await invoiceService.list(COMPANY_ID, 'SALE_RETURN' as any);
    if (!Array.isArray(invoices)) throw new Error('Sale return list not an array');
  });

  // ─── 8. PURCHASE INVOICES ─────────────────────────────────
  console.log('\n🛒 Purchase Invoices');
  await test('List purchase invoices', async () => {
    const invoices = await invoiceService.list(COMPANY_ID, 'PURCHASE_INVOICE' as any);
    if (!Array.isArray(invoices)) throw new Error('Purchase invoice list not an array');
  });
  await test('List purchase returns', async () => {
    const invoices = await invoiceService.list(COMPANY_ID, 'PURCHASE_RETURN' as any);
    if (!Array.isArray(invoices)) throw new Error('Purchase return list not an array');
  });

  // ─── 9. CASH & BANK VOUCHERS ──────────────────────────────
  console.log('\n💰 Cash & Bank');
  await test('List cash/bank vouchers', async () => {
    const vouchers = await cashBankService.list(COMPANY_ID);
    if (!Array.isArray(vouchers)) throw new Error('Cash/bank voucher list not an array');
  });

  // ─── 10. JOURNAL VOUCHERS ─────────────────────────────────
  console.log('\n📋 Journal Vouchers');
  await test('List journal vouchers', async () => {
    const vouchers = await journalService.list(COMPANY_ID);
    if (!Array.isArray(vouchers)) throw new Error('Journal list not an array');
  });

  // ─── 11. CHALLAN ──────────────────────────────────────────
  console.log('\n📄 Challans');
  await test('List challans', async () => {
    const challans = await challanService.list(COMPANY_ID, {});
    if (!Array.isArray(challans)) throw new Error('Challan list not an array');
  });

  // ─── 12. JOB WORK ────────────────────────────────────────
  console.log('\n🔧 Job Work');
  await test('List job vouchers (INCOME)', async () => {
    const jobs = await jobService.list(COMPANY_ID, 'JOB_INCOME' as any);
    if (!Array.isArray(jobs)) throw new Error('Job income list not an array');
  });
  await test('List job vouchers (EXPENSE)', async () => {
    const jobs = await jobService.list(COMPANY_ID, 'JOB_EXPENSE' as any);
    if (!Array.isArray(jobs)) throw new Error('Job expense list not an array');
  });

  // ─── 13. LOANS ────────────────────────────────────────────
  console.log('\n🏦 Loans');
  await test('List loans', async () => {
    const loans = await loanService.list(COMPANY_ID);
    if (!Array.isArray(loans)) throw new Error('Loan list not an array');
  });

  // ─── 14. DASHBOARD ────────────────────────────────────────
  console.log('\n📊 Dashboard');
  await test('Dashboard telemetry', async () => {
    const data = await dashboardService.getDashboardTelemetry(COMPANY_ID);
    if (!data || !data.receivablesInr) throw new Error('Dashboard telemetry missing receivables data');
    if (typeof data.receivablesInr.total !== 'number') throw new Error('Receivables total not a number');
    if (typeof data.stock.totalCarats !== 'number') throw new Error('Stock carats not a number');
  });

  // ─── 15. REPORTS ──────────────────────────────────────────
  console.log('\n📈 Reports — Core Financial');

  // Get first account for ledger test
  const accounts = await accountService.list(COMPANY_ID);
  const firstAccountId = accounts.length > 0 ? accounts[0].id : 1;

  await test('Report: Ledger', async () => {
    const result = await reportService.getLedger(COMPANY_ID, firstAccountId);
    if (!result) throw new Error('Ledger result is null');
    // getLedger returns an array when given single accountId, or object with statements
    const ledger = Array.isArray(result) ? result : [result];
    if (ledger.length === 0) throw new Error('Ledger returned empty');
  });
  await test('Report: Trial Balance', async () => {
    const result = await reportService.getTrialBalance(COMPANY_ID);
    if (!result || !Array.isArray(result.groups)) throw new Error('Trial Balance groups not an array');
  });
  await test('Report: Profit & Loss', async () => {
    const result = await reportService.getProfitLoss(COMPANY_ID);
    if (!result) throw new Error('P&L result is null');
  });
  await test('Report: Balance Sheet', async () => {
    const result = await reportService.getBalanceSheet(COMPANY_ID);
    if (!result) throw new Error('Balance Sheet result is null');
  });
  await test('Report: Outstanding Receivable', async () => {
    const result = await reportService.getOutstanding(COMPANY_ID, 'RECEIVABLE');
    if (!Array.isArray(result)) throw new Error('Outstanding receivable not an array');
  });
  await test('Report: Outstanding Payable', async () => {
    const result = await reportService.getOutstanding(COMPANY_ID, 'PAYABLE');
    if (!Array.isArray(result)) throw new Error('Outstanding payable not an array');
  });
  await test('Report: Stock Report', async () => {
    const result = await reportService.getStockReport(COMPANY_ID);
    if (!result) throw new Error('Stock report result is null');
  });
  await test('Report: Day Book', async () => {
    const today = new Date().toISOString().split('T')[0];
    const result = await reportService.getDayBookSummary(COMPANY_ID, today);
    if (!result) throw new Error('Day Book result is null');
  });

  console.log('\n📈 Reports — GST');
  await test('Report: GST Dashboard', async () => {
    const result = await reportService.getGstDashboard(COMPANY_ID);
    if (!result) throw new Error('GST Dashboard result is null');
  });
  await test('Report: GSTR-1', async () => {
    const result = await reportService.getGstr1Report(COMPANY_ID);
    if (!result) throw new Error('GSTR-1 result is null');
  });
  await test('Report: GSTR-3B Summary', async () => {
    const result = await reportService.getGstr3bSummary(COMPANY_ID);
    if (!result) throw new Error('GSTR-3B result is null');
  });
  await test('Report: GST Registers', async () => {
    const result = await reportService.getGstRegisters(COMPANY_ID);
    if (!result) throw new Error('GST Registers result is null');
  });

  console.log('\n📈 Reports — TDS/TCS');
  await test('Report: TDS Register', async () => {
    const result = await reportService.getTdsRegister(COMPANY_ID);
    if (!result) throw new Error('TDS Register result is null');
  });
  await test('Report: TCS Register', async () => {
    const result = await reportService.getTcsRegister(COMPANY_ID);
    if (!result) throw new Error('TCS Register result is null');
  });
  await test('Report: TDS/TCS Dashboard', async () => {
    const result = await reportService.getTdsTcsDashboard(COMPANY_ID);
    if (!result) throw new Error('TDS/TCS Dashboard result is null');
  });

  console.log('\n📈 Reports — MIS & Advanced');
  await test('Report: MIS Dashboard', async () => {
    const result = await reportService.getMisDashboard(COMPANY_ID);
    if (!result) throw new Error('MIS Dashboard result is null');
  });
  await test('Report: MIS Stock/Job Analytics', async () => {
    const result = await reportService.getMisStockJobAnalytics(COMPANY_ID);
    if (!result) throw new Error('MIS Stock/Job Analytics result is null');
  });
  await test('Report: Financial Ratios', async () => {
    const result = await reportService.getMisFinancialRatios(COMPANY_ID);
    if (!result) throw new Error('Financial Ratios result is null');
  });
  await test('Report: Cash Flow', async () => {
    const result = await reportService.getCashFlow(COMPANY_ID);
    if (!result) throw new Error('Cash Flow result is null');
  });
  await test('Report: Fund Flow', async () => {
    const result = await reportService.getFundFlow(COMPANY_ID);
    if (!result) throw new Error('Fund Flow result is null');
  });

  // ─── SUMMARY ──────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  📊 RESULT: ${passed} PASSED | ${failed} FAILED out of ${passed + failed} TESTS`);
  console.log('═══════════════════════════════════════════════════');

  if (failures.length > 0) {
    console.log('\n❌ FAILURES:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }

  console.log('');
  await app.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
