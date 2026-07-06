// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Phase 9 Cash Book FSD Test Suite
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { CashBankService } from '../src/backend/modules/cashbank/cashbank.service';
import { CashBankType, DebitCreditType, InvoiceStatus, PaymentStatus } from '@prisma/client';

async function runCashBookTests() {
  console.log('🧪 Starting Phase 9 (Cash Book) Comprehensive Test Suite...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const cashBankService = app.get(CashBankService);

  try {
    // 1. Setup Test Environment
    let company = await prisma.company.findFirst({ where: { companyCode: 'TST' } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          companyName: 'DIAMO Test Laboratory',
          companyCode: 'TST',
          panNumber: 'TEST9999AA',
          addressLine1: 'Silicon Valley Surat',
          city: 'Surat',
          pincode: '395007',
        },
      });
    }

    let fy = await prisma.financialYear.findFirst({ where: { companyId: company.id } });
    if (!fy) {
      fy = await prisma.financialYear.create({
        data: {
          companyId: company.id,
          fromDate: new Date('2026-04-01'),
          toDate: new Date('2027-03-31'),
          isActive: true,
        },
      });
    }

    let group = await prisma.accountGroup.findFirst({ where: { companyId: company.id, groupName: 'Cash Accounts' } });
    if (!group) {
      group = await prisma.accountGroup.create({
        data: { companyId: company.id, groupName: 'Cash Accounts', nature: 'ASSET' }
      });
    }

    // Create Cash Account
    let cashAccount = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Petty Cash Account' } });
    if (!cashAccount) {
      cashAccount = await prisma.account.create({
        data: {
          companyId: company.id,
          accountGroupId: group.id,
          accountName: 'Petty Cash Account',
          city: 'Surat',
          openingBalanceAmount: 5000,
          openingBalanceType: DebitCreditType.DEBIT
        }
      });
    }

    // Create Party Account
    let partyAccount = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Diamond Buyer Client' } });
    if (!partyAccount) {
      partyAccount = await prisma.account.create({
        data: {
          companyId: company.id,
          accountGroupId: group.id,
          accountName: 'Diamond Buyer Client',
          city: 'Surat',
          openingBalanceAmount: 0,
          openingBalanceType: DebitCreditType.DEBIT
        }
      });
    }

    console.log('🧹 Cleaning old Cash Book test data...');
    await prisma.generalLedgerEntry.deleteMany({ where: { companyId: company.id } });
    await prisma.cashBankVoucher.deleteMany({ where: { companyId: company.id } });
    await prisma.saleInvoice.deleteMany({ where: { companyId: company.id } });

    // ─── TEST 1: Retrieve Initial Running Balance ───
    console.log('⭐ TEST 1: Reading Initial Account Running Balance...');
    const initialBal = await cashBankService.getRunningBalance(company.id, cashAccount.id);
    if (initialBal !== 5000) {
      throw new Error(`FAIL: Expected 5000 initial balance, got ${initialBal}`);
    }
    console.log(`   ➔ Initial Balance: ₹${initialBal} — SUCCESS`);

    // ─── TEST 2: Post Cash Receipt (Incoming collection) ───
    console.log('⭐ TEST 2: Posting Cash Receipt...');
    const receiptPayload = {
      financialYearId: fy.id,
      voucherDate: new Date().toISOString(),
      transactionType: CashBankType.CASH_RECEIPT,
      partyId: partyAccount.id,
      cashBankAccountId: cashAccount.id,
      amount: 15000,
      manualVoucherNo: 'REC-001',
      narration: 'Cash received from buyer'
    };

    const receipt = await cashBankService.create(company.id, receiptPayload);
    console.log(`   ➔ Created Receipt Voucher: ${receipt.voucherNumber}`);

    // Check Running Balance increases (5,000 + 15,000 = 20,000)
    const afterReceiptBal = await cashBankService.getRunningBalance(company.id, cashAccount.id);
    if (afterReceiptBal !== 20000) {
      throw new Error(`FAIL: Expected 20,000 cash balance, got ${afterReceiptBal}`);
    }
    console.log(`   ➔ Balance after receipt: ₹${afterReceiptBal} — SUCCESS`);

    // ─── TEST 3: Post Cash Payment (Outgoing expenses) ───
    console.log('⭐ TEST 3: Posting Cash Payment...');
    const paymentPayload = {
      financialYearId: fy.id,
      voucherDate: new Date().toISOString(),
      transactionType: CashBankType.CASH_PAYMENT,
      partyId: partyAccount.id,
      cashBankAccountId: cashAccount.id,
      amount: 12000,
      manualVoucherNo: 'PAY-001',
      narration: 'Office expenses paid'
    };

    const payment = await cashBankService.create(company.id, paymentPayload);
    console.log(`   ➔ Created Payment Voucher: ${payment.voucherNumber}`);

    // Check Running Balance decreases (20,000 - 12,000 = 8,000)
    const afterPaymentBal = await cashBankService.getRunningBalance(company.id, cashAccount.id);
    if (afterPaymentBal !== 8000) {
      throw new Error(`FAIL: Expected 8,000 cash balance, got ${afterPaymentBal}`);
    }
    console.log(`   ➔ Balance after payment: ₹${afterPaymentBal} — SUCCESS`);

    // ─── TEST 4: Ledger Postings Verification ───
    console.log('⭐ TEST 4: Verifying Double Entry Ledger Rules...');
    const glEntries = await prisma.generalLedgerEntry.findMany({
      where: { companyId: company.id, sourceVoucherId: payment.id }
    });

    if (glEntries.length !== 2) {
      throw new Error(`FAIL: Expected 2 General Ledger postings, got ${glEntries.length}`);
    }

    const cashGL = glEntries.find(row => row.accountId === cashAccount.id);
    const partyGL = glEntries.find(row => row.accountId === partyAccount.id);

    if (!cashGL || cashGL.debitCreditType !== DebitCreditType.CREDIT || Number(cashGL.amount) !== 12000) {
      throw new Error('FAIL: Cash GL posting incorrect.');
    }
    if (!partyGL || partyGL.debitCreditType !== DebitCreditType.DEBIT || Number(partyGL.amount) !== 12000) {
      throw new Error('FAIL: Party GL posting incorrect.');
    }
    console.log('   ➔ Checked Balanced GL entries: SUCCESS');

    // ─── TEST 5: Deletion & Reversal ───
    console.log('⭐ TEST 5: Deleting Voucher & Reversing Postings...');
    await cashBankService.delete(payment.id, company.id);

    const afterDeleteBal = await cashBankService.getRunningBalance(company.id, cashAccount.id);
    if (afterDeleteBal !== 20000) {
      throw new Error(`FAIL: Expected balance reverted to 20,000, got ${afterDeleteBal}`);
    }
    console.log(`   ➔ Reverted Cash Balance: ₹${afterDeleteBal} — SUCCESS`);

    // ─── TEST 6: Partial Invoice Payment Tracking & History ───
    console.log('⭐ TEST 6: Verifying Partial Payments and Detailed Date-wise Allocation Tracking...');
    
    // Create dummy Sale Invoice with ₹100,000 balance
    const saleInvoice = await prisma.saleInvoice.create({
      data: {
        companyId: company.id,
        financialYearId: fy.id,
        voucherNumber: 'TST-SALE-001',
        billNumber: 'BILL-001',
        invoiceDate: new Date(),
        customerId: partyAccount.id,
        netAmount: 100000,
        jamaAmount: 0,
        outstandingAmount: 100000,
        status: InvoiceStatus.SAVED,
        paymentStatus: PaymentStatus.UNPAID
      }
    });

    // Post first partial payment of ₹30,000 today
    const partial1 = await cashBankService.create(company.id, {
      financialYearId: fy.id,
      voucherDate: new Date('2026-07-06').toISOString(),
      transactionType: CashBankType.CASH_RECEIPT,
      partyId: partyAccount.id,
      cashBankAccountId: cashAccount.id,
      amount: 30000,
      referenceBillNo: 'TST-SALE-001'
    });

    // Post second partial payment of ₹50,000 tomorrow
    const partial2 = await cashBankService.create(company.id, {
      financialYearId: fy.id,
      voucherDate: new Date('2026-07-07').toISOString(),
      transactionType: CashBankType.CASH_RECEIPT,
      partyId: partyAccount.id,
      cashBankAccountId: cashAccount.id,
      amount: 50000,
      referenceBillNo: 'TST-SALE-001'
    });

    // Check updated invoice balances (₹80,000 paid, ₹20,000 outstanding)
    const updatedSinv = await prisma.saleInvoice.findUnique({ where: { id: saleInvoice.id } });
    if (Number(updatedSinv?.jamaAmount) !== 80000 || Number(updatedSinv?.outstandingAmount) !== 20000) {
      throw new Error(`FAIL: Expected jama 80k and outstanding 20k, got ${updatedSinv?.jamaAmount} / ${updatedSinv?.outstandingAmount}`);
    }
    if (updatedSinv?.paymentStatus !== PaymentStatus.PARTIAL) {
      throw new Error(`FAIL: Expected status PARTIAL, got ${updatedSinv?.paymentStatus}`);
    }
    console.log('   ➔ Checked Invoice Payment Status & Amount Due Updates: SUCCESS');

    // Retrieve Date-wise detailed payment history
    const history = await cashBankService.getPaymentsForInvoice(company.id, 'TST-SALE-001');
    if (history.length !== 2) {
      throw new Error(`FAIL: Expected 2 payment records in history, got ${history.length}`);
    }

    console.log(`   ➔ Payment 1 [Voucher: ${partial1.voucherNumber}]: ₹${Number(history[0].amount)} received on ${new Date(history[0].voucherDate).toISOString().split('T')[0]}`);
    console.log(`   ➔ Payment 2 [Voucher: ${partial2.voucherNumber}]: ₹${Number(history[1].amount)} received on ${new Date(history[1].voucherDate).toISOString().split('T')[0]}`);
    console.log('   ➔ Checked Date-wise Payment history log tracking: SUCCESS');

    // Clean up test data
    await prisma.generalLedgerEntry.deleteMany({ where: { companyId: company.id } });
    await prisma.cashBankVoucher.deleteMany({ where: { companyId: company.id } });
    await prisma.saleInvoice.deleteMany({ where: { companyId: company.id } });
    await prisma.account.deleteMany({ where: { companyId: company.id } });

    console.log('\n🎉 ALL PHASE 9 CASH BOOK TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!');
  } catch (err: any) {
    console.error('❌ Cash Book Test Suite Failed:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runCashBookTests();
