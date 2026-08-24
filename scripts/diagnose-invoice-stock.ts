/**
 * Read-only diagnostic for the invoice / stock defects fixed in this change set.
 *
 * It writes nothing. Run it against a live database to find records created
 * before the fix, review the output, and only then decide on a repair.
 *
 *   npm run diagnose:invoices
 *
 * Checks:
 *   1. Invoices with a taxable value but no GST at all (create() used to read
 *      gstPct from a payload field the form never sent).
 *   2. Sale returns / sale debit notes posted to Purchase A/c (create() and
 *      update() disagreed about the ledger).
 *   3. Invoices whose header net does not equal the sum of its own lines (the
 *      per-line discount was dropped from the header).
 *   4. Vouchers whose ledger debits and credits do not match.
 *   5. Stock packets with no cost-currency provenance, grouped by the currency
 *      that can be inferred from the originating purchase invoice.
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const n = (v: unknown) => Number(v ?? 0);
const money = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function heading(title: string) {
  console.log('');
  console.log('='.repeat(78));
  console.log(title);
  console.log('='.repeat(78));
}

function verdict(count: number, unit: string) {
  console.log(count === 0 ? `  clean - no ${unit} affected` : `  ${count} ${unit} affected`);
}

async function zeroGstInvoices() {
  heading('1. Invoices with a taxable value but zero GST');
  let affected = 0;

  for (const kind of ['sale', 'purchase'] as const) {
    const rows =
      kind === 'sale'
        ? await prisma.saleInvoice.findMany({
            where: { isDeleted: false },
            select: { id: true, billNumber: true, invoiceDate: true, invoiceType: true, totalGrossAmount: true, totalCgst: true, totalSgst: true, totalIgst: true },
          })
        : await prisma.purchaseInvoice.findMany({
            where: { isDeleted: false },
            select: { id: true, billNumber: true, invoiceDate: true, invoiceType: true, totalGrossAmount: true, totalCgst: true, totalSgst: true, totalIgst: true },
          });

    for (const r of rows) {
      const tax = n(r.totalCgst) + n(r.totalSgst) + n(r.totalIgst);
      if (n(r.totalGrossAmount) > 0 && tax === 0) {
        affected++;
        console.log(`  ${kind.padEnd(8)} #${r.id} ${r.billNumber} ${r.invoiceType} gross ${money(n(r.totalGrossAmount))} tax 0.00`);
      }
    }
  }
  verdict(affected, 'invoices');
}

async function misroutedReturns() {
  heading('2. Sale returns / debit notes posted to Purchase A/c');

  const purchaseAccounts = await prisma.account.findMany({
    where: { accountName: { contains: 'Purchase A/c' } },
    select: { id: true, companyId: true, accountName: true },
  });
  if (purchaseAccounts.length === 0) {
    console.log('  no Purchase A/c found - nothing to check');
    return;
  }

  const entries = await prisma.generalLedgerEntry.findMany({
    where: {
      accountId: { in: purchaseAccounts.map((a) => a.id) },
      sourceVoucherType: { in: ['SALE_RETURN', 'SALE_DEBIT_NOTE'] as any },
    },
    select: { id: true, sourceVoucherType: true, sourceVoucherId: true, sourceBillNumber: true, amount: true, voucherDate: true },
    orderBy: { id: 'asc' },
  });

  entries.forEach((e) => {
    console.log(`  GL #${e.id} ${e.sourceVoucherType} ${e.sourceBillNumber ?? ''} ${money(n(e.amount))}`);
  });
  verdict(entries.length, 'ledger entries');
}

async function headerVsLines() {
  heading('3. Header net does not equal the sum of its lines');
  let affected = 0;

  const sales = await prisma.saleInvoice.findMany({
    where: { isDeleted: false },
    select: { id: true, billNumber: true, netAmount: true, roundOff: true, items: { select: { netAmount: true } } },
  });
  const purchases = await prisma.purchaseInvoice.findMany({
    where: { isDeleted: false },
    select: { id: true, billNumber: true, netAmount: true, roundOff: true, items: { select: { netAmount: true } } },
  });

  for (const [kind, rows] of [['sale', sales], ['purchase', purchases]] as const) {
    for (const inv of rows) {
      const lineSum = inv.items.reduce((acc, i) => acc + n(i.netAmount), 0);
      // The header carries round-off and any untaxed extra charges, so only a
      // difference beyond those is a real mismatch.
      const diff = n(inv.netAmount) - n(inv.roundOff) - lineSum;
      if (Math.abs(diff) > 0.05) {
        affected++;
        console.log(
          `  ${kind.padEnd(8)} #${inv.id} ${inv.billNumber} header ${money(n(inv.netAmount))} lines ${money(lineSum)} diff ${money(diff)}`,
        );
      }
    }
  }
  verdict(affected, 'invoices');
}

async function unbalancedVouchers() {
  heading('4. Vouchers whose debits and credits do not match');

  const grouped = await prisma.generalLedgerEntry.groupBy({
    by: ['sourceVoucherType', 'sourceVoucherId', 'debitCreditType'],
    _sum: { amount: true },
  });

  const byVoucher = new Map<string, { debit: number; credit: number }>();
  for (const g of grouped) {
    const key = `${g.sourceVoucherType}#${g.sourceVoucherId}`;
    const entry = byVoucher.get(key) ?? { debit: 0, credit: 0 };
    if (g.debitCreditType === 'DEBIT') entry.debit += n(g._sum.amount);
    else entry.credit += n(g._sum.amount);
    byVoucher.set(key, entry);
  }

  let affected = 0;
  for (const [key, { debit, credit }] of byVoucher) {
    if (Math.abs(debit - credit) > 0.01) {
      affected++;
      console.log(`  ${key.padEnd(28)} debit ${money(debit)} credit ${money(credit)} diff ${money(debit - credit)}`);
    }
  }
  verdict(affected, 'vouchers');
}

async function packetsWithoutCostCurrency() {
  heading('5. Stock packets with no cost-currency provenance');

  const packets = await prisma.stockPacket.findMany({
    where: { isDeleted: false },
    select: { id: true, stockIdNumber: true, costPerCarat: true, totalCost: true, totalCostInr: true, costCurrency: true },
  });

  const legacy = packets.filter((p) => p.totalCostInr == null);
  if (legacy.length === 0) {
    verdict(0, 'packets');
    return;
  }

  const links = await prisma.purchaseInvoiceItem.findMany({
    where: { stockPacketId: { in: legacy.map((p) => p.id) } },
    select: { stockPacketId: true, purchaseInvoice: { select: { transactionCurrency: true, exchangeRate: true } } },
  });
  const inferred = new Map<number, string>();
  links.forEach((l) => {
    if (l.stockPacketId && l.purchaseInvoice) inferred.set(l.stockPacketId, l.purchaseInvoice.transactionCurrency);
  });

  const buckets: Record<string, number> = { 'inferred USD': 0, 'inferred INR': 0, 'no source (assumed INR)': 0 };
  for (const p of legacy) {
    const src = inferred.get(p.id);
    const bucket = src === 'USD' ? 'inferred USD' : src === 'INR' ? 'inferred INR' : 'no source (assumed INR)';
    buckets[bucket]++;
    if (bucket === 'no source (assumed INR)') {
      console.log(`  ${p.stockIdNumber.padEnd(20)} cost ${money(n(p.costPerCarat))}/ct total ${money(n(p.totalCost))}`);
    }
  }

  console.log('');
  Object.entries(buckets).forEach(([k, v]) => console.log(`  ${k.padEnd(26)} ${v}`));
  verdict(legacy.length, 'packets');
}

async function main() {
  console.log('DIAMO ERP - invoice & stock diagnostic (read-only, writes nothing)');
  await zeroGstInvoices();
  await misroutedReturns();
  await headerVsLines();
  await unbalancedVouchers();
  await packetsWithoutCostCurrency();
  console.log('');
  console.log('Done. Nothing was modified.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
