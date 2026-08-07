// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — TDS & TCS Report Sub-Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TdsTcsReportService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async getTdsRegister(companyId: number, startDate?: string, endDate?: string) {
    const whereClause: any = {
      companyId,
      isDeleted: false,
    };

    if (startDate || endDate) {
      whereClause.invoiceDate = {};
      if (startDate) whereClause.invoiceDate.gte = new Date(startDate);
      if (endDate) whereClause.invoiceDate.lte = new Date(endDate);
    }

    const invoices = await (this.prisma as any).purchaseInvoice.findMany({
      where: whereClause,
      include: { supplier: true },
      orderBy: { invoiceDate: 'asc' },
    });

    return invoices.map((inv: any) => {
      const taxable = Number(inv.totalGrossAmount || inv.totalTaxableValue || 0);
      const tdsRate = Number(inv.tdsRate || inv.tdsPct || 0.1);
      const tdsAmt = Number(inv.totalTds || 0);
      const panVal = inv.supplier?.panNumber || inv.supplier?.pan || '—';

      return {
        id: inv.id,
        voucherNumber: inv.voucherNumber || inv.billNumber || '—',
        billNumber: inv.billNumber || inv.voucherNumber || '—',
        date: inv.invoiceDate,
        invoiceDate: inv.invoiceDate,
        partyName: inv.supplier?.accountName || 'Vendor',
        supplierName: inv.supplier?.accountName || 'Vendor',
        pan: panVal,
        panNumber: panVal,
        tdsSection: inv.tdsSection || '194Q',
        tdsPct: tdsRate,
        tdsRate: tdsRate,
        taxableValue: taxable,
        deductibleValue: taxable,
        tdsDeducted: tdsAmt,
        tdsAmount: tdsAmt,
        netAmount: Number(inv.netAmount || 0),
        netPayment: Number(inv.netAmount || 0),
      };
    });
  }

  async getTcsRegister(companyId: number, startDate?: string, endDate?: string) {
    const whereClause: any = {
      companyId,
      isDeleted: false,
    };

    if (startDate || endDate) {
      whereClause.invoiceDate = {};
      if (startDate) whereClause.invoiceDate.gte = new Date(startDate);
      if (endDate) whereClause.invoiceDate.lte = new Date(endDate);
    }

    const invoices = await (this.prisma as any).saleInvoice.findMany({
      where: whereClause,
      include: { customer: true },
      orderBy: { invoiceDate: 'asc' },
    });

    return invoices.map((inv: any) => {
      const taxable = Number(inv.totalGrossAmount || inv.totalTaxableValue || 0);
      const tcsRate = Number(inv.tcsRate || inv.tcsPct || 0.1);
      const tcsAmt = Number(inv.totalTcs || 0);
      const panVal = inv.customer?.panNumber || inv.customer?.pan || '—';

      return {
        id: inv.id,
        voucherNumber: inv.voucherNumber || inv.billNumber || '—',
        billNumber: inv.billNumber || inv.voucherNumber || '—',
        date: inv.invoiceDate,
        invoiceDate: inv.invoiceDate,
        partyName: inv.customer?.accountName || 'Customer',
        customerName: inv.customer?.accountName || 'Customer',
        pan: panVal,
        panNumber: panVal,
        tcsSection: inv.tcsSection || '20C(1H)',
        tcsPct: tcsRate,
        tcsRate: tcsRate,
        taxableValue: taxable,
        tcsCollected: tcsAmt,
        tcsAmount: tcsAmt,
        netAmount: Number(inv.netAmount || 0),
        invoiceTotal: Number(inv.netAmount || 0),
      };
    });
  }

  async getTdsTcsDashboard(companyId: number, startDate?: string, endDate?: string) {
    const tdsList = await this.getTdsRegister(companyId, startDate, endDate);
    const tcsList = await this.getTcsRegister(companyId, startDate, endDate);

    const totalTdsDeducted = tdsList.reduce((s: number, r: any) => s + r.tdsDeducted, 0);
    const totalTdsTaxable = tdsList.reduce((s: number, r: any) => s + r.taxableValue, 0);
    const totalTcsCollected = tcsList.reduce((s: number, r: any) => s + r.tcsCollected, 0);
    const totalTcsTaxable = tcsList.reduce((s: number, r: any) => s + r.taxableValue, 0);

    // Group by section
    const tdsBySection: Record<string, { section: string; count: number; taxable: number; tds: number }> = {};
    for (const r of tdsList) {
      const sec = r.tdsSection || '194Q';
      if (!tdsBySection[sec]) tdsBySection[sec] = { section: sec, count: 0, taxable: 0, tds: 0 };
      tdsBySection[sec].count++;
      tdsBySection[sec].taxable += r.taxableValue;
      tdsBySection[sec].tds += r.tdsDeducted;
    }

    const tcsBySection: Record<string, { section: string; count: number; taxable: number; tcs: number }> = {};
    for (const r of tcsList) {
      const sec = r.tcsSection || '20C(1H)';
      if (!tcsBySection[sec]) tcsBySection[sec] = { section: sec, count: 0, taxable: 0, tcs: 0 };
      tcsBySection[sec].count++;
      tcsBySection[sec].taxable += r.taxableValue;
      tcsBySection[sec].tcs += r.tcsCollected;
    }

    const tdsSections = Object.values(tdsBySection).map((s) => ({
      sectionCode: s.section,
      transactionCount: s.count,
      totalTaxableValue: Math.round(s.taxable * 100) / 100,
      tdsAmount: Math.round(s.tds * 100) / 100,
    }));

    const tcsSections = Object.values(tcsBySection).map((s) => ({
      sectionCode: s.section,
      transactionCount: s.count,
      totalTaxableValue: Math.round(s.taxable * 100) / 100,
      tcsAmount: Math.round(s.tcs * 100) / 100,
    }));

    const summary = {
      totalTdsDeducted: Math.round(totalTdsDeducted * 100) / 100,
      totalTdsTaxableValue: Math.round(totalTdsTaxable * 100) / 100,
      tdsTransactionCount: tdsList.length,
      totalTcsCollected: Math.round(totalTcsCollected * 100) / 100,
      totalTcsTaxableValue: Math.round(totalTcsTaxable * 100) / 100,
      tcsTransactionCount: tcsList.length,
    };

    return {
      summary,
      tdsSections,
      tcsSections,
      tdsSummary: {
        totalDeducted: summary.totalTdsDeducted,
        totalTaxable: summary.totalTdsTaxableValue,
        count: tdsList.length,
        bySection: Object.values(tdsBySection),
      },
      tcsSummary: {
        totalCollected: summary.totalTcsCollected,
        totalTaxable: summary.totalTcsTaxableValue,
        count: tcsList.length,
        bySection: Object.values(tcsBySection),
      },
    };
  }

  async getTdsPartywise(companyId: number, startDate?: string, endDate?: string) {
    const tdsList = await this.getTdsRegister(companyId, startDate, endDate);
    const partyMap: Record<string, { partyName: string; pan: string; sections: Set<string>; billCount: number; totalTaxableValue: number; tdsDeducted: number }> = {};

    for (const inv of tdsList) {
      const pid = inv.supplierName;
      if (!partyMap[pid]) {
        partyMap[pid] = {
          partyName: inv.supplierName,
          pan: inv.pan,
          sections: new Set(),
          billCount: 0,
          totalTaxableValue: 0,
          tdsDeducted: 0,
        };
      }
      partyMap[pid].billCount++;
      partyMap[pid].totalTaxableValue += inv.taxableValue;
      partyMap[pid].tdsDeducted += inv.tdsDeducted;
      if (inv.tdsSection) partyMap[pid].sections.add(inv.tdsSection);
    }

    return Object.values(partyMap).map((p) => ({
      partyName: p.partyName,
      pan: p.pan,
      tdsSection: Array.from(p.sections).join(', ') || '—',
      billCount: p.billCount,
      totalTaxableValue: Math.round(p.totalTaxableValue * 100) / 100,
      tdsDeducted: Math.round(p.tdsDeducted * 100) / 100,
    })).sort((a, b) => b.tdsDeducted - a.tdsDeducted);
  }

  async getTcsPartywise(companyId: number, startDate?: string, endDate?: string) {
    const tcsList = await this.getTcsRegister(companyId, startDate, endDate);
    const partyMap: Record<string, { partyName: string; pan: string; sections: Set<string>; billCount: number; totalTaxableValue: number; tcsCollected: number }> = {};

    for (const inv of tcsList) {
      const pid = inv.customerName;
      if (!partyMap[pid]) {
        partyMap[pid] = {
          partyName: inv.customerName,
          pan: inv.pan,
          sections: new Set(),
          billCount: 0,
          totalTaxableValue: 0,
          tcsCollected: 0,
        };
      }
      partyMap[pid].billCount++;
      partyMap[pid].totalTaxableValue += inv.taxableValue;
      partyMap[pid].tcsCollected += inv.tcsCollected;
      if (inv.tcsSection) partyMap[pid].sections.add(inv.tcsSection);
    }

    return Object.values(partyMap).map((p) => ({
      partyName: p.partyName,
      pan: p.pan,
      tcsSection: Array.from(p.sections).join(', ') || '—',
      billCount: p.billCount,
      totalTaxableValue: Math.round(p.totalTaxableValue * 100) / 100,
      tcsCollected: Math.round(p.tcsCollected * 100) / 100,
    })).sort((a, b) => b.tcsCollected - a.tcsCollected);
  }
}
