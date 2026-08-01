// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Loan Management Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CashBankService } from '../cashbank/cashbank.service';
import {
  LoanType,
  InterestType,
  CompoundingFrequency,
  LoanStatus,
  VoucherType,
  DebitCreditType,
  CashBankType
} from '@prisma/client';
import { formatVoucherNumber } from '../../utils/voucher-number-formatter';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class LoanService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  @Inject(CashBankService)
  private readonly cashBankService!: CashBankService;

  /**
   * Calculate interest details for preview/saving
   */
  calculateInterest(
    principal: number,
    rate: number,
    type: InterestType,
    frequency: CompoundingFrequency | null,
    durationMonths: number
  ) {
    const t = durationMonths / 12; // Time in years
    let totalInterest = 0;

    if (type === InterestType.SIMPLE) {
      totalInterest = (principal * rate * t) / 100;
    } else {
      // Compound Interest
      // Frequency: Monthly (12), Quarterly (4), Yearly (1)
      let n = 1;
      if (frequency === CompoundingFrequency.MONTHLY) n = 12;
      else if (frequency === CompoundingFrequency.QUARTERLY) n = 4;

      const r = rate / 100;
      const amount = principal * Math.pow(1 + r / n, n * t);
      totalInterest = amount - principal;
    }

    // Rounding off to 2 decimal places
    totalInterest = Math.round(totalInterest * 100) / 100;
    const totalRepayable = principal + totalInterest;

    return {
      totalInterest,
      totalRepayable
    };
  }

  /**
   * Helper to retrieve cash account balance
   */
  async getOnHandMoney(companyId: number): Promise<number> {
    const cashAccs = await this.prisma.account.findMany({
      where: {
        companyId,
        isDeleted: false,
        OR: [
          { accountName: { contains: 'cash' } },
          { accountGroup: { groupName: { contains: 'cash' } } }
        ]
      }
    });
    let sum = 0;
    for (const acc of cashAccs) {
      sum += await this.cashBankService.getRunningBalance(companyId, acc.id);
    }
    return sum;
  }

  /**
   * Helper to generate voucher numbers for Loan
   */
  private async generateVoucherNumber(companyId: number, financialYearId: number, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: VoucherType.LOAN_VOUCHER },
    });
    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: VoucherType.LOAN_VOUCHER,
          method: 'AUTOMATIC',
          separator: '-',
          digitLength: 6,
          includeYear: true,
          includeMonth: false,
          resetAnnually: true,
        },
      });
    }

    const sequence = await this.prisma.voucherNumberSequence.upsert({
      where: {
        companyId_financialYearId_voucherType: {
          companyId,
          financialYearId,
          voucherType: VoucherType.LOAN_VOUCHER,
        },
      },
      create: {
        companyId,
        financialYearId,
        voucherType: VoucherType.LOAN_VOUCHER,
        currentNumber: 1,
        lastGeneratedAt: new Date(),
      },
      update: {
        currentNumber: { increment: 1 },
        lastGeneratedAt: new Date(),
      },
    });

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    return formatVoucherNumber(sequence.currentNumber, config, yearSuffix, 'LN', company.companyCode, date);
  }

  async previewVoucherNumber(companyId: number, financialYearId: number, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: VoucherType.LOAN_VOUCHER },
    });
    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: VoucherType.LOAN_VOUCHER,
          method: 'AUTOMATIC',
          separator: '-',
          digitLength: 6,
          includeYear: true,
          includeMonth: false,
          resetAnnually: true,
        },
      });
    }

    const sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: VoucherType.LOAN_VOUCHER },
    });

    const nextNum = (sequence?.currentNumber || 0) + 1;

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    return formatVoucherNumber(nextNum, config, yearSuffix, 'LN', company.companyCode, date);
  }

  /**
   * List all loans
   */
  async list(companyId: number) {
    return this.prisma.loan.findMany({
      where: { companyId, isDeleted: false },
      orderBy: [
        { loanDate: 'desc' },
        { id: 'desc' }
      ],
      include: {
        party: true,
        cashBankAccount: true,
        repayments: {
          include: { cashBankAccount: true }
        }
      }
    });
  }

  /**
   * Helper to check if account is a Bank account
   */
  private async isBankAccount(accountId: number): Promise<boolean> {
    const acc = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { accountGroup: true }
    });
    if (!acc) return false;
    const name = acc.accountName.toLowerCase();
    const groupName = acc.accountGroup?.groupName?.toLowerCase() || '';
    return name.includes('bank') || groupName.includes('bank');
  }

  /**
   * Helper to generate Cash & Bank Book sequential voucher numbers
   */
  private async generateCashBankVoucherNumber(
    companyId: number,
    financialYearId: number,
    isCash: boolean,
    isReceipt: boolean
  ): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });
    if (!company || !fy) throw new BadRequestException('Company or FY not found');

    const typeLabel = isCash ? 'CASH' : 'BANK';
    const vType = isReceipt ? 
      (isCash ? VoucherType.CASH_RECEIPT : VoucherType.BANK_RECEIPT) : 
      (isCash ? VoucherType.CASH_PAYMENT : VoucherType.BANK_PAYMENT);

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, financialYearId, voucherType: vType },
    });
    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: vType,
          method: 'AUTOMATIC',
          separator: '-',
          digitLength: 6,
          includeYear: true,
          resetAnnually: true,
        },
      });
    }

    let sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: vType },
    });
    if (!sequence) {
      sequence = await this.prisma.voucherNumberSequence.create({
        data: {
          companyId,
          financialYearId,
          voucherType: vType,
          currentNumber: 0,
          lastGeneratedAt: new Date(),
        },
      });
    }

    const nextNum = sequence.currentNumber + 1;
    await this.prisma.voucherNumberSequence.update({
      where: { id: sequence.id },
      data: {
        currentNumber: nextNum,
        lastGeneratedAt: new Date(),
      },
    });

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    const seqStr = String(nextNum).padStart(config.digitLength, '0');

    return `${company.companyCode}-${yearSuffix}-${typeLabel}-${seqStr}`;
  }

  /**
   * Create a loan entry and post to General Ledger
   */
  async create(companyId: number, data: Record<string, any>) {
    const financialYearId = Number(data.financialYearId);
    const partyId = Number(data.partyId);
    const cashBankAccountId = Number(data.cashBankAccountId);
    const principalAmount = Number(data.principalAmount) || 0;
    const interestRate = Number(data.interestRate) || 0;
    const interestType = data.interestType as InterestType;
    const compoundingFrequency = data.compoundingFrequency as CompoundingFrequency | null;
    const durationMonths = Number(data.durationMonths) || 0;
    const loanDate = new Date(data.loanDate);
    const loanType = data.loanType as LoanType;
    const narration = data.narration || '';

    if (!partyId || !cashBankAccountId) {
      throw new BadRequestException('Party and Cash/Bank accounts must be selected');
    }
    if (principalAmount <= 0) {
      throw new BadRequestException('Principal amount must be greater than zero');
    }

    // Constraint: GIVEN loan principal cannot exceed on-hand cash
    if (loanType === LoanType.GIVEN) {
      const onHand = await this.getOnHandMoney(companyId);
      if (principalAmount > onHand) {
        throw new BadRequestException(`Insufficient cash on-hand (Available: ₹${onHand.toLocaleString('en-IN')})`);
      }
    }

    const { totalInterest, totalRepayable } = this.calculateInterest(
      principalAmount,
      interestRate,
      interestType,
      compoundingFrequency,
      durationMonths
    );

    const isManual = data.isManualBillNumber === true;
    const voucherNumber = isManual && data.billNumber
      ? String(data.billNumber)
      : await this.generateVoucherNumber(companyId, financialYearId, loanDate);

    // Calculate due date
    const dueDate = new Date(loanDate);
    dueDate.setMonth(dueDate.getMonth() + durationMonths);

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          companyId,
          financialYearId,
          voucherNumber,
          loanType,
          partyId,
          cashBankAccountId,
          principalAmount,
          interestRate,
          interestType,
          compoundingFrequency,
          durationMonths,
          loanDate,
          dueDate,
          status: LoanStatus.ACTIVE,
          narration,
          totalInterest,
          totalRepayable,
          amountRepaid: 0,
          balanceRemaining: totalRepayable
        }
      });

      // 3. Create entry in Cash/Bank Book
      const isGiven = loanType === LoanType.GIVEN;

      // 3. Create entry in Cash/Bank Book
      const isBank = await this.isBankAccount(cashBankAccountId);
      let cbType: CashBankType;
      if (isGiven) {
        cbType = isBank ? CashBankType.BANK_PAYMENT : CashBankType.CASH_PAYMENT;
      } else {
        cbType = isBank ? CashBankType.BANK_RECEIPT : CashBankType.CASH_RECEIPT;
      }

      const cbVoucherNo = await this.generateCashBankVoucherNumber(
        companyId,
        financialYearId,
        !isBank,
        !isGiven
      );

      await tx.cashBankVoucher.create({
        data: {
          companyId,
          financialYearId,
          transactionType: cbType,
          voucherNumber: cbVoucherNo,
          voucherDate: loanDate,
          status: 'POSTED',
          partyId,
          cashBankAccountId,
          amount: principalAmount,
          narration: `Loan Inception: ${narration}`,
          referenceBillNo: voucherNumber
        }
      });

      return loan;
    });
  }

  /**
   * Record repayment against a loan (With Dynamic Pro-Rata Interest)
   */
  async repay(companyId: number, data: Record<string, any>) {
    const loanId = Number(data.loanId);
    const amount = Number(data.amount) || 0;
    const cashBankAccountId = Number(data.cashBankAccountId);
    const paymentDate = new Date(data.paymentDate);
    const narration = data.narration || '';

    if (!loanId || !cashBankAccountId || amount <= 0) {
      throw new BadRequestException('Valid Loan, Cash/Bank Account and positive amount are required');
    }

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findFirst({
        where: { id: loanId, companyId, isDeleted: false }
      });
      if (!loan) throw new BadRequestException('Loan not found');

      // Calculate the months elapsed between paymentDate and loanDate for pro-rata interest
      const startDate = new Date(loan.loanDate);
      const endDate = new Date(paymentDate);
      const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const elapsedMonths = Math.max(0.1, (diffDays / 365) * 12);

      // Recalculate interest up to the payment date
      const { totalInterest: newInterest, totalRepayable: newRepayable } = this.calculateInterest(
        Number(loan.principalAmount),
        Number(loan.interestRate),
        loan.interestType,
        loan.compoundingFrequency,
        elapsedMonths
      );

      const nextRepaid = Number(loan.amountRepaid) + amount;
      const nextBalance = Math.max(0, newRepayable - nextRepaid);
      
      let nextStatus: LoanStatus = LoanStatus.PARTIAL;
      if (nextBalance <= 0.01) {
        nextStatus = LoanStatus.CLOSED;
      }

      // If Taken loan: we repay outward cash (Cash credited, Party debited)
      // If Given loan: they repay inward cash (Cash debited, Party credited)
      const isGiven = loan.loanType === LoanType.GIVEN;

      const repayment = await tx.loanRepayment.create({
        data: {
          loanId,
          paymentDate,
          amount,
          cashBankAccountId,
          narration
        }
      });

      await tx.loan.update({
        where: { id: loanId },
        data: {
          totalInterest: newInterest,
          totalRepayable: newRepayable,
          amountRepaid: nextRepaid,
          balanceRemaining: nextBalance,
          status: nextStatus
        }
      });



      // 3. Create entry in Cash/Bank Book
      const isBank = await this.isBankAccount(cashBankAccountId);
      let cbType: CashBankType;
      if (isGiven) {
        cbType = isBank ? CashBankType.BANK_RECEIPT : CashBankType.CASH_RECEIPT;
      } else {
        cbType = isBank ? CashBankType.BANK_PAYMENT : CashBankType.CASH_PAYMENT;
      }

      const cbVoucherNo = await this.generateCashBankVoucherNumber(
        companyId,
        loan.financialYearId,
        !isBank,
        isGiven
      );

      await tx.cashBankVoucher.create({
        data: {
          companyId,
          financialYearId: loan.financialYearId,
          transactionType: cbType,
          voucherNumber: cbVoucherNo,
          voucherDate: paymentDate,
          status: 'POSTED',
          partyId: loan.partyId,
          cashBankAccountId,
          amount,
          narration: `Loan Repayment: ${narration}`,
          referenceBillNo: loan.voucherNumber
        }
      });

      return repayment;
    });
  }

  /**
   * Record bad debt write-off / default settlement against a loan
   */
  async writeOff(companyId: number, data: Record<string, any>) {
    const loanId = Number(data.loanId);
    const amount = Number(data.amount) || 0;
    const writeOffAccountId = Number(data.writeOffAccountId);
    const writeOffDate = new Date(data.writeOffDate);
    const narration = data.narration || '';

    if (!loanId || !writeOffAccountId || amount <= 0) {
      throw new BadRequestException('Valid Loan, Write-Off Account and positive amount are required');
    }

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findFirst({
        where: { id: loanId, companyId, isDeleted: false }
      });
      if (!loan) throw new BadRequestException('Loan not found');

      // Calculate elapsed time for pro-rata interest up to writeOffDate
      const startDate = new Date(loan.loanDate);
      const endDate = new Date(writeOffDate);
      const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const elapsedMonths = Math.max(0.1, (diffDays / 365) * 12);

      // Recalculate interest up to writeOffDate
      const { totalInterest: newInterest, totalRepayable: newRepayable } = this.calculateInterest(
        Number(loan.principalAmount),
        Number(loan.interestRate),
        loan.interestType,
        loan.compoundingFrequency,
        elapsedMonths
      );

      const nextRepaid = Number(loan.amountRepaid) + amount;
      const nextBalance = Math.max(0, newRepayable - nextRepaid);
      
      let nextStatus: LoanStatus = LoanStatus.PARTIAL;
      if (nextBalance <= 0.01) {
        nextStatus = LoanStatus.CLOSED;
      }

      const isGiven = loan.loanType === LoanType.GIVEN;

      // The amount to post to General Ledger should only be the remaining principal,
      // because interest is not pre-posted to the general ledger during the loan.
      const glWriteOffAmount = Math.min(amount, Math.max(0, Number(loan.principalAmount) - Number(loan.amountRepaid)));

      // Create repayment record using writeOffAccountId for the cashBankAccountId field
      const repayment = await tx.loanRepayment.create({
        data: {
          loanId,
          paymentDate: writeOffDate,
          amount,
          cashBankAccountId: writeOffAccountId,
          narration: `[WRITE-OFF] ${narration}`
        }
      });

      await tx.loan.update({
        where: { id: loanId },
        data: {
          totalInterest: newInterest,
          totalRepayable: newRepayable,
          amountRepaid: nextRepaid,
          balanceRemaining: nextBalance,
          status: nextStatus
        }
      });

      // Post General Ledger Entries for Write-Off
      // 1. Post to Write-Off Account
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: writeOffAccountId,
          voucherDate: writeOffDate,
          debitCreditType: isGiven ? DebitCreditType.DEBIT : DebitCreditType.CREDIT,
          amount: glWriteOffAmount,
          sourceVoucherType: VoucherType.LOAN_VOUCHER,
          sourceVoucherId: loanId,
          sourceBillNumber: loan.voucherNumber,
          narration: `Write-Off against Loan ${loan.voucherNumber}: ${narration}`,
        }
      });

      // 2. Post to Party Account
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: loan.partyId,
          voucherDate: writeOffDate,
          debitCreditType: isGiven ? DebitCreditType.CREDIT : DebitCreditType.DEBIT,
          amount: glWriteOffAmount,
          sourceVoucherType: VoucherType.LOAN_VOUCHER,
          sourceVoucherId: loanId,
          sourceBillNumber: loan.voucherNumber,
          narration: `Write-Off against Loan ${loan.voucherNumber}: ${narration}`,
        }
      });

      return repayment;
    });
  }


  /**
   * Delete loan and reverse GL/CashBank entries
   */
  async delete(id: number, companyId: number) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, companyId, isDeleted: false }
    });
    if (!loan) throw new BadRequestException('Loan not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete all repayments associated with the loan
      await tx.loanRepayment.deleteMany({
        where: { loanId: id }
      });

      // 2. Delete all general ledger entries referencing this loan
      await tx.generalLedgerEntry.deleteMany({
        where: {
          companyId,
          sourceVoucherType: VoucherType.LOAN_VOUCHER,
          sourceVoucherId: id
        }
      });

      // 3. Delete any CashBankVoucher entries referencing this loan's voucher number
      await tx.cashBankVoucher.deleteMany({
        where: {
          companyId,
          referenceBillNo: loan.voucherNumber
        }
      });

      // 4. Hard delete/soft delete the loan header
      await tx.loan.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      return { success: true };
    });
  }

  /**
   * PDF Statement builder using pdfkit (Professional Edition)
   */
  async generateStatementPdf(companyId: number): Promise<Buffer> {
    const loans = await this.prisma.loan.findMany({
      where: { companyId, isDeleted: false },
      include: { party: true }
    });

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const companyName = company ? company.companyName : 'DIAMO ERP';
    const city = company ? company.city : 'Surat';
    const stateCode = company ? company.stateCode : '01';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4',
        info: {
          Title: 'Loan Accounts Statement',
          Author: 'DIAMO ERP',
        }
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      const primaryColor = '#0F172A'; // Slate 900
      const secondaryColor = '#475569'; // Slate 600
      const accentBlue = '#2563EB'; // Blue 600
      const accentOrange = '#EA580C'; // Orange 600
      const lightBorder = '#E2E8F0'; // Slate 200
      const lightBg = '#F8FAFC'; // Slate 50

      // ─── Header Section ─────────────────────────────────────
      // Left side: Company Name
      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text(companyName.toUpperCase(), 40, 40);
      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica').text(`GSTIN State Code: ${stateCode} | Address: ${city}, India`, 40, 58);

      // Right side: Document Title
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('LOAN BOOK STATEMENT', 380, 40, { align: 'right', width: 175 });
      const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica').text(`Generated: ${currentDate}`, 380, 55, { align: 'right', width: 175 });

      // Separator Line
      doc.strokeColor(lightBorder).lineWidth(1).moveTo(40, 72).lineTo(555, 72).stroke();

      // Compute statistics
      let totalGiven = 0;
      let totalGivenRepaid = 0;
      let totalGivenRemaining = 0;

      let totalTaken = 0;
      let totalTakenRepaid = 0;
      let totalTakenRemaining = 0;

      loans.forEach((l) => {
        const principal = Number(l.principalAmount);
        const repaid = Number(l.amountRepaid);
        const remaining = Number(l.balanceRemaining);

        if (l.loanType === LoanType.GIVEN) {
          totalGiven += principal;
          totalGivenRepaid += repaid;
          totalGivenRemaining += remaining;
        } else {
          totalTaken += principal;
          totalTakenRepaid += repaid;
          totalTakenRemaining += remaining;
        }
      });

      // ─── Summary Card Panels ─────────────────────────────────
      let cardY = 85;
      
      // Card 1: Loans Given (Receivables)
      doc.roundedRect(40, cardY, 245, 65, 6).fillAndStroke(lightBg, lightBorder);
      doc.fillColor(accentBlue).fontSize(9).font('Helvetica-Bold').text('LOANS GIVEN (RECEIVABLES)', 50, cardY + 10);
      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica').text('Principal Principal:', 50, cardY + 24);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(`₹ ${totalGiven.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 160, cardY + 24, { align: 'right', width: 115 });
      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica').text('Outstanding Balance:', 50, cardY + 36);
      doc.fillColor(accentBlue).fontSize(10).font('Helvetica-Bold').text(`₹ ${totalGivenRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 160, cardY + 36, { align: 'right', width: 115 });

      // Card 2: Loans Taken (Payables)
      doc.roundedRect(310, cardY, 245, 65, 6).fillAndStroke(lightBg, lightBorder);
      doc.fillColor(accentOrange).fontSize(9).font('Helvetica-Bold').text('LOANS TAKEN (PAYABLES)', 320, cardY + 10);
      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica').text('Principal Principal:', 320, cardY + 24);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(`₹ ${totalTaken.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 430, cardY + 24, { align: 'right', width: 115 });
      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica').text('Outstanding Balance:', 320, cardY + 36);
      doc.fillColor(accentOrange).fontSize(10).font('Helvetica-Bold').text(`₹ ${totalTakenRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 430, cardY + 36, { align: 'right', width: 115 });

      let currentY = 170;

      // Table draw utility helper
      const drawTable = (title: string, data: any[], colorTheme: string) => {
        if (data.length === 0) return;

        // Header Title
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(title.toUpperCase(), 40, currentY);
        currentY += 15;

        // Draw header row background bar
        doc.rect(40, currentY, 515, 20).fill(colorTheme);

        // Header column labels
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        doc.text('VOUCHER NO', 45, currentY + 6, { width: 90 });
        doc.text('PARTY ACCOUNT', 140, currentY + 6, { width: 120 });
        doc.text('PRINCIPAL', 265, currentY + 6, { width: 70, align: 'right' });
        doc.text('RATE', 340, currentY + 6, { width: 45, align: 'right' });
        doc.text('INTEREST', 390, currentY + 6, { width: 65, align: 'right' });
        doc.text('OUTSTANDING', 460, currentY + 6, { width: 90, align: 'right' });

        currentY += 20;

        // Draw data rows
        data.forEach((row, i) => {
          // Page overflow check
          if (currentY > 750) {
            doc.addPage();
            currentY = 40;
            // Draw table header again on next page
            doc.rect(40, currentY, 515, 20).fill(colorTheme);
            doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
            doc.text('VOUCHER NO', 45, currentY + 6, { width: 90 });
            doc.text('PARTY ACCOUNT', 140, currentY + 6, { width: 120 });
            doc.text('PRINCIPAL', 265, currentY + 6, { width: 70, align: 'right' });
            doc.text('RATE', 340, currentY + 6, { width: 45, align: 'right' });
            doc.text('INTEREST', 390, currentY + 6, { width: 65, align: 'right' });
            doc.text('OUTSTANDING', 460, currentY + 6, { width: 90, align: 'right' });
            currentY += 20;
          }

          // Row background tint for alternate lines
          if (i % 2 === 1) {
            doc.rect(40, currentY, 515, 18).fill('#F8FAFC');
          }

          doc.fillColor(primaryColor).fontSize(8).font('Helvetica');
          doc.text(row.voucherNumber, 45, currentY + 5, { width: 90 });
          doc.text(row.party?.accountName || '—', 140, currentY + 5, { width: 120 });
          doc.text(Number(row.principalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 265, currentY + 5, { width: 70, align: 'right' });
          doc.text(`${row.interestRate}%`, 340, currentY + 5, { width: 45, align: 'right' });
          doc.text(Number(row.totalInterest).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 390, currentY + 5, { width: 65, align: 'right' });
          
          const bal = Number(row.balanceRemaining);
          doc.fillColor(bal > 0 ? (row.loanType === 'GIVEN' ? accentBlue : accentOrange) : secondaryColor);
          doc.font('Helvetica-Bold').text(bal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 460, currentY + 5, { width: 90, align: 'right' });

          // Thin border separator
          doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(40, currentY + 18).lineTo(555, currentY + 18).stroke();
          currentY += 18;
        });

        currentY += 25;
      };

      // 1. Render Given Loans Table
      const givenList = loans.filter(l => l.loanType === LoanType.GIVEN);
      drawTable('LOANS GIVEN (Receivables Ledger)', givenList, '#1E3A8A');

      // 2. Render Taken Loans Table
      const takenList = loans.filter(l => l.loanType === LoanType.TAKEN);
      drawTable('LOANS TAKEN (Payables Ledger)', takenList, '#C2410C');

      // Footer signature space
      if (currentY > 700) {
        doc.addPage();
        currentY = 40;
      }
      doc.strokeColor(lightBorder).lineWidth(1).moveTo(40, 780).lineTo(555, 780).stroke();
      doc.fillColor(secondaryColor).fontSize(7).font('Helvetica').text('DIAMO ERP — Automated Accounting Engine. All figures are in INR.', 40, 785);
      doc.text(`Page 1 of 1`, 480, 785, { align: 'right', width: 75 });

      doc.end();
    });
  }
}
