// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — GST Report Sub-Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class GstReportService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async getGstDashboard(companyId: number, startDateStr?: string, endDateStr?: string) {
    // Default to current financial year if no dates provided
    const now = new Date();
    const fyStart = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);
    const startDate = startDateStr ? new Date(startDateStr) : fyStart;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    // ── 1. Sales Aggregation (Output Tax) ──────────────────────
    const salesInvoices = await (this.prisma as any).saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      select: {
        invoiceType: true,
        invoiceDate: true,
        totalGrossAmount: true,
        totalCgst: true,
        totalSgst: true,
        totalIgst: true,
        netAmount: true,
        items: {
          select: {
            gstPct: true,
            grossAmount: true,
            netAmount: true,
          }
        },
      },
    });

    let totalSalesGross = 0;
    let totalSalesTaxable = 0;
    let totalOutputCgst = 0;
    let totalOutputSgst = 0;
    let totalOutputIgst = 0;
    let totalSalesCount = 0;
    let totalSalesReturns = 0;

    const rateMap: Record<number, { gstRate: number; taxableValue: number; cgst: number; sgst: number; igst: number; totalTax: number }> = {};

    for (const inv of salesInvoices) {
      const isReturn = inv.invoiceType === 'SALE_RETURN';
      const multiplier = isReturn ? -1 : 1;

      const cgst = Number(inv.totalCgst || 0) * multiplier;
      const sgst = Number(inv.totalSgst || 0) * multiplier;
      const igst = Number(inv.totalIgst || 0) * multiplier;
      const gross = Number(inv.totalGrossAmount || 0) * multiplier;

      totalSalesGross += gross;
      totalSalesTaxable += gross; // Gross amount equals taxable base in sales
      totalOutputCgst += cgst;
      totalOutputSgst += sgst;
      totalOutputIgst += igst;

      if (isReturn) totalSalesReturns++;
      else totalSalesCount++;

      // Aggregate rate-wise breakdown from items
      if (inv.items && Array.isArray(inv.items)) {
        for (const item of inv.items) {
          const rate = Number(item.gstPct || 0);
          if (!rateMap[rate]) {
            rateMap[rate] = { gstRate: rate, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
          }
          const itemTaxable = Number(item.grossAmount || 0) * multiplier;
          rateMap[rate].taxableValue += itemTaxable;
        }
      }
    }

    const totalOutputTax = totalOutputCgst + totalOutputSgst + totalOutputIgst;

    // ── 2. Purchases Aggregation (Input Tax Credit) ─────────────
    const purchaseInvoices = await (this.prisma as any).purchaseInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      select: {
        invoiceType: true,
        invoiceDate: true,
        totalGrossAmount: true,
        totalCgst: true,
        totalSgst: true,
        totalIgst: true,
        netAmount: true,
      },
    });

    let totalPurchaseGross = 0;
    let totalPurchaseTaxable = 0;
    let totalInputCgst = 0;
    let totalInputSgst = 0;
    let totalInputIgst = 0;
    let totalPurchaseCount = 0;
    let totalPurchaseReturns = 0;

    for (const inv of purchaseInvoices) {
      const isReturn = inv.invoiceType === 'PURCHASE_RETURN';
      const multiplier = isReturn ? -1 : 1;

      const gross = Number(inv.totalGrossAmount || 0) * multiplier;
      const cgst = Number(inv.totalCgst || 0) * multiplier;
      const sgst = Number(inv.totalSgst || 0) * multiplier;
      const igst = Number(inv.totalIgst || 0) * multiplier;

      totalPurchaseGross += gross;
      totalPurchaseTaxable += gross;
      totalInputCgst += cgst;
      totalInputSgst += sgst;
      totalInputIgst += igst;

      if (isReturn) totalPurchaseReturns++;
      else totalPurchaseCount++;
    }

    const totalInputTax = totalInputCgst + totalInputSgst + totalInputIgst;

    // ── 3. Net GST Liability (Output - Input) ───────────────────
    const netCgstLiability = totalOutputCgst - totalInputCgst;
    const netSgstLiability = totalOutputSgst - totalInputSgst;
    const netIgstLiability = totalOutputIgst - totalInputIgst;
    const netTotalLiability = totalOutputTax - totalInputTax;

    // ── 4. Monthly Trend Aggregation ────────────────────────────
    const monthlyMap: Record<string, {
      month: string;
      salesTaxable: number;
      outputTax: number;
      purchaseTaxable: number;
      inputTax: number;
      netTax: number;
    }> = {};

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const getMonthKey = (d: Date) => `${months[d.getMonth()]} ${d.getFullYear()}`;

    for (const inv of salesInvoices) {
      const key = getMonthKey(new Date(inv.invoiceDate));
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: key, salesTaxable: 0, outputTax: 0, purchaseTaxable: 0, inputTax: 0, netTax: 0 };
      }
      const isReturn = inv.invoiceType === 'SALE_RETURN';
      const mult = isReturn ? -1 : 1;
      const tax = (Number(inv.totalCgst || 0) + Number(inv.totalSgst || 0) + Number(inv.totalIgst || 0)) * mult;
      monthlyMap[key].salesTaxable += Number(inv.totalGrossAmount || 0) * mult;
      monthlyMap[key].outputTax += tax;
      monthlyMap[key].netTax += tax;
    }

    for (const inv of purchaseInvoices) {
      const key = getMonthKey(new Date(inv.invoiceDate));
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: key, salesTaxable: 0, outputTax: 0, purchaseTaxable: 0, inputTax: 0, netTax: 0 };
      }
      const isReturn = inv.invoiceType === 'PURCHASE_RETURN';
      const mult = isReturn ? -1 : 1;
      const tax = (Number(inv.totalCgst || 0) + Number(inv.totalSgst || 0) + Number(inv.totalIgst || 0)) * mult;
      monthlyMap[key].purchaseTaxable += Number(inv.totalGrossAmount || 0) * mult;
      monthlyMap[key].inputTax += tax;
      monthlyMap[key].netTax -= tax;
    }

    const monthlyTrends = Object.values(monthlyMap);
    const rateBreakdown = Object.values(rateMap).map(r => {
      // Compute taxes for this rate based on taxable value proportion
      const prop = totalSalesTaxable > 0 ? r.taxableValue / totalSalesTaxable : 0;
      const cgst = Math.round(totalOutputCgst * prop * 100) / 100;
      const sgst = Math.round(totalOutputSgst * prop * 100) / 100;
      const igst = Math.round(totalOutputIgst * prop * 100) / 100;
      return {
        gstRate: r.gstRate,
        taxableValue: Math.round(r.taxableValue * 100) / 100,
        cgst,
        sgst,
        igst,
        totalTax: Math.round((cgst + sgst + igst) * 100) / 100,
      };
    });

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        sales: {
          invoiceCount: totalSalesCount,
          returnCount: totalSalesReturns,
          grossAmount: Math.round(totalSalesGross * 100) / 100,
          taxableValue: Math.round(totalSalesTaxable * 100) / 100,
          cgst: Math.round(totalOutputCgst * 100) / 100,
          sgst: Math.round(totalOutputSgst * 100) / 100,
          igst: Math.round(totalOutputIgst * 100) / 100,
          totalOutputTax: Math.round(totalOutputTax * 100) / 100,
        },
        purchases: {
          invoiceCount: totalPurchaseCount,
          returnCount: totalPurchaseReturns,
          grossAmount: Math.round(totalPurchaseGross * 100) / 100,
          taxableValue: Math.round(totalPurchaseTaxable * 100) / 100,
          cgst: Math.round(totalInputCgst * 100) / 100,
          sgst: Math.round(totalInputSgst * 100) / 100,
          igst: Math.round(totalInputIgst * 100) / 100,
          totalInputTax: Math.round(totalInputTax * 100) / 100,
        },
        netLiability: {
          cgst: Math.round(netCgstLiability * 100) / 100,
          sgst: Math.round(netSgstLiability * 100) / 100,
          igst: Math.round(netIgstLiability * 100) / 100,
          total: Math.round(netTotalLiability * 100) / 100,
          isPayable: netTotalLiability > 0,
        },
      },
      monthlyTrends,
      rateBreakdown,
    };
  }

  async getGstr1Report(companyId: number, startDateStr?: string, endDateStr?: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const companyGstin = (company as any)?.gstin || '';
    const companyStateCode = companyGstin ? companyGstin.substring(0, 2) : '24'; // Default 24 (Gujarat)

    const now = new Date();
    const fyStart = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);
    const startDate = startDateStr ? new Date(startDateStr) : fyStart;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    const invoices = await (this.prisma as any).saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        items: { include: { quality: true } },
      },
    });

    const b2b: any[] = [];
    const b2cl: any[] = [];
    const b2cs: any[] = [];
    const cdnr: any[] = [];
    const hsnMap: Record<string, { hsnCode: string; description: string; uqc: string; totalQty: number; totalCarats: number; totalValue: number; taxableValue: number; cgst: number; sgst: number; igst: number }> = {};

    for (const inv of invoices) {
      const isCreditDebitNote = inv.invoiceType === 'SALE_DEBIT_NOTE' || inv.invoiceType === 'SALE_RETURN';
      const customerGstin = inv.customer?.gstinNumber || '';
      const customerStateCode = customerGstin ? customerGstin.substring(0, 2) : (inv.placeOfSupplyStateCode || companyStateCode);
      const isInterstate = customerStateCode !== companyStateCode;
      const netVal = Number(inv.netAmount || 0);
      const taxableVal = Number(inv.totalTaxableValue || 0);

      // Category classification
      const formattedDate = inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '—';
      const totalTax = Number(inv.totalCgst || 0) + Number(inv.totalSgst || 0) + Number(inv.totalIgst || 0);

      if (isCreditDebitNote) {
        cdnr.push({
          id: inv.id,
          gstin: customerGstin || 'URP',
          partyName: inv.customer?.accountName || 'Consumer',
          noteType: inv.invoiceType === 'SALE_RETURN' ? 'C' : 'D',
          noteTypeName: inv.invoiceType === 'SALE_RETURN' ? 'Credit Note (Return)' : 'Debit Note',
          noteNumber: inv.voucherNumber,
          noteDate: inv.invoiceDate,
          formattedDate,
          originalInvoiceNumber: inv.voucherNumber,
          originalInvoiceDate: inv.invoiceDate,
          placeOfSupply: `${customerStateCode}`,
          noteValue: netVal,
          taxableValue: taxableVal || netVal - totalTax,
          cgst: Number(inv.totalCgst || 0),
          sgst: Number(inv.totalSgst || 0),
          igst: Number(inv.totalIgst || 0),
          totalTax,
        });
      } else if (customerGstin && customerGstin.trim().length === 15) {
        b2b.push({
          id: inv.id,
          gstin: customerGstin,
          partyName: inv.customer?.accountName || 'Customer',
          invoiceNumber: inv.voucherNumber,
          invoiceDate: inv.invoiceDate,
          formattedDate,
          invoiceValue: netVal,
          placeOfSupply: `${customerStateCode}`,
          reverseCharge: 'N',
          invoiceType: 'Regular',
          taxableValue: taxableVal || netVal - totalTax,
          cgst: Number(inv.totalCgst || 0),
          sgst: Number(inv.totalSgst || 0),
          igst: Number(inv.totalIgst || 0),
          totalTax,
        });
      } else if (isInterstate && netVal > 250000) {
        b2cl.push({
          id: inv.id,
          invoiceNumber: inv.voucherNumber,
          invoiceDate: inv.invoiceDate,
          formattedDate,
          invoiceValue: netVal,
          placeOfSupply: `${customerStateCode}`,
          taxableValue: taxableVal || netVal - totalTax,
          igst: Number(inv.totalIgst || 0),
          totalTax: Number(inv.totalIgst || 0),
        });
      } else {
        b2cs.push({
          id: inv.id,
          type: isInterstate ? 'Interstate' : 'Intrastate',
          invoiceNumber: inv.voucherNumber,
          invoiceDate: inv.invoiceDate,
          formattedDate,
          placeOfSupply: `${customerStateCode}`,
          invoiceValue: netVal,
          taxableValue: taxableVal || netVal - totalTax,
          cgst: Number(inv.totalCgst || 0),
          sgst: Number(inv.totalSgst || 0),
          igst: Number(inv.totalIgst || 0),
          totalTax,
        });
      }

      // HSN compilation
      for (const item of inv.items) {
        const hsn = item.hsnCode || '7102'; // Default 7102 for Diamonds
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsnCode: hsn,
            description: item.quality?.qualityName || 'Diamonds & Precious Stones',
            uqc: 'CTS',
            totalQty: 0,
            totalCarats: 0,
            totalValue: 0,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
          };
        }
        hsnMap[hsn].totalQty += item.pieceCount || 0;
        hsnMap[hsn].totalCarats += Number(item.carats || 0);
        hsnMap[hsn].totalValue += Number(item.netAmount || item.grossAmount || 0);
        hsnMap[hsn].taxableValue += Number(item.taxableValue || item.grossAmount || 0);
        hsnMap[hsn].cgst += Number(item.cgstAmount || 0);
        hsnMap[hsn].sgst += Number(item.sgstAmount || 0);
        hsnMap[hsn].igst += Number(item.igstAmount || 0);
      }
    }

    const hsnSummary = Object.values(hsnMap).map((h, idx) => {
      const cgst = Math.round(h.cgst * 100) / 100;
      const sgst = Math.round(h.sgst * 100) / 100;
      const igst = Math.round(h.igst * 100) / 100;
      return {
        id: `hsn-${h.hsnCode || idx}`,
        ...h,
        totalCarats: Math.round(h.totalCarats * 1000) / 1000,
        totalValue: Math.round(h.totalValue * 100) / 100,
        taxableValue: Math.round(h.taxableValue * 100) / 100,
        cgst,
        sgst,
        igst,
        totalTax: Math.round((cgst + sgst + igst) * 100) / 100,
      };
    });

    const voucherNumbers = invoices.map((i: any) => i.voucherNumber).filter(Boolean).sort();
    const docSummary = {
      id: 'doc-summary-outward',
      docType: 'Invoices for Outward Supply',
      from: voucherNumbers.length > 0 ? voucherNumbers[0] : '—',
      to: voucherNumbers.length > 0 ? voucherNumbers[voucherNumbers.length - 1] : '—',
      totalCount: invoices.length,
      cancelledCount: 0,
      netIssued: invoices.length,
    };

    return {
      gstin: companyGstin,
      fp: `${startDate.getMonth() + 1}${startDate.getFullYear()}`,
      grossTurnover: invoices.reduce((s: any, i: any) => s + Number(i.netAmount || 0), 0),
      b2b,
      b2cl,
      b2cs,
      cdnr,
      hsnSummary,
      docSummary,
    };
  }

  async generateGstr1Json(companyId: number, startDateStr?: string, endDateStr?: string) {
    const report = await this.getGstr1Report(companyId, startDateStr, endDateStr);

    const jsonPayload = {
      gstin: report.gstin,
      fp: report.fp,
      gt: report.grossTurnover,
      cur_gt: report.grossTurnover,
      b2b: report.b2b.map((item) => ({
        ctin: item.gstin,
        inv: [{
          inum: item.invoiceNumber,
          idt: new Date(item.invoiceDate).toLocaleDateString('en-GB'),
          val: item.invoiceValue,
          pos: item.placeOfSupply,
          rchrg: item.reverseCharge,
          inv_typ: 'R',
          itms: [{
            num: 1,
            itm_det: {
              txval: item.taxableValue,
              rt: item.igst > 0 ? 0.25 : 0.25, // Diamond GST standard 0.25%
              iamt: item.igst,
              camt: item.cgst,
              samt: item.sgst,
              csamt: 0,
            },
          }],
        }],
      })),
      hsn: {
        data: report.hsnSummary.map((h, idx) => ({
          num: idx + 1,
          hsn_sc: h.hsnCode,
          desc: h.description,
          uqc: h.uqc,
          qty: h.totalCarats,
          val: h.totalValue,
          txval: h.taxableValue,
          iamt: h.igst,
          camt: h.cgst,
          samt: h.sgst,
          csamt: 0,
        })),
      },
    };

    return {
      filename: `GSTR1_${report.gstin}_${report.fp}.json`,
      payload: jsonPayload,
    };
  }

  async getGstRegisters(companyId: number, startDateStr?: string, endDateStr?: string) {
    const now = new Date();
    const fyStart = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);
    const startDate = startDateStr ? new Date(startDateStr) : fyStart;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    // Sales Register (Output Tax)
    const salesInvoices = await (this.prisma as any).saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: { customer: true },
      orderBy: { invoiceDate: 'asc' },
    });

    const salesRegister = salesInvoices.map((inv: any) => ({
      id: inv.id,
      date: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '—',
      voucherNumber: inv.voucherNumber,
      invoiceNo: inv.voucherNumber,
      billNo: inv.voucherNumber,
      invoiceType: inv.invoiceType,
      partyName: inv.customer?.accountName || 'Consumer',
      gstin: inv.customer?.gstinNumber || 'URP',
      partyGstin: inv.customer?.gstinNumber || 'URP',
      stateCode: inv.placeOfSupplyStateCode || '24',
      grossAmount: Number(inv.totalGrossAmount || 0),
      taxableValue: Number(inv.totalTaxableValue || inv.totalGrossAmount || 0),
      cgst: Number(inv.totalCgst || 0),
      sgst: Number(inv.totalSgst || 0),
      igst: Number(inv.totalIgst || 0),
      netAmount: Number(inv.netAmount || 0),
    }));

    // Purchase Register (Input Tax Credit)
    const purchaseInvoices = await (this.prisma as any).purchaseInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: { supplier: true },
      orderBy: { invoiceDate: 'asc' },
    });

    const purchaseRegister = purchaseInvoices.map((inv: any) => ({
      id: inv.id,
      date: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '—',
      voucherNumber: inv.billNumber || inv.voucherNumber,
      invoiceNo: inv.billNumber || inv.voucherNumber,
      billNo: inv.billNumber || inv.voucherNumber,
      invoiceType: inv.invoiceType,
      partyName: inv.supplier?.accountName || 'Vendor',
      gstin: inv.supplier?.gstinNumber || 'URP',
      partyGstin: inv.supplier?.gstinNumber || 'URP',
      stateCode: inv.placeOfSupplyStateCode || '24',
      grossAmount: Number(inv.totalGrossAmount || 0),
      taxableValue: Number(inv.totalTaxableValue || inv.totalGrossAmount || 0),
      cgst: Number(inv.totalCgst || 0),
      sgst: Number(inv.totalSgst || 0),
      igst: Number(inv.totalIgst || 0),
      netAmount: Number(inv.netAmount || 0),
    }));

    return {
      period: { startDate, endDate },
      inputRegister: purchaseRegister,
      outputRegister: salesRegister,
      salesRegister,
      purchaseRegister,
    };
  }

  async reconcileItc(companyId: number, gstr2bList: any[], startDateStr?: string, endDateStr?: string) {
    const registers = await this.getGstRegisters(companyId, startDateStr, endDateStr);
    const purchaseReg = registers.purchaseRegister;

    const reconciledList: any[] = [];
    const matchedBookIds = new Set<number>();

    let matchedItc = 0;
    let mismatchItc = 0;
    let notInBooksItc = 0;
    let supplierPendingItc = 0;

    for (let idx = 0; idx < gstr2bList.length; idx++) {
      const item2b = gstr2bList[idx];
      const gstin = (item2b.partyGstin || item2b.gstin || item2b.ctin || '').trim().toUpperCase();
      const invNum = (item2b.billNo || item2b.invoiceNumber || item2b.inum || '').trim().toUpperCase();
      const taxVal = Number(item2b.portalTaxable || item2b.taxableValue || item2b.txval || item2b.val || 0);
      const taxAmt = Number(item2b.portalTax || item2b.tax || (Number(item2b.igst || item2b.iamt || 0) + Number(item2b.cgst || item2b.camt || 0) + Number(item2b.sgst || item2b.samt || 0)));

      // Search for match in local purchase books
      const bookMatch = purchaseReg.find((p: any) => {
        if (matchedBookIds.has(p.id)) return false;
        const matchGstin = !gstin || !p.gstin || p.gstin === 'URP' || (p.gstin || '').trim().toUpperCase() === gstin;
        const matchInv = (p.voucherNumber || '').trim().toUpperCase() === invNum;
        const matchVal = Math.abs(p.taxableValue - taxVal) < 10.0;
        return (matchGstin && matchInv) || (matchInv && matchVal);
      });

      if (bookMatch) {
        matchedBookIds.add(bookMatch.id);
        const localTax = bookMatch.cgst + bookMatch.sgst + bookMatch.igst;
        const isMatchedCleanly = Math.abs(localTax - taxAmt) < 2.0 && Math.abs(bookMatch.taxableValue - taxVal) < 5.0;

        if (isMatchedCleanly) {
          matchedItc += localTax;
          reconciledList.push({
            id: `rec-m-${idx}`,
            partyGstin: gstin || bookMatch.gstin,
            billNo: invNum || bookMatch.voucherNumber,
            partyName: bookMatch.partyName,
            localTaxable: bookMatch.taxableValue,
            localTax,
            portalTaxable: taxVal,
            portalTax: taxAmt,
            status: 'MATCHED',
            purchaseId: bookMatch.id,
          });
        } else {
          mismatchItc += localTax;
          reconciledList.push({
            id: `rec-mm-${idx}`,
            partyGstin: gstin || bookMatch.gstin,
            billNo: invNum || bookMatch.voucherNumber,
            partyName: bookMatch.partyName,
            localTaxable: bookMatch.taxableValue,
            localTax,
            portalTaxable: taxVal,
            portalTax: taxAmt,
            status: 'MISMATCH',
            purchaseId: bookMatch.id,
          });
        }
      } else {
        notInBooksItc += taxAmt;
        reconciledList.push({
          id: `rec-nib-${idx}`,
          partyGstin: gstin || 'UNREGISTERED',
          billNo: invNum || '—',
          partyName: item2b.partyName || 'External Supplier',
          localTaxable: null,
          localTax: null,
          portalTaxable: taxVal,
          portalTax: taxAmt,
          status: 'NOT_IN_BOOKS',
        });
      }
    }

    // Identify books purchases missing in GSTR-2B portal
    for (const p of purchaseReg) {
      if (!matchedBookIds.has(p.id)) {
        const localTax = p.cgst + p.sgst + p.igst;
        supplierPendingItc += localTax;
        reconciledList.push({
          id: `rec-mip-${p.id}`,
          partyGstin: p.gstin,
          billNo: p.voucherNumber,
          partyName: p.partyName,
          localTaxable: p.taxableValue,
          localTax,
          portalTaxable: null,
          portalTax: null,
          status: 'MISSING_IN_PORTAL',
          purchaseId: p.id,
        });
      }
    }

    const totalLocalItc = purchaseReg.reduce((sum: number, p: any) => sum + p.cgst + p.sgst + p.igst, 0);

    return {
      summary: {
        matchedItc,
        mismatchItc,
        supplierPendingItc,
        notInBooksItc,
        totalLocalItc,
        totalBooksInvoices: purchaseReg.length,
        totalGstr2bInvoices: gstr2bList.length,
      },
      reconciledList,
    };
  }

  async getGstr3bSummary(companyId: number, startDateStr?: string, endDateStr?: string) {
    const now = new Date();
    const fyStart = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);
    const startDate = startDateStr ? new Date(startDateStr) : fyStart;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    // Fast direct Prisma database aggregation
    const salesAgg = await (this.prisma as any).saleInvoice.aggregate({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalGrossAmount: true,
        totalCgst: true,
        totalSgst: true,
        totalIgst: true,
      },
    });

    const purchaseAgg = await (this.prisma as any).purchaseInvoice.aggregate({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalGrossAmount: true,
        totalCgst: true,
        totalSgst: true,
        totalIgst: true,
      },
    });

    const salesTaxable = Number(salesAgg._sum?.totalGrossAmount || 0);
    const salesIgst = Number(salesAgg._sum?.totalIgst || 0);
    const salesCgst = Number(salesAgg._sum?.totalCgst || 0);
    const salesSgst = Number(salesAgg._sum?.totalSgst || 0);

    const purchaseIgst = Number(purchaseAgg._sum?.totalIgst || 0);
    const purchaseCgst = Number(purchaseAgg._sum?.totalCgst || 0);
    const purchaseSgst = Number(purchaseAgg._sum?.totalSgst || 0);

    return {
      table31: {
        a: {
          label: '(a) Outward taxable supplies (other than zero rated, nil rated and exempted)',
          taxable: Math.round(salesTaxable * 100) / 100,
          igst: Math.round(salesIgst * 100) / 100,
          cgst: Math.round(salesCgst * 100) / 100,
          sgst: Math.round(salesSgst * 100) / 100,
          cess: 0,
        },
        b: {
          label: '(b) Outward taxable supplies (zero rated)',
          taxable: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
        },
        c: {
          label: '(c) Other outward supplies (Nil rated, exempted)',
          taxable: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
        },
        d: {
          label: '(d) Inward supplies (liable to reverse charge)',
          taxable: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
        },
        e: {
          label: '(e) Non-GST outward supplies',
          taxable: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
        },
      },
      table4: {
        a1: {
          label: '(1) Import of goods',
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
        },
        a3: {
          label: '(3) Inward supplies liable to reverse charge',
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
        },
        a5: {
          label: '(5) All other ITC (Purchases)',
          igst: Math.round(purchaseIgst * 100) / 100,
          cgst: Math.round(purchaseCgst * 100) / 100,
          sgst: Math.round(purchaseSgst * 100) / 100,
          cess: 0,
        },
        b: {
          label: '(B) ITC Reversed (As per rules 42 & 43)',
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
        },
        c: {
          label: '(C) Net ITC Available (4A - 4B)',
          igst: Math.round(purchaseIgst * 100) / 100,
          cgst: Math.round(purchaseCgst * 100) / 100,
          sgst: Math.round(purchaseSgst * 100) / 100,
          cess: 0,
        },
      },
      interestLateFee: {
        interest: 0,
        lateFee: 0,
      },
      table5: {
        exemptNilNonGstInward: { interState: 0, intraState: 0 },
      },
      table61: {
        taxPayable: {
          cgst: Math.round((salesCgst - purchaseCgst) * 100) / 100,
          sgst: Math.round((salesSgst - purchaseSgst) * 100) / 100,
          igst: Math.round((salesIgst - purchaseIgst) * 100) / 100,
        },
      },
    };
  }

  async getGstAnalytics(companyId: number, startDateStr?: string, endDateStr?: string) {
    const registers = await this.getGstRegisters(companyId, startDateStr, endDateStr);

    const sales = registers.salesRegister;
    const purchases = registers.purchaseRegister;

    // 1. HSN summary
    const compileHsnSummary = (items: any[]) => {
      const map: Record<string, { hsn: string; taxable: number; tax: number; count: number }> = {};
      for (const item of items) {
        const code = item.hsnCode || '7102';
        if (!map[code]) map[code] = { hsn: code, taxable: 0, tax: 0, count: 0 };
        map[code].taxable += Number(item.taxableValue || 0);
        map[code].tax += Number(item.cgstAmount || 0) + Number(item.sgstAmount || 0) + Number(item.igstAmount || 0);
        map[code].count += Number(item.pieceCount || 1);
      }
      return Object.values(map);
    };

    // 2. Party-wise summary
    const compilePartySummary = (list: any[], isSale: boolean) => {
      const map: Record<string, { partyName: string; gstin: string; taxable: number; tax: number; count: number }> = {};
      for (const inv of list) {
        const key = inv.partyName || 'Unknown';
        if (!map[key]) map[key] = { partyName: key, gstin: inv.gstin, taxable: 0, tax: 0, count: 0 };
        const mult = (isSale && inv.invoiceType === 'SALE_RETURN') || (!isSale && inv.invoiceType === 'PURCHASE_RETURN') ? -1 : 1;
        map[key].taxable += inv.taxableValue * mult;
        map[key].tax += (inv.cgst + inv.sgst + inv.igst) * mult;
        map[key].count += 1;
      }
      return Object.values(map).sort((a, b) => b.taxable - a.taxable);
    };

    // 3. Rate-wise summary
    const compileRateSummary = (items: any[]) => {
      const map: Record<string, { rate: string; taxable: number; tax: number }> = {};
      for (const item of items) {
        const rateStr = `${item.gstPct || 0.25}%`;
        if (!map[rateStr]) map[rateStr] = { rate: rateStr, taxable: 0, tax: 0 };
        map[rateStr].taxable += Number(item.taxableValue || 0);
        map[rateStr].tax += Number(item.cgstAmount || 0) + Number(item.sgstAmount || 0) + Number(item.igstAmount || 0);
      }
      return Object.values(map);
    };

    // Fetch invoice items for HSN & Rate analytics
    const saleInvoices = await (this.prisma as any).saleInvoice.findMany({
      where: { companyId, isDeleted: false },
      include: { items: true },
    });
    const purchaseInvoices = await (this.prisma as any).purchaseInvoice.findMany({
      where: { companyId, isDeleted: false },
      include: { items: true },
    });

    const saleItems = saleInvoices.flatMap((s: any) => s.items);
    const purchaseItems = purchaseInvoices.flatMap((p: any) => p.items);

    return {
      outward: {
        hsn: compileHsnSummary(saleItems),
        party: compilePartySummary(sales, true),
        rate: compileRateSummary(saleItems),
      },
      inward: {
        hsn: compileHsnSummary(purchaseItems),
        party: compilePartySummary(purchases, false),
        rate: compileRateSummary(purchaseItems),
      },
    };
  }
}
