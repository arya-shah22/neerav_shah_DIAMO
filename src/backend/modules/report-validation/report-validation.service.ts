import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReportService } from '../report/report.service';

@Injectable()
export class ReportValidationService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  @Inject(ReportService)
  private readonly reportService!: ReportService;

  // 1. Run Health Checks & Reconciliation
  async runHealthChecks(companyId: number) {
    const checks: any[] = [];
    let overallStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';

    try {
      // A. Trial Balance Balance check
      const tb = await this.reportService.getTrialBalance(companyId);
      const variance = tb.variance || 0;
      const tbStatus = Math.abs(variance) < 0.01 ? 'PASS' : 'FAIL';
      if (tbStatus === 'FAIL') overallStatus = 'FAIL';
      checks.push({
        name: 'Trial Balance Equation',
        description: 'Verify total debits match total credits across all accounts.',
        status: tbStatus,
        details: `Debit: ₹${(tb.totalDebit || 0).toLocaleString('en-IN')}, Credit: ₹${(tb.totalCredit || 0).toLocaleString('en-IN')}. Variance: ₹${variance.toLocaleString('en-IN')}`
      });

      // B. Cash Ledger Control Check
      const cashAccts = await this.prisma.account.findMany({
        where: { companyId, accountGroup: { groupName: { contains: 'Cash' } }, isDeleted: false }
      });
      let cashMismatches = 0;
      let cashTotalStr = '';
      for (const cash of cashAccts) {
        const ledger: any = await this.reportService.getLedger(companyId, cash.id);
        const statements = ledger.statements || [];
        const runningSum = statements.reduce((acc: number, cur: any) => {
          return acc + (cur.debitCreditType === 'DEBIT' ? Number(cur.amount) : -Number(cur.amount));
        }, 0);
        const netExpected = Number(ledger.openingBalance || 0) + runningSum;
        const currentBalance = Number(ledger.closingBalance || 0);
        if (Math.abs(netExpected - currentBalance) > 0.05) {
          cashMismatches++;
        }
        cashTotalStr += `${cash.accountName}: Ledger ₹${currentBalance.toLocaleString('en-IN')}. `;
      }
      const cashStatus = cashMismatches === 0 ? 'PASS' : 'WARNING';
      if (cashStatus === 'WARNING' && overallStatus !== 'FAIL') overallStatus = 'WARNING';
      checks.push({
        name: 'Cash Register Audit',
        description: 'Cross-check cash ledger running sums against physical balances.',
        status: cashStatus,
        details: cashTotalStr || 'No active cash accounts found.'
      });

      // C. Outstanding receivables/payables vs party balances
      const outstandingReceivables = (await this.reportService.getOutstanding(companyId, 'RECEIVABLE')) || [];
      const outstandingPayables = (await this.reportService.getOutstanding(companyId, 'PAYABLE')) || [];
      
      const partyAccts = await this.prisma.account.findMany({
        where: {
          companyId,
          isDeleted: false,
          accountGroup: {
            OR: [
              { groupName: { contains: 'Debtors' } },
              { groupName: { contains: 'Creditors' } },
              { groupName: { contains: 'Brokers' } }
            ]
          }
        },
        include: { accountGroup: true }
      });
      
      let outstandingMismatches = 0;
      let partyCheckCount = 0;
      
      for (const party of partyAccts) {
        partyCheckCount++;
        const ledger: any = await this.reportService.getLedger(companyId, party.id);
        const ledgerBal = Number(ledger.closingBalance || 0);
        
        let outstandingTotal = 0;
        const isCreditor = party.accountGroup?.groupName.toLowerCase().includes('creditors');
        
        if (isCreditor) {
          const entry = outstandingPayables.find((e: any) => e.accountName === party.accountName);
          outstandingTotal = Number(entry?.totalOutstanding || 0);
        } else {
          const entry = outstandingReceivables.find((e: any) => e.accountName === party.accountName);
          outstandingTotal = Number(entry?.totalOutstanding || 0);
        }
        
        if (Math.abs(Math.abs(ledgerBal) - Math.abs(outstandingTotal)) > 0.05) {
          outstandingMismatches++;
        }
      }
      
      const outstandingCheckStatus = outstandingMismatches === 0 ? 'PASS' : 'WARNING';
      if (outstandingCheckStatus === 'WARNING' && overallStatus !== 'FAIL') overallStatus = 'WARNING';
      checks.push({
        name: 'Party Ledger Reconciliation',
        description: 'Verify party-wise outstanding aging matches ledger balances.',
        status: outstandingCheckStatus,
        details: `Checked ${partyCheckCount} accounts. Mismatches detected: ${outstandingMismatches}`
      });



      // E. Ledger references & missing links
      const missingVouchers = await this.prisma.generalLedgerEntry.count({
        where: { companyId, sourceVoucherId: 0 }
      });
      const missingLinksStatus = missingVouchers === 0 ? 'PASS' : 'FAIL';
      if (missingLinksStatus === 'FAIL') overallStatus = 'FAIL';
      checks.push({
        name: 'Voucher Source Reference',
        description: 'Check for general ledger postings missing valid source voucher links.',
        status: missingLinksStatus,
        details: `Postings missing voucher links: ${missingVouchers}`
      });

      // F. Negative Balances
      const allAccounts = await this.prisma.account.findMany({ where: { companyId, isDeleted: false } });
      let negativeBalCount = 0;
      for (const a of allAccounts) {
        const ledger: any = await this.reportService.getLedger(companyId, a.id);
        const bal = Number(ledger.closingBalance || 0);
        // Cash or Bank accounts should not be negative
        if (bal < 0 && (a.accountName.toLowerCase().includes('cash') || a.accountName.toLowerCase().includes('bank'))) {
          negativeBalCount++;
        }
      }
      const negativeStatus = negativeBalCount === 0 ? 'PASS' : 'WARNING';
      if (negativeStatus === 'WARNING' && overallStatus !== 'FAIL') overallStatus = 'WARNING';
      checks.push({
        name: 'Account Negative Balance',
        description: 'Checks for negative balances in cash or bank accounts.',
        status: negativeStatus,
        details: `Negative cash/bank accounts detected: ${negativeBalCount}`
      });

    } catch (e: any) {
      overallStatus = 'FAIL';
      checks.push({
        name: 'System Validation Engine',
        description: 'Real-time diagnostic run failed.',
        status: 'FAIL',
        details: e.message || 'Unknown execution error'
      });
    }

    return {
      success: true,
      status: overallStatus,
      summary: overallStatus === 'PASS' 
        ? 'All report validations and reconciliations passed successfully.'
        : `Validation warnings/failures detected: ${checks.filter(c => c.status !== 'PASS').length} failed.`,
      checks
    };
  }

  // 2. Fetch past validation history
  async getValidationHistory(companyId: number) {
    const list = await this.prisma.reportValidationLog.findMany({
      where: { companyId },
      orderBy: { validationDate: 'desc' }
    });
    return list.map(l => ({
      ...l,
      details: JSON.parse(l.detailsJson)
    }));
  }

  // 3. Generate Certificate
  async generateCertificate(companyId: number, payload: { checkType: string; status: string; summary: string; certifiedBy: string; details: any }) {
    const certNo = `CERT/${new Date().getFullYear()}/VAL-${Math.floor(100000 + Math.random() * 900000)}`;
    const record = await this.prisma.reportValidationLog.create({
      data: {
        companyId,
        checkType: payload.checkType,
        status: payload.status,
        summary: payload.summary,
        detailsJson: JSON.stringify(payload.details),
        certifiedBy: payload.certifiedBy,
        certificateNo: certNo
      }
    });
    return { success: true, certificateNo: certNo, logId: record.id };
  }
}
