// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Invoice Service Backend
// Properly separates SaleInvoice and PurchaseInvoice tables
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InvoiceStatus, PaymentStatus, InvoiceType, DebitCreditType, MovementType, StockStatus } from '@prisma/client';
import { generateStockIdNumber } from '../../utils/stock-id-generator';
import { formatVoucherNumber, nextVoucherSequenceNumber } from '../../utils/voucher-number-formatter';
import { getOrCreateDefaultAccount } from '../../utils/default-account-helper';

function cleanUpper(val: unknown): string | null {
  if (val == null) return null;
  const str = String(val).trim();
  return str.length > 0 ? str.toUpperCase() : null;
}

/**
 * Determines if a given InvoiceType should go into the purchase_invoices table.
 */
function isPurchaseType(type: InvoiceType): boolean {
  return type === 'PURCHASE_INVOICE' || type === 'PURCHASE_RETURN' || type === 'PURCHASE_DEBIT_NOTE';
}

@Injectable()
export class InvoiceService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;



  /**
   * Previews the next sequential voucher number without incrementing the DB sequence
   */
  async previewVoucherNumber(companyId: number, financialYearId: number, type: InvoiceType, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    const config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, financialYearId, voucherType: type as any },
    });

    const sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: type as any },
    });

    const nextNum = (sequence?.currentNumber || 0) + 1;


    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

    let typeAbbr = 'INV';
    if (type === 'SALE_INVOICE') typeAbbr = 'SI';
    else if (type === 'SALE_RETURN') typeAbbr = 'SR';
    else if (type === 'SALE_DEBIT_NOTE') typeAbbr = 'SDN';
    else if (type === 'PURCHASE_INVOICE') typeAbbr = 'PI';
    else if (type === 'PURCHASE_RETURN') typeAbbr = 'PR';
    else if (type === 'PURCHASE_DEBIT_NOTE') typeAbbr = 'PDN';

    const activeConfig = config || {
      prefix: typeAbbr,
      separator: '-',
      suffix: '',
      digitLength: 6,
      includeYear: true,
      includeMonth: false,
    };

    return formatVoucherNumber(nextNum, activeConfig, yearSuffix, typeAbbr, company.companyCode, date);
  }

  /**
   * Generates a running sequence number and voucher string for invoice types
   */
  async generateVoucherNumber(companyId: number, financialYearId: number, type: InvoiceType, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    const config = await this.prisma.voucherNumberConfig.upsert({
      where: {
        companyId_financialYearId_voucherType: {
          companyId,
          financialYearId,
          voucherType: type as any,
        },
      },
      update: {},
      create: {
        companyId,
        financialYearId,
        voucherType: type as any,
        method: 'AUTOMATIC',
        digitLength: 6,
        includeYear: true,
        includeMonth: false,
        resetAnnually: true,
      },
    });

    if (!config) {
      throw new BadRequestException('Voucher configuration not found');
    }

    // 2. Increment running sequence atomically (race-safe via LAST_INSERT_ID)
    const nextNum = await nextVoucherSequenceNumber(this.prisma, companyId, financialYearId, type as any);

    // 3. Format the final string
    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

    let typeAbbr = 'INV';
    if (type === 'SALE_INVOICE') typeAbbr = 'SI';
    else if (type === 'SALE_RETURN') typeAbbr = 'SR';
    else if (type === 'SALE_DEBIT_NOTE') typeAbbr = 'SDN';
    else if (type === 'PURCHASE_INVOICE') typeAbbr = 'PI';
    else if (type === 'PURCHASE_RETURN') typeAbbr = 'PR';
    else if (type === 'PURCHASE_DEBIT_NOTE') typeAbbr = 'PDN';

    return formatVoucherNumber(nextNum, config, yearSuffix, typeAbbr, company.companyCode, date);
  }

  // ─── Helper: Enrich items with stock packet data ──────────────────────────
  private async enrichItemsWithPackets(items: any[]): Promise<any[]> {
    const packetIds: number[] = [];
    for (const item of items) {
      if (item.stockPacketId) packetIds.push(item.stockPacketId);
    }
    if (packetIds.length === 0) return items;

    const packets = await this.prisma.stockPacket.findMany({
      where: { id: { in: packetIds } },
      select: {
        id: true, stockIdNumber: true, shape: true, color: true,
        clarity: true, cut: true, polish: true, symmetry: true,
        certificateNumber: true, certificateType: true,
      },
    });
    const packetMap = new Map(packets.map(p => [p.id, p]));

    return items.map(item => {
      if (item.stockPacketId && packetMap.has(item.stockPacketId)) {
        return { ...item, stockPacket: packetMap.get(item.stockPacketId) };
      }
      return item;
    });
  }

  /**
   * List all Sale or Purchase Invoices
   */
  async list(companyId: number, type: InvoiceType) {
    if (isPurchaseType(type)) {
      // ─── Purchase table ────────────────────────────────
      const invoices = await this.prisma.purchaseInvoice.findMany({
        where: { companyId, invoiceType: type, isDeleted: false },
        orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
        include: {
          supplier: { select: { id: true, accountName: true } },
          broker: { select: { id: true, accountName: true } },
          items: { include: { quality: true } },
        },
      });

      // Normalize: map supplier → customer for frontend compatibility
      const result = invoices.map((inv: any) => ({
        ...inv,
        customerId: inv.supplierId,
        customer: inv.supplier,
        items: inv.items,
      }));

      for (const inv of result) {
        inv.items = await this.enrichItemsWithPackets(inv.items);
      }

      return result;
    } else {
      // ─── Sale table ─────────────────────────────────────
      const invoices = await this.prisma.saleInvoice.findMany({
        where: { companyId, invoiceType: type, isDeleted: false },
        orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
        include: {
          customer: { select: { id: true, accountName: true } },
          broker: { select: { id: true, accountName: true } },
          items: { include: { quality: true } },
        },
      });

      for (const inv of invoices) {
        (inv as any).items = await this.enrichItemsWithPackets(inv.items);
      }

      return invoices;
    }
  }

  /**
   * Get unique invoice details
   */
  async get(id: number, companyId: number, type?: InvoiceType) {
    // Try sale first, then purchase if not found (or if type hint provided)
    if (type && isPurchaseType(type)) {
      return this.getPurchaseInvoice(id, companyId);
    }

    // Try sale table
    const saleInvoice = await this.prisma.saleInvoice.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        customer: true,
        broker: true,
        items: { include: { quality: true } },
      },
    });

    if (saleInvoice) {
      (saleInvoice as any).items = await this.enrichItemsWithPackets(saleInvoice.items);
      return saleInvoice;
    }

    // Fallback: try purchase table
    return this.getPurchaseInvoice(id, companyId);
  }

  private async getPurchaseInvoice(id: number, companyId: number) {
    const invoice = await this.prisma.purchaseInvoice.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        supplier: true,
        broker: true,
        items: { include: { quality: true } },
      },
    });
    if (!invoice) throw new BadRequestException('Invoice not found');

    const enrichedItems = await this.enrichItemsWithPackets(invoice.items);

    // Normalize for frontend compatibility
    return {
      ...invoice,
      customerId: invoice.supplierId,
      customer: invoice.supplier,
      customerGstin: invoice.supplierGstin,
      customerStateCode: invoice.supplierStateCode,
      items: enrichedItems,
    };
  }

  /**
   * Creates an invoice (Sale/Purchase) along with ledger postings and stock changes
   */
  async create(companyId: number, data: Record<string, any>) {
    const financialYearId = Number(data.financialYearId);
    const invoiceType = data.invoiceType as InvoiceType;
    const partyId = Number(data.customerId || data.supplierId);
    const brokerId = (data.brokerId !== undefined && data.brokerId !== null && data.brokerId !== '' && data.brokerId !== 'null' && data.brokerId !== 'undefined')
      ? Number(data.brokerId)
      : null;
    const brokeragePct = (data.brokeragePct !== undefined && data.brokeragePct !== null && data.brokeragePct !== '' && data.brokeragePct !== 'null' && data.brokeragePct !== 'undefined')
      ? Number(data.brokeragePct)
      : 0;
    const invoiceDate = new Date(data.invoiceDate);
    const creditDays = Number(data.creditDays) || 0;
    const dueDate = new Date(invoiceDate.getTime() + creditDays * 24 * 60 * 60 * 1000);

    const transactionCurrency: 'USD' | 'INR' = (data.transactionCurrency === 'USD' || data.transactionCurrency === 'INR') ? data.transactionCurrency : 'INR';
    const exchangeRate = Number(data.exchangeRate) > 0 ? Number(data.exchangeRate) : 1;

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const party = await this.prisma.account.findUnique({ where: { id: partyId } });
    if (!company || !party) throw new BadRequestException('Company or Party account not found');

    const voucherNumber = await this.generateVoucherNumber(companyId, financialYearId, invoiceType, invoiceDate);
    const billNumber = data.isManualBillNumber && data.billNumber ? data.billNumber : voucherNumber;

    const addPct = Number(data.addPct) || 0;
    const lessPct = Number(data.lessPct) || 0;

    const salesOrPurchaseLedgerId =
      invoiceType === InvoiceType.SALE_INVOICE
        ? await getOrCreateDefaultAccount(this.prisma, companyId, 'Sales A/c', 'Sales Accounts')
        : await getOrCreateDefaultAccount(this.prisma, companyId, 'Purchase A/c', 'Purchase Accounts');

    const cgstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'CGST Input/Output', 'Duties & Taxes');
    const sgstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'SGST Input/Output', 'Duties & Taxes');
    const igstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'IGST Input/Output', 'Duties & Taxes');

    const isPurchase = isPurchaseType(invoiceType);

    return this.prisma.$transaction(async (tx) => {
      const companyQualities = await tx.quality.findMany({
        where: { companyId, isDeleted: false }
      });

      const itemsData = Array.isArray(data.items) ? data.items : [];
      let totalCarats = 0;
      let totalPieces = 0;
      let totalGrossAmount = 0;
      let totalDiscount = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const parsedItems = [];

      for (const [index, it] of itemsData.entries()) {
        const carats = Number(it.carats) || 0;
        const pieces = (it.isPiecesUncounted || it.pieces === null || it.pieces === undefined || it.pieces === '') ? 0 : (Number(it.pieces) || 0);
        const rate = Number(it.rate) || 0;
        const discountPct = Number(it.discountPct) || 0;
        const gstPct = Number(it.gstPct) || 0;

        // Multi-currency conversion for line items
        const rateAlt = transactionCurrency === 'USD' ? Math.round(rate * exchangeRate * 100) / 100 : Math.round((rate / exchangeRate) * 100) / 100;

        const gross = carats * rate;
        const discount = (gross * discountPct) / 100;
        const itemAddAmount = (gross * addPct) / 100;
        const itemLessAmount = (gross * lessPct) / 100;
        const taxable = gross + itemAddAmount - itemLessAmount - discount;

        totalCarats += carats;
        totalPieces += pieces;
        totalGrossAmount += gross;
        totalDiscount += discount + itemLessAmount;

        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        const isSameState = company.stateCode === party.stateCode;
        if (isSameState) {
          cgst = (taxable * (gstPct / 2)) / 100;
          sgst = (taxable * (gstPct / 2)) / 100;
          totalCgst += cgst;
          totalSgst += sgst;
        } else {
          igst = (taxable * gstPct) / 100;
          totalIgst += igst;
        }

        const netVal = taxable + cgst + sgst + igst;
        const netAmountAltItem = transactionCurrency === 'USD' ? Math.round(netVal * exchangeRate * 100) / 100 : Math.round((netVal / exchangeRate) * 100) / 100;

        let stockPacketId: number | null = null;
        const quality = companyQualities.find((q) => q.id === Number(it.qualityId));
        if (quality && !quality.isService) {
          if (invoiceType === 'PURCHASE_INVOICE') {
            const stockId = it.stockIdNumber?.trim() || (await generateStockIdNumber(tx, companyId));
            let pkt = await tx.stockPacket.findFirst({
              where: { companyId, stockIdNumber: stockId, isDeleted: false }
            });
            if (!pkt) {
              pkt = await tx.stockPacket.create({
                data: {
                  companyId,
                  qualityId: quality.id,
                  stockIdNumber: stockId,
                  category: (it.category as any) || 'NON_CERTIFIED',
                  shape: it.shape || null,
                  color: it.color || null,
                  clarity: cleanUpper(it.clarity),
                  cut: cleanUpper(it.cut),
                  polish: cleanUpper(it.polish),
                  symmetry: cleanUpper(it.symmetry),
                  lengthMm: it.lengthMm != null ? Number(it.lengthMm) : null,
                  widthMm: it.widthMm != null ? Number(it.widthMm) : null,
                  depthMm: it.depthMm != null ? Number(it.depthMm) : null,
                  totalDepthPct: it.totalDepthPct != null ? Number(it.totalDepthPct) : null,
                  tablePct: it.tablePct != null ? Number(it.tablePct) : null,
                  // Extended Diamond Details
                  fluorescenceIntensity: cleanUpper(it.fluorescenceIntensity),
                  fluorescenceColor: cleanUpper(it.fluorescenceColor),
                  rapPricePerCarat: it.rapPricePerCarat != null ? Number(it.rapPricePerCarat) : null,
                  rapDiscountPct: it.rapDiscountPct != null ? Number(it.rapDiscountPct) : null,
                  crownAngle: it.crownAngle != null ? Number(it.crownAngle) : null,
                  crownHeight: it.crownHeight != null ? Number(it.crownHeight) : null,
                  pavilionAngle: it.pavilionAngle != null ? Number(it.pavilionAngle) : null,
                  pavilionDepth: it.pavilionDepth != null ? Number(it.pavilionDepth) : null,
                  girdleMin: cleanUpper(it.girdleMin),
                  girdleMax: cleanUpper(it.girdleMax),
                  girdleCondition: cleanUpper(it.girdleCondition),
                  culetSize: cleanUpper(it.culetSize),
                  culetCondition: cleanUpper(it.culetCondition),
                  heartsAndArrows: cleanUpper(it.heartsAndArrows),
                  eyeClean: cleanUpper(it.eyeClean),
                  shade: cleanUpper(it.shade),
                  milky: cleanUpper(it.milky),
                  treatment: cleanUpper(it.treatment),
                  tinge: cleanUpper(it.tinge),
                  lustre: cleanUpper(it.lustre),
                  tableInclusion: cleanUpper(it.tableInclusion),
                  sideInclusion: cleanUpper(it.sideInclusion),
                  tableOpen: cleanUpper(it.tableOpen),
                  crownOpen: cleanUpper(it.crownOpen),
                  girdleOpen: cleanUpper(it.girdleOpen),
                  origin: cleanUpper(it.origin),
                  certificateUrl: it.certificateUrl || null,
                  webUrl: it.webUrl || null,
                  inscription: it.inscription || null,
                  keyToSymbols: it.keyToSymbols || null,
                  diamondComment: it.diamondComment || null,
                  fancyColor: cleanUpper(it.fancyColor),
                  fancyColorIntensity: cleanUpper(it.fancyColorIntensity),
                  fancyColorOvertone: cleanUpper(it.fancyColorOvertone),
                  availability: cleanUpper(it.availability),
                  city: cleanUpper(it.city),
                  state: cleanUpper(it.state),
                  tradeShow: cleanUpper(it.tradeShow),
                  brand: cleanUpper(it.brand),
                  sellerSpec: it.sellerSpec || null,
                  pairStockNumber: it.pairStockNumber || null,
                  isPairSeparable: cleanUpper(it.isPairSeparable),
                  parcelStones: it.parcelStones || null,
                  reportFilename: it.reportFilename || null,
                  reportIssueDate: it.reportIssueDate || null,
                  labLocation: cleanUpper(it.labLocation),
                  blackInclusion: cleanUpper(it.blackInclusion),
                  whiteInclusion: cleanUpper(it.whiteInclusion),
                  openInclusion: cleanUpper(it.openInclusion),
                  starLength: it.starLength != null ? Number(it.starLength) : null,
                  growthType: cleanUpper(it.growthType),
                  bgm: cleanUpper(it.bgm),
                  certificateType: it.certificateType || null,
                  certificateNumber: it.certificateNumber || null,
                  costPerCarat: Number(it.rate),
                  totalCost: Number(gross),
                  targetSaleRate: it.targetSaleRate != null && !isNaN(Number(it.targetSaleRate)) ? Number(it.targetSaleRate) : null,
                  caratWeight: 0,
                  pieceCount: 0,
                  currentStatus: StockStatus.AVAILABLE,
                  registrationDate: new Date(),
                }
              });

              if (it.imageLink?.trim()) {
                await tx.stockMedia.create({
                  data: {
                    stockPacketId: pkt.id,
                    mediaType: 'PHOTO',
                    filePath: it.imageLink.trim(),
                    fileName: 'photo',
                    sortOrder: 0,
                  }
                });
              }
              if (it.videoLink?.trim()) {
                await tx.stockMedia.create({
                  data: {
                    stockPacketId: pkt.id,
                    mediaType: 'VIDEO',
                    filePath: it.videoLink.trim(),
                    fileName: 'video',
                    sortOrder: 1,
                  }
                });
              }
            } else {
              pkt = await tx.stockPacket.update({
                where: { id: pkt.id },
                data: {
                  qualityId: quality.id,
                  category: (it.category as any) || pkt.category,
                  shape: it.shape !== undefined ? it.shape : pkt.shape,
                  color: it.color !== undefined ? it.color : pkt.color,
                  clarity: it.clarity !== undefined ? cleanUpper(it.clarity) : pkt.clarity,
                  cut: it.cut !== undefined ? cleanUpper(it.cut) : pkt.cut,
                  polish: it.polish !== undefined ? cleanUpper(it.polish) : pkt.polish,
                  symmetry: it.symmetry !== undefined ? cleanUpper(it.symmetry) : pkt.symmetry,
                  lengthMm: it.lengthMm != null ? Number(it.lengthMm) : pkt.lengthMm,
                  widthMm: it.widthMm != null ? Number(it.widthMm) : pkt.widthMm,
                  depthMm: it.depthMm != null ? Number(it.depthMm) : pkt.depthMm,
                  totalDepthPct: it.totalDepthPct != null ? Number(it.totalDepthPct) : pkt.totalDepthPct,
                  tablePct: it.tablePct != null ? Number(it.tablePct) : pkt.tablePct,
                  // Extended Diamond Details
                  fluorescenceIntensity: it.fluorescenceIntensity !== undefined ? cleanUpper(it.fluorescenceIntensity) : pkt.fluorescenceIntensity,
                  fluorescenceColor: it.fluorescenceColor !== undefined ? cleanUpper(it.fluorescenceColor) : pkt.fluorescenceColor,
                  rapPricePerCarat: it.rapPricePerCarat != null ? Number(it.rapPricePerCarat) : pkt.rapPricePerCarat,
                  rapDiscountPct: it.rapDiscountPct != null ? Number(it.rapDiscountPct) : pkt.rapDiscountPct,
                  crownAngle: it.crownAngle != null ? Number(it.crownAngle) : pkt.crownAngle,
                  crownHeight: it.crownHeight != null ? Number(it.crownHeight) : pkt.crownHeight,
                  pavilionAngle: it.pavilionAngle != null ? Number(it.pavilionAngle) : pkt.pavilionAngle,
                  pavilionDepth: it.pavilionDepth != null ? Number(it.pavilionDepth) : pkt.pavilionDepth,
                  girdleMin: it.girdleMin !== undefined ? cleanUpper(it.girdleMin) : pkt.girdleMin,
                  girdleMax: it.girdleMax !== undefined ? cleanUpper(it.girdleMax) : pkt.girdleMax,
                  girdleCondition: it.girdleCondition !== undefined ? cleanUpper(it.girdleCondition) : pkt.girdleCondition,
                  culetSize: it.culetSize !== undefined ? cleanUpper(it.culetSize) : pkt.culetSize,
                  culetCondition: it.culetCondition !== undefined ? cleanUpper(it.culetCondition) : pkt.culetCondition,
                  heartsAndArrows: it.heartsAndArrows !== undefined ? cleanUpper(it.heartsAndArrows) : pkt.heartsAndArrows,
                  eyeClean: it.eyeClean !== undefined ? cleanUpper(it.eyeClean) : pkt.eyeClean,
                  shade: it.shade !== undefined ? cleanUpper(it.shade) : pkt.shade,
                  milky: it.milky !== undefined ? cleanUpper(it.milky) : pkt.milky,
                  treatment: it.treatment !== undefined ? cleanUpper(it.treatment) : pkt.treatment,
                  tinge: it.tinge !== undefined ? cleanUpper(it.tinge) : pkt.tinge,
                  lustre: it.lustre !== undefined ? cleanUpper(it.lustre) : pkt.lustre,
                  tableInclusion: it.tableInclusion !== undefined ? cleanUpper(it.tableInclusion) : pkt.tableInclusion,
                  sideInclusion: it.sideInclusion !== undefined ? cleanUpper(it.sideInclusion) : pkt.sideInclusion,
                  tableOpen: it.tableOpen !== undefined ? cleanUpper(it.tableOpen) : pkt.tableOpen,
                  crownOpen: it.crownOpen !== undefined ? cleanUpper(it.crownOpen) : pkt.crownOpen,
                  girdleOpen: it.girdleOpen !== undefined ? cleanUpper(it.girdleOpen) : pkt.girdleOpen,
                  origin: it.origin !== undefined ? cleanUpper(it.origin) : pkt.origin,
                  certificateUrl: it.certificateUrl !== undefined ? (it.certificateUrl || null) : pkt.certificateUrl,
                  webUrl: it.webUrl !== undefined ? (it.webUrl || null) : pkt.webUrl,
                  inscription: it.inscription !== undefined ? (it.inscription || null) : pkt.inscription,
                  keyToSymbols: it.keyToSymbols !== undefined ? (it.keyToSymbols || null) : pkt.keyToSymbols,
                  diamondComment: it.diamondComment !== undefined ? (it.diamondComment || null) : pkt.diamondComment,
                  fancyColor: it.fancyColor !== undefined ? cleanUpper(it.fancyColor) : pkt.fancyColor,
                  fancyColorIntensity: it.fancyColorIntensity !== undefined ? cleanUpper(it.fancyColorIntensity) : pkt.fancyColorIntensity,
                  fancyColorOvertone: it.fancyColorOvertone !== undefined ? cleanUpper(it.fancyColorOvertone) : pkt.fancyColorOvertone,
                  availability: it.availability !== undefined ? cleanUpper(it.availability) : pkt.availability,
                  city: it.city !== undefined ? cleanUpper(it.city) : pkt.city,
                  state: it.state !== undefined ? cleanUpper(it.state) : pkt.state,
                  tradeShow: it.tradeShow !== undefined ? cleanUpper(it.tradeShow) : pkt.tradeShow,
                  brand: it.brand !== undefined ? cleanUpper(it.brand) : pkt.brand,
                  sellerSpec: it.sellerSpec !== undefined ? (it.sellerSpec || null) : pkt.sellerSpec,
                  pairStockNumber: it.pairStockNumber !== undefined ? (it.pairStockNumber || null) : pkt.pairStockNumber,
                  isPairSeparable: it.isPairSeparable !== undefined ? cleanUpper(it.isPairSeparable) : pkt.isPairSeparable,
                  parcelStones: it.parcelStones !== undefined ? (it.parcelStones || null) : pkt.parcelStones,
                  reportFilename: it.reportFilename !== undefined ? (it.reportFilename || null) : pkt.reportFilename,
                  reportIssueDate: it.reportIssueDate !== undefined ? (it.reportIssueDate || null) : pkt.reportIssueDate,
                  labLocation: it.labLocation !== undefined ? cleanUpper(it.labLocation) : pkt.labLocation,
                  blackInclusion: it.blackInclusion !== undefined ? cleanUpper(it.blackInclusion) : pkt.blackInclusion,
                  whiteInclusion: it.whiteInclusion !== undefined ? cleanUpper(it.whiteInclusion) : pkt.whiteInclusion,
                  openInclusion: it.openInclusion !== undefined ? cleanUpper(it.openInclusion) : pkt.openInclusion,
                  starLength: it.starLength !== undefined ? (it.starLength != null ? Number(it.starLength) : null) : pkt.starLength,
                  growthType: it.growthType !== undefined ? cleanUpper(it.growthType) : pkt.growthType,
                  bgm: it.bgm !== undefined ? cleanUpper(it.bgm) : pkt.bgm,
                  certificateType: it.certificateType !== undefined ? it.certificateType : pkt.certificateType,
                  certificateNumber: it.certificateNumber !== undefined ? it.certificateNumber : pkt.certificateNumber,
                  costPerCarat: Number(it.rate),
                  totalCost: Number(gross),
                  targetSaleRate: it.targetSaleRate !== undefined ? (it.targetSaleRate != null && !isNaN(Number(it.targetSaleRate)) ? Number(it.targetSaleRate) : null) : pkt.targetSaleRate,
                }
              });
            }
            stockPacketId = pkt.id;
          } else if (it.stockPacketId) {
            stockPacketId = Number(it.stockPacketId);
          } else {
            let pkt = await tx.stockPacket.findFirst({
              where: { companyId, qualityId: quality.id, isDeleted: false }
            });
            if (!pkt) {
              pkt = await tx.stockPacket.create({
                data: {
                  companyId,
                  qualityId: quality.id,
                  stockIdNumber: `PKT-QLY-${quality.id}`,
                  caratWeight: 0,
                  pieceCount: 0,
                  currentStatus: StockStatus.AVAILABLE,
                  registrationDate: new Date(),
                }
              });
            }
            stockPacketId = pkt.id;
          }
        }

        parsedItems.push({
          rowNumber: index + 1,
          qualityId: Number(it.qualityId),
          hsnNumber: String(it.hsnNumber || '7113'),
          carats,
          pieces,
          rate,
          rateAlt,
          targetSaleRate: it.targetSaleRate != null && !isNaN(Number(it.targetSaleRate)) ? Number(it.targetSaleRate) : null,
          lessPct: discountPct + lessPct,
          termsRate: rate,
          grossAmount: gross,
          gstPct,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          netAmount: netVal,
          netAmountAlt: netAmountAltItem,
          stockPacketId,
        });
      }

      let extraChargesList: Array<{ name: string; hsn?: string; amount: number }> = Array.isArray(data.extraCharges) ? data.extraCharges : [];
      if (extraChargesList.length === 0 && typeof data.narration === 'string' && data.narration.includes('__EXTRA_CHARGES__:')) {
        try {
          const m = data.narration.match(/__EXTRA_CHARGES__:(.*?)(?:__END__|$)/);
          if (m && m[1]) extraChargesList = JSON.parse(m[1]);
        } catch {}
      }
      const totalExtraCharges = extraChargesList.reduce((acc, c) => {
        const amt = Number(c.amount) || 0;
        const cCurr = (c as any).currency || transactionCurrency;
        if (cCurr === transactionCurrency) return acc + amt;
        if (cCurr === 'USD' && transactionCurrency === 'INR') {
          return acc + Math.round(amt * exchangeRate * 100) / 100;
        }
        if (cCurr === 'INR' && transactionCurrency === 'USD') {
          return acc + Math.round((amt / (exchangeRate > 0 ? exchangeRate : 1)) * 100) / 100;
        }
        return acc + amt;
      }, 0);
      totalGrossAmount += totalExtraCharges;

      const calculatedAddValue = (totalGrossAmount * addPct) / 100;
      const calculatedLessValue = (totalGrossAmount * lessPct) / 100;
      const taxableTotal = totalGrossAmount + calculatedAddValue - calculatedLessValue;
      const taxTotal = totalCgst + totalSgst + totalIgst;
      const rawNet = taxableTotal + taxTotal;
      const roundOff = Math.round(rawNet) - rawNet;
      const netAmount = Math.round(rawNet);
      const netAmountAlt = transactionCurrency === 'USD' ? Math.round(netAmount * exchangeRate * 100) / 100 : Math.round((netAmount / exchangeRate) * 100) / 100;

      // 1. Create Invoice Record — branch by type
      let createdInvoice: any;

      if (isPurchase) {
        // ─── Purchase Invoice Table ──────────────────────
        createdInvoice = await tx.purchaseInvoice.create({
          data: {
            companyId,
            financialYearId,
            invoiceType,
            voucherNumber,
            billNumber,
            invoiceDate,
            dueDate,
            status: InvoiceStatus.SAVED,
            paymentStatus: PaymentStatus.UNPAID,
            supplierId: partyId,
            supplierGstin: party.gstinNumber,
            supplierStateCode: party.stateCode,
            placeOfSupply: party.stateCode,
            brokerId,
            brokeragePct,
            brokerageAmount: (taxableTotal * brokeragePct) / 100,
            totalCarats,
            totalPieces,
            totalGrossAmount,
            totalDiscount,
            totalCgst,
            totalSgst,
            totalIgst,
            roundOff,
            netAmount,
            netAmountAlt,
            outstandingAmount: netAmount,
            transactionCurrency,
            exchangeRate,
            referenceInvoiceId: data.referenceInvoiceId || null,
            referenceBillNumber: data.referenceBillNumber || null,
            narration: data.narration || '',
            items: {
              create: parsedItems,
            },
          },
          include: {
            items: true,
          },
        });
        // Normalize for frontend compatibility
        createdInvoice.customerId = createdInvoice.supplierId;
      } else {
        // ─── Sale Invoice Table ──────────────────────────
        createdInvoice = await tx.saleInvoice.create({
          data: {
            companyId,
            financialYearId,
            invoiceType,
            voucherNumber,
            billNumber,
            invoiceDate,
            dueDate,
            status: InvoiceStatus.SAVED,
            paymentStatus: PaymentStatus.UNPAID,
            customerId: partyId,
            customerGstin: party.gstinNumber,
            customerStateCode: party.stateCode,
            placeOfSupply: party.stateCode,
            brokerId,
            brokeragePct,
            brokerageAmount: (taxableTotal * brokeragePct) / 100,
            totalCarats,
            totalPieces,
            totalGrossAmount,
            totalDiscount,
            totalCgst,
            totalSgst,
            totalIgst,
            roundOff,
            netAmount,
            netAmountAlt,
            outstandingAmount: netAmount,
            transactionCurrency,
            exchangeRate,
            referenceInvoiceId: data.referenceInvoiceId || null,
            referenceBillNumber: data.referenceBillNumber || null,
            narration: data.narration || '',
            items: {
              create: parsedItems,
            },
          },
          include: {
            items: true,
          },
        });
      }

      // 2. Create Double-Entry General Ledger Postings
      const isSalesBook = invoiceType === 'SALE_INVOICE' || invoiceType === 'SALE_DEBIT_NOTE';
      const isSalesReturn = invoiceType === 'SALE_RETURN';
      const isPurchaseInvoice = invoiceType === 'PURCHASE_INVOICE';
      const isPurchaseReduction = invoiceType === 'PURCHASE_RETURN' || invoiceType === 'PURCHASE_DEBIT_NOTE';

      let partyDebitCredit: DebitCreditType = DebitCreditType.DEBIT;
      if (isSalesBook) partyDebitCredit = DebitCreditType.DEBIT;
      else if (isSalesReturn) partyDebitCredit = DebitCreditType.CREDIT;
      else if (isPurchaseInvoice) partyDebitCredit = DebitCreditType.CREDIT;
      else if (isPurchaseReduction) partyDebitCredit = DebitCreditType.DEBIT;

      // Compute INR normalized amounts for General Ledger entries (GL is always in INR)
      const toGl = (v: number) => transactionCurrency === 'USD' ? Math.round(v * exchangeRate * 100) / 100 : v;
      const glNetAmount = toGl(netAmount);
      const glTaxableTotal = toGl(taxableTotal);
      // Tax lines must be converted too — leaving them in transaction currency while
      // the party/revenue lines are in INR unbalances the GL by tax × (rate − 1).
      const glCgst = toGl(totalCgst);
      const glSgst = toGl(totalSgst);
      const glIgst = toGl(totalIgst);

      // Party Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: partyId,
          voucherDate: invoiceDate,
          debitCreditType: partyDebitCredit,
          amount: glNetAmount,
          originalCurrency: transactionCurrency,
          originalAmount: netAmount,
          exchangeRate: exchangeRate,
          sourceVoucherType: invoiceType as any,
          sourceVoucherId: createdInvoice.id,
          sourceBillNumber: billNumber,
          narration: `Bill No: ${billNumber}`,
        },
      });

      let revenueDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
      if (isSalesBook) revenueDebitCredit = DebitCreditType.CREDIT;
      else if (isSalesReturn) revenueDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseInvoice) revenueDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseReduction) revenueDebitCredit = DebitCreditType.CREDIT;

      // Revenue / Purchase Expense Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: salesOrPurchaseLedgerId,
          voucherDate: invoiceDate,
          debitCreditType: revenueDebitCredit,
          amount: glTaxableTotal,
          originalCurrency: transactionCurrency,
          originalAmount: taxableTotal,
          exchangeRate: exchangeRate,
          sourceVoucherType: invoiceType as any,
          sourceVoucherId: createdInvoice.id,
          sourceBillNumber: billNumber,
          narration: `${invoiceType} revenue/expense posting`,
        },
      });

      let taxDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
      if (isSalesBook) taxDebitCredit = DebitCreditType.CREDIT;
      else if (isSalesReturn) taxDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseInvoice) taxDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseReduction) taxDebitCredit = DebitCreditType.CREDIT;

      // CGST Posting
      if (totalCgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: cgstLedgerId,
            voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: glCgst,
            originalCurrency: transactionCurrency,
            originalAmount: totalCgst,
            exchangeRate: exchangeRate,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: createdInvoice.id,
            sourceBillNumber: billNumber,
            narration: 'CGST tax entry',
          },
        });
      }

      // SGST Posting
      if (totalSgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: sgstLedgerId,
            voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: glSgst,
            originalCurrency: transactionCurrency,
            originalAmount: totalSgst,
            exchangeRate: exchangeRate,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: createdInvoice.id,
            sourceBillNumber: billNumber,
            narration: 'SGST tax entry',
          },
        });
      }

      // IGST Posting
      if (totalIgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: igstLedgerId,
            voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: glIgst,
            originalCurrency: transactionCurrency,
            originalAmount: totalIgst,
            exchangeRate: exchangeRate,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: createdInvoice.id,
            sourceBillNumber: billNumber,
            narration: 'IGST tax entry',
          },
        });
      }

      // Round Off Posting
      if (Math.abs(roundOff) > 0.001) {
        const roundOffLedgerId = await getOrCreateDefaultAccount(
          this.prisma,
          companyId,
          'Round-off A/c',
          'Indirect Expenses',
          'Expense',
        );
        // Round-off balances the (rounded) party line against the (unrounded)
        // revenue + tax. When the party is debited (sales) a positive round-off is
        // a credit; when the party is credited (purchase) the side flips — the old
        // sales-only rule left every purchase round-off doubling the imbalance.
        const partySignedRoundOff = (partyDebitCredit === DebitCreditType.DEBIT ? 1 : -1) * roundOff;
        const roundOffDc: DebitCreditType = partySignedRoundOff < 0 ? DebitCreditType.DEBIT : DebitCreditType.CREDIT;
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: roundOffLedgerId,
            voucherDate: invoiceDate,
            debitCreditType: roundOffDc,
            amount: toGl(Math.abs(roundOff)),
            originalCurrency: transactionCurrency,
            originalAmount: Math.abs(roundOff),
            exchangeRate: exchangeRate,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: createdInvoice.id,
            sourceBillNumber: billNumber,
            narration: 'Round off adjustment',
          },
        });
      }

      // 3. Stock Movements (Carat Adjustments)
      const hasStockInward = (invoiceType === 'PURCHASE_INVOICE' || invoiceType === 'SALE_RETURN');
      const isFinancialOnly = (invoiceType === 'SALE_DEBIT_NOTE' || invoiceType === 'PURCHASE_DEBIT_NOTE');

      const itemsToProcess = (createdInvoice.items && createdInvoice.items.length > 0) ? createdInvoice.items : parsedItems;

      if (!isFinancialOnly && itemsToProcess.length > 0) {
        for (const item of itemsToProcess) {
          if (!item.stockPacketId) continue;

          const packet = await tx.stockPacket.findUnique({
            where: { id: item.stockPacketId },
          });

          if (packet) {
            const isSale = invoiceType === 'SALE_INVOICE';
            // A purchase return ships stock back to the supplier, so it reduces the
            // packet just like a sale. Previously only SALE_INVOICE was treated as
            // outward, so PURCHASE_RETURN wrongly *increased* the carat weight.
            const isStockOutward = invoiceType === 'SALE_INVOICE' || invoiceType === 'PURCHASE_RETURN';
            const itemCarats = Number(item.carats);
            const currentCarats = Number(packet.caratWeight || 0);

            // Validate against removing more than is on hand
            if (isStockOutward && itemCarats > currentCarats + 0.0001) {
              throw new BadRequestException(
                `Cannot remove ${itemCarats.toFixed(3)} Cts from packet ${packet.stockIdNumber} — only ${currentCarats.toFixed(3)} Cts available`
              );
            }

            const remainingCarats = isStockOutward ? Math.max(0, currentCarats - itemCarats) : currentCarats + itemCarats;
            const newStatus = isSale
              ? (remainingCarats <= 0.0001 ? StockStatus.SOLD : StockStatus.AVAILABLE)
              : (invoiceType === 'SALE_RETURN'
                ? StockStatus.AVAILABLE
                : (invoiceType === 'PURCHASE_RETURN'
                  ? StockStatus.RETURNED
                  : packet.currentStatus));

            // Bug #13 fix: Use consistent pieces value (0 when uncounted, not defaulting to 1)
            const itemPieces = Number(item.pieces) || 0;

            // Record movement history for audit trail
            await tx.stockMovement.create({
              data: {
                stockPacketId: packet.id,
                movementDate: invoiceDate,
                movementType: invoiceType === 'SALE_RETURN'
                  ? MovementType.SALES_RETURN
                  : (invoiceType === 'PURCHASE_RETURN'
                    ? MovementType.PURCHASE_RETURN
                    : (hasStockInward ? MovementType.PURCHASE : MovementType.SALES)),
                previousStatus: packet.currentStatus,
                newStatus: newStatus,
                carats: itemCarats,
                pieces: itemPieces,
                sourceVoucherType: invoiceType as any,
                sourceVoucherId: createdInvoice.id,
                remarks: isSale
                  ? (remainingCarats > 0.0001
                    ? `Sold ${itemCarats.toFixed(3)} Cts out of ${currentCarats.toFixed(3)} Total Cts (${remainingCarats.toFixed(3)} Cts remaining in vault) — Ref: ${billNumber}`
                    : `Full sale of ${itemCarats.toFixed(3)} Cts — Ref: ${billNumber}`)
                  : `Invoice ref: ${billNumber}`,
              },
            });

            // Update single packet carats & status
            await tx.stockPacket.update({
              where: { id: packet.id },
              data: {
                caratWeight: hasStockInward
                  ? { increment: itemCarats }
                  : remainingCarats,
                pieceCount: hasStockInward
                  ? { increment: itemPieces }
                  : Math.max(0, (packet.pieceCount || 0) - itemPieces),
                ...(invoiceType === 'PURCHASE_INVOICE' ? {
                  costPerCarat: Number(item.rate),
                  totalCost: itemCarats * Number(item.rate),
                } : {
                  totalCost: remainingCarats * Number(packet.costPerCarat || 0),
                }),
                currentStatus: newStatus,
              },
            });
          }
        }
      }

      // Log exchange rate if non-default rate or transaction in USD
      if (transactionCurrency === 'USD') {
        await tx.exchangeRateLog.create({
          data: {
            companyId,
            rateDate: invoiceDate,
            fromCurrency: 'USD',
            toCurrency: 'INR',
            exchangeRate,
            source: 'TRANSACTION',
            sourceVoucherType: invoiceType,
            sourceVoucherId: createdInvoice.id,
            remarks: `Auto-logged from ${invoiceType} #${billNumber}`,
          },
        });
      }

      return createdInvoice;
    });
  }

  /**
   * Delete an Invoice (Soft delete with ledger & stock reversal)
   * Bug #1 fix: Uses stockPacketId instead of qualityId for stock reversal
   * Bug #5 fix: Uses invoiceType to determine table, avoiding ID collision
   */
  async delete(id: number, companyId: number, invoiceTypeHint?: string) {
    // Determine which table to search based on type hint, or try both
    let invoice: any = null;
    let isPurchase = false;

    if (invoiceTypeHint && isPurchaseType(invoiceTypeHint as InvoiceType)) {
      invoice = await this.prisma.purchaseInvoice.findFirst({
        where: { id, companyId, isDeleted: false },
        include: { items: true },
      });
      isPurchase = true;
    } else if (invoiceTypeHint) {
      invoice = await this.prisma.saleInvoice.findFirst({
        where: { id, companyId, isDeleted: false },
        include: { items: true },
      });
    }

    // Fallback: try both tables if no hint or hint didn't match
    if (!invoice) {
      invoice = await this.prisma.saleInvoice.findFirst({
        where: { id, companyId, isDeleted: false },
        include: { items: true },
      });
      isPurchase = false;
      if (!invoice) {
        invoice = await this.prisma.purchaseInvoice.findFirst({
          where: { id, companyId, isDeleted: false },
          include: { items: true },
        });
        isPurchase = true;
      }
    }

    if (!invoice) throw new BadRequestException('Invoice not found');

    const hasStockOutward = (invoice.invoiceType === 'SALE_INVOICE' || invoice.invoiceType === 'PURCHASE_RETURN');
    const isFinancialOnly = (invoice.invoiceType === 'SALE_DEBIT_NOTE' || invoice.invoiceType === 'PURCHASE_DEBIT_NOTE');

    return this.prisma.$transaction(async (tx) => {
      // 1. Soft-delete the invoice header
      if (isPurchase) {
        await tx.purchaseInvoice.update({
          where: { id },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      } else {
        await tx.saleInvoice.update({
          where: { id },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      }

      // 2. Remove all related general ledger entries
      await tx.generalLedgerEntry.deleteMany({
        where: {
          companyId,
          sourceVoucherType: invoice.invoiceType as any,
          sourceVoucherId: id,
        },
      });

      // 3. Reverse stock counts and remove movements
      if (!isFinancialOnly) {
        for (const item of invoice.items) {
          const quality = await tx.quality.findUnique({ where: { id: item.qualityId } });
          if (quality?.isService) continue;

          // Bug #1 fix: Use stockPacketId (exact) instead of qualityId (ambiguous)
          if (!item.stockPacketId) continue;
          const packet = await tx.stockPacket.findUnique({
            where: { id: item.stockPacketId },
          });

          if (packet && !packet.isDeleted) {
            const currentCarats = Number(packet.caratWeight || 0);
            const itemCarats = Number(item.carats || 0);
            const restoredCarats = hasStockOutward
              ? currentCarats + itemCarats
              : Math.max(0, currentCarats - itemCarats);

            const shouldDeletePacket = !hasStockOutward && restoredCarats <= 0.0001;

            await tx.stockPacket.update({
              where: { id: packet.id },
              data: {
                caratWeight: restoredCarats,
                pieceCount: hasStockOutward
                  ? { increment: item.pieces || 0 }
                  : { decrement: item.pieces || 0 },
                // Restore to AVAILABLE when reversing a sale/purchase-return
                currentStatus: hasStockOutward ? StockStatus.AVAILABLE : undefined,
                isDeleted: shouldDeletePacket ? true : undefined,
                deletedAt: shouldDeletePacket ? new Date() : undefined,
              },
            });
          }
        }

        // Delete stock movement records
        await tx.stockMovement.deleteMany({
          where: {
            sourceVoucherType: invoice.invoiceType as any,
            sourceVoucherId: id,
          },
        });
      }

      return { success: true };
    });
  }

  /**
   * Update an Invoice — deletes old postings & stock movements, re-creates with new data
   * Bug #2 fix: Uses stockPacketId instead of qualityId for stock reversal
   * Bug #3 fix: Checks remaining carats for partial vs full sale status
   * Bug #4 fix: Removes unreliable skipWeight heuristic, uses explicit carat math
   * Bug #6 fix: Uses invoiceType to determine correct table, avoiding ID collision
   */
  async update(id: number, companyId: number, data: Record<string, any>) {
    // Bug #6 fix: Determine which table using invoiceType from data
    const hintType = data.invoiceType as string | undefined;
    let existing: any = null;
    let existingIsPurchase = false;

    if (hintType && isPurchaseType(hintType as InvoiceType)) {
      existing = await this.prisma.purchaseInvoice.findFirst({
        where: { id, companyId, isDeleted: false },
        include: { items: true },
      });
      existingIsPurchase = true;
    } else if (hintType) {
      existing = await this.prisma.saleInvoice.findFirst({
        where: { id, companyId, isDeleted: false },
        include: { items: true },
      });
    }

    // Fallback: try both tables
    if (!existing) {
      existing = await this.prisma.saleInvoice.findFirst({
        where: { id, companyId, isDeleted: false },
        include: { items: true },
      });
      existingIsPurchase = false;
      if (!existing) {
        existing = await this.prisma.purchaseInvoice.findFirst({
          where: { id, companyId, isDeleted: false },
          include: { items: true },
        });
        existingIsPurchase = true;
      }
    }

    if (!existing) throw new BadRequestException('Invoice not found');

    const invoiceType = existing.invoiceType as InvoiceType;
    const partyId = Number(data.customerId);
    const brokerId = data.brokerId ? Number(data.brokerId) : null;
    const invoiceDate = new Date(data.invoiceDate);
    const creditDays = Number(data.creditDays) || 0;
    const dueDate = new Date(invoiceDate.getTime() + creditDays * 24 * 60 * 60 * 1000);
    // GL must be posted in INR. Editing a USD invoice previously rewrote every GL
    // line with raw USD magnitudes; carry the currency/rate through, defaulting to
    // whatever the invoice was originally saved with.
    const transactionCurrency: 'USD' | 'INR' =
      (data.transactionCurrency === 'USD' || data.transactionCurrency === 'INR')
        ? data.transactionCurrency
        : (((existing as any).transactionCurrency === 'USD') ? 'USD' : 'INR');
    const exchangeRate = Number(data.exchangeRate) > 0
      ? Number(data.exchangeRate)
      : (Number((existing as any).exchangeRate) > 0 ? Number((existing as any).exchangeRate) : 1);
    const toGl = (v: number) => transactionCurrency === 'USD' ? Math.round(v * exchangeRate * 100) / 100 : v;
    const addPct = Number(data.addPct) || 0;
    const lessPct = Number(data.lessPct) || 0;

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const party = await this.prisma.account.findUnique({ where: { id: partyId } });
    if (!company || !party) throw new BadRequestException('Company or Party account not found');

    const billNumber = data.isManualBillNumber && data.billNumber ? data.billNumber : existing.voucherNumber;

    const salesOrPurchaseLedgerId =
      invoiceType === 'SALE_INVOICE' || invoiceType === 'SALE_DEBIT_NOTE' || invoiceType === 'SALE_RETURN'
        ? await getOrCreateDefaultAccount(this.prisma, companyId, 'Sales A/c', 'Sales Accounts')
        : await getOrCreateDefaultAccount(this.prisma, companyId, 'Purchase A/c', 'Purchase Accounts');

    const cgstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'CGST Input/Output', 'Duties & Taxes');
    const sgstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'SGST Input/Output', 'Duties & Taxes');
    const igstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'IGST Input/Output', 'Duties & Taxes');

    return this.prisma.$transaction(async (tx) => {
      const companyQualities = await tx.quality.findMany({
        where: { companyId, isDeleted: false }
      });

      const itemsData = Array.isArray(data.items) ? data.items : [];
      let totalCarats = 0;
      let totalPieces = 0;
      let totalGrossAmount = 0;
      let totalDiscount = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const parsedItems = [];

      for (const [index, it] of itemsData.entries()) {
        const carats = Number(it.carats) || 0;
        const pieces = (it.isPiecesUncounted || it.pieces === null || it.pieces === undefined || it.pieces === '') ? 0 : (Number(it.pieces) || 0);
        const rate = Number(it.rate) || 0;
        const discountPct = Number(it.discountPct) || 0;
        const gstPct = Number(it.gstPct) || 0;

        const gross = carats * rate;
        const discount = (gross * discountPct) / 100;
        const itemAddAmount = (gross * addPct) / 100;
        const itemLessAmount = (gross * lessPct) / 100;
        const taxable = gross + itemAddAmount - itemLessAmount - discount;

        totalCarats += carats;
        totalPieces += pieces;
        totalGrossAmount += gross;
        totalDiscount += discount + itemLessAmount;

        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        const isSameState = company.stateCode === party.stateCode;
        if (isSameState) {
          cgst = (taxable * (gstPct / 2)) / 100;
          sgst = (taxable * (gstPct / 2)) / 100;
          totalCgst += cgst;
          totalSgst += sgst;
        } else {
          igst = (taxable * gstPct) / 100;
          totalIgst += igst;
        }

        const netVal = taxable + cgst + sgst + igst;
        const rateAlt = transactionCurrency === 'USD' ? Math.round(rate * exchangeRate * 100) / 100 : Math.round((rate / exchangeRate) * 100) / 100;
        const netAmountAltItem = transactionCurrency === 'USD' ? Math.round(netVal * exchangeRate * 100) / 100 : Math.round((netVal / exchangeRate) * 100) / 100;

        let stockPacketId: number | null = null;
        const quality = companyQualities.find((q) => q.id === Number(it.qualityId));
        if (quality && !quality.isService) {
          if (invoiceType === 'PURCHASE_INVOICE') {
            const stockId = it.stockIdNumber?.trim() || (await generateStockIdNumber(tx, companyId));
            let pkt = await tx.stockPacket.findFirst({
              where: { companyId, stockIdNumber: stockId, isDeleted: false }
            });
            if (!pkt) {
              pkt = await tx.stockPacket.create({
                data: {
                  companyId,
                  qualityId: quality.id,
                  stockIdNumber: stockId,
                  category: (it.category as any) || 'NON_CERTIFIED',
                  shape: it.shape || null,
                  color: it.color || null,
                  clarity: cleanUpper(it.clarity),
                  cut: cleanUpper(it.cut),
                  polish: cleanUpper(it.polish),
                  symmetry: cleanUpper(it.symmetry),
                  lengthMm: it.lengthMm != null ? Number(it.lengthMm) : null,
                  widthMm: it.widthMm != null ? Number(it.widthMm) : null,
                  depthMm: it.depthMm != null ? Number(it.depthMm) : null,
                  totalDepthPct: it.totalDepthPct != null ? Number(it.totalDepthPct) : null,
                  tablePct: it.tablePct != null ? Number(it.tablePct) : null,
                  // Extended Diamond Details
                  fluorescenceIntensity: cleanUpper(it.fluorescenceIntensity),
                  fluorescenceColor: cleanUpper(it.fluorescenceColor),
                  rapPricePerCarat: it.rapPricePerCarat != null ? Number(it.rapPricePerCarat) : null,
                  rapDiscountPct: it.rapDiscountPct != null ? Number(it.rapDiscountPct) : null,
                  crownAngle: it.crownAngle != null ? Number(it.crownAngle) : null,
                  crownHeight: it.crownHeight != null ? Number(it.crownHeight) : null,
                  pavilionAngle: it.pavilionAngle != null ? Number(it.pavilionAngle) : null,
                  pavilionDepth: it.pavilionDepth != null ? Number(it.pavilionDepth) : null,
                  girdleMin: cleanUpper(it.girdleMin),
                  girdleMax: cleanUpper(it.girdleMax),
                  girdleCondition: cleanUpper(it.girdleCondition),
                  culetSize: cleanUpper(it.culetSize),
                  culetCondition: cleanUpper(it.culetCondition),
                  heartsAndArrows: cleanUpper(it.heartsAndArrows),
                  eyeClean: cleanUpper(it.eyeClean),
                  shade: cleanUpper(it.shade),
                  milky: cleanUpper(it.milky),
                  treatment: cleanUpper(it.treatment),
                  tinge: cleanUpper(it.tinge),
                  lustre: cleanUpper(it.lustre),
                  tableInclusion: cleanUpper(it.tableInclusion),
                  sideInclusion: cleanUpper(it.sideInclusion),
                  tableOpen: cleanUpper(it.tableOpen),
                  crownOpen: cleanUpper(it.crownOpen),
                  girdleOpen: cleanUpper(it.girdleOpen),
                  origin: cleanUpper(it.origin),
                  certificateUrl: it.certificateUrl || null,
                  webUrl: it.webUrl || null,
                  inscription: it.inscription || null,
                  keyToSymbols: it.keyToSymbols || null,
                  diamondComment: it.diamondComment || null,
                  fancyColor: cleanUpper(it.fancyColor),
                  fancyColorIntensity: cleanUpper(it.fancyColorIntensity),
                  fancyColorOvertone: cleanUpper(it.fancyColorOvertone),
                  availability: cleanUpper(it.availability),
                  city: cleanUpper(it.city),
                  state: cleanUpper(it.state),
                  tradeShow: cleanUpper(it.tradeShow),
                  brand: cleanUpper(it.brand),
                  sellerSpec: it.sellerSpec || null,
                  pairStockNumber: it.pairStockNumber || null,
                  isPairSeparable: cleanUpper(it.isPairSeparable),
                  parcelStones: it.parcelStones || null,
                  reportFilename: it.reportFilename || null,
                  reportIssueDate: it.reportIssueDate || null,
                  labLocation: cleanUpper(it.labLocation),
                  blackInclusion: cleanUpper(it.blackInclusion),
                  whiteInclusion: cleanUpper(it.whiteInclusion),
                  openInclusion: cleanUpper(it.openInclusion),
                  starLength: it.starLength != null ? Number(it.starLength) : null,
                  growthType: cleanUpper(it.growthType),
                  bgm: cleanUpper(it.bgm),
                  certificateType: it.certificateType || null,
                  certificateNumber: it.certificateNumber || null,
                  costPerCarat: Number(it.rate),
                  totalCost: Number(gross),
                  caratWeight: 0,
                  pieceCount: 0,
                  currentStatus: StockStatus.AVAILABLE,
                  registrationDate: new Date(),
                }
              });

              if (it.imageLink?.trim()) {
                await tx.stockMedia.create({
                  data: {
                    stockPacketId: pkt.id,
                    mediaType: 'PHOTO',
                    filePath: it.imageLink.trim(),
                    fileName: 'photo',
                    sortOrder: 0,
                  }
                });
              }
              if (it.videoLink?.trim()) {
                await tx.stockMedia.create({
                  data: {
                    stockPacketId: pkt.id,
                    mediaType: 'VIDEO',
                    filePath: it.videoLink.trim(),
                    fileName: 'video',
                    sortOrder: 1,
                  }
                });
              }
            } else {
              pkt = await tx.stockPacket.update({
                where: { id: pkt.id },
                data: {
                  qualityId: quality.id,
                  category: (it.category as any) || pkt.category,
                  shape: it.shape !== undefined ? it.shape : pkt.shape,
                  color: it.color !== undefined ? it.color : pkt.color,
                  clarity: it.clarity !== undefined ? cleanUpper(it.clarity) : pkt.clarity,
                  cut: it.cut !== undefined ? cleanUpper(it.cut) : pkt.cut,
                  polish: it.polish !== undefined ? cleanUpper(it.polish) : pkt.polish,
                  symmetry: it.symmetry !== undefined ? cleanUpper(it.symmetry) : pkt.symmetry,
                  lengthMm: it.lengthMm != null ? Number(it.lengthMm) : pkt.lengthMm,
                  widthMm: it.widthMm != null ? Number(it.widthMm) : pkt.widthMm,
                  depthMm: it.depthMm != null ? Number(it.depthMm) : pkt.depthMm,
                  totalDepthPct: it.totalDepthPct != null ? Number(it.totalDepthPct) : pkt.totalDepthPct,
                  tablePct: it.tablePct != null ? Number(it.tablePct) : pkt.tablePct,
                  // Extended Diamond Details
                  fluorescenceIntensity: it.fluorescenceIntensity !== undefined ? cleanUpper(it.fluorescenceIntensity) : pkt.fluorescenceIntensity,
                  fluorescenceColor: it.fluorescenceColor !== undefined ? cleanUpper(it.fluorescenceColor) : pkt.fluorescenceColor,
                  rapPricePerCarat: it.rapPricePerCarat != null ? Number(it.rapPricePerCarat) : pkt.rapPricePerCarat,
                  rapDiscountPct: it.rapDiscountPct != null ? Number(it.rapDiscountPct) : pkt.rapDiscountPct,
                  crownAngle: it.crownAngle != null ? Number(it.crownAngle) : pkt.crownAngle,
                  crownHeight: it.crownHeight != null ? Number(it.crownHeight) : pkt.crownHeight,
                  pavilionAngle: it.pavilionAngle != null ? Number(it.pavilionAngle) : pkt.pavilionAngle,
                  pavilionDepth: it.pavilionDepth != null ? Number(it.pavilionDepth) : pkt.pavilionDepth,
                  girdleMin: it.girdleMin !== undefined ? cleanUpper(it.girdleMin) : pkt.girdleMin,
                  girdleMax: it.girdleMax !== undefined ? cleanUpper(it.girdleMax) : pkt.girdleMax,
                  girdleCondition: it.girdleCondition !== undefined ? cleanUpper(it.girdleCondition) : pkt.girdleCondition,
                  culetSize: it.culetSize !== undefined ? cleanUpper(it.culetSize) : pkt.culetSize,
                  culetCondition: it.culetCondition !== undefined ? cleanUpper(it.culetCondition) : pkt.culetCondition,
                  heartsAndArrows: it.heartsAndArrows !== undefined ? cleanUpper(it.heartsAndArrows) : pkt.heartsAndArrows,
                  eyeClean: it.eyeClean !== undefined ? cleanUpper(it.eyeClean) : pkt.eyeClean,
                  shade: it.shade !== undefined ? cleanUpper(it.shade) : pkt.shade,
                  milky: it.milky !== undefined ? cleanUpper(it.milky) : pkt.milky,
                  treatment: it.treatment !== undefined ? cleanUpper(it.treatment) : pkt.treatment,
                  tinge: it.tinge !== undefined ? cleanUpper(it.tinge) : pkt.tinge,
                  lustre: it.lustre !== undefined ? cleanUpper(it.lustre) : pkt.lustre,
                  tableInclusion: it.tableInclusion !== undefined ? cleanUpper(it.tableInclusion) : pkt.tableInclusion,
                  sideInclusion: it.sideInclusion !== undefined ? cleanUpper(it.sideInclusion) : pkt.sideInclusion,
                  tableOpen: it.tableOpen !== undefined ? cleanUpper(it.tableOpen) : pkt.tableOpen,
                  crownOpen: it.crownOpen !== undefined ? cleanUpper(it.crownOpen) : pkt.crownOpen,
                  girdleOpen: it.girdleOpen !== undefined ? cleanUpper(it.girdleOpen) : pkt.girdleOpen,
                  origin: it.origin !== undefined ? cleanUpper(it.origin) : pkt.origin,
                  certificateUrl: it.certificateUrl !== undefined ? (it.certificateUrl || null) : pkt.certificateUrl,
                  webUrl: it.webUrl !== undefined ? (it.webUrl || null) : pkt.webUrl,
                  inscription: it.inscription !== undefined ? (it.inscription || null) : pkt.inscription,
                  keyToSymbols: it.keyToSymbols !== undefined ? (it.keyToSymbols || null) : pkt.keyToSymbols,
                  diamondComment: it.diamondComment !== undefined ? (it.diamondComment || null) : pkt.diamondComment,
                  fancyColor: it.fancyColor !== undefined ? cleanUpper(it.fancyColor) : pkt.fancyColor,
                  fancyColorIntensity: it.fancyColorIntensity !== undefined ? cleanUpper(it.fancyColorIntensity) : pkt.fancyColorIntensity,
                  fancyColorOvertone: it.fancyColorOvertone !== undefined ? cleanUpper(it.fancyColorOvertone) : pkt.fancyColorOvertone,
                  availability: it.availability !== undefined ? cleanUpper(it.availability) : pkt.availability,
                  city: it.city !== undefined ? cleanUpper(it.city) : pkt.city,
                  state: it.state !== undefined ? cleanUpper(it.state) : pkt.state,
                  tradeShow: it.tradeShow !== undefined ? cleanUpper(it.tradeShow) : pkt.tradeShow,
                  brand: it.brand !== undefined ? cleanUpper(it.brand) : pkt.brand,
                  sellerSpec: it.sellerSpec !== undefined ? (it.sellerSpec || null) : pkt.sellerSpec,
                  pairStockNumber: it.pairStockNumber !== undefined ? (it.pairStockNumber || null) : pkt.pairStockNumber,
                  isPairSeparable: it.isPairSeparable !== undefined ? cleanUpper(it.isPairSeparable) : pkt.isPairSeparable,
                  parcelStones: it.parcelStones !== undefined ? (it.parcelStones || null) : pkt.parcelStones,
                  reportFilename: it.reportFilename !== undefined ? (it.reportFilename || null) : pkt.reportFilename,
                  reportIssueDate: it.reportIssueDate !== undefined ? (it.reportIssueDate || null) : pkt.reportIssueDate,
                  labLocation: it.labLocation !== undefined ? cleanUpper(it.labLocation) : pkt.labLocation,
                  blackInclusion: it.blackInclusion !== undefined ? cleanUpper(it.blackInclusion) : pkt.blackInclusion,
                  whiteInclusion: it.whiteInclusion !== undefined ? cleanUpper(it.whiteInclusion) : pkt.whiteInclusion,
                  openInclusion: it.openInclusion !== undefined ? cleanUpper(it.openInclusion) : pkt.openInclusion,
                  starLength: it.starLength !== undefined ? (it.starLength != null ? Number(it.starLength) : null) : pkt.starLength,
                  growthType: it.growthType !== undefined ? cleanUpper(it.growthType) : pkt.growthType,
                  bgm: it.bgm !== undefined ? cleanUpper(it.bgm) : pkt.bgm,
                  certificateType: it.certificateType !== undefined ? it.certificateType : pkt.certificateType,
                  certificateNumber: it.certificateNumber !== undefined ? it.certificateNumber : pkt.certificateNumber,
                  costPerCarat: Number(it.rate),
                  totalCost: Number(gross),
                }
              });
            }
            stockPacketId = pkt.id;
          } else if (it.stockPacketId) {
            stockPacketId = Number(it.stockPacketId);
          } else {
            let pkt = await tx.stockPacket.findFirst({
              where: { companyId, qualityId: quality.id, isDeleted: false }
            });
            if (!pkt) {
              pkt = await tx.stockPacket.create({
                data: {
                  companyId,
                  qualityId: quality.id,
                  stockIdNumber: `PKT-QLY-${quality.id}`,
                  caratWeight: 0,
                  pieceCount: 0,
                  currentStatus: StockStatus.AVAILABLE,
                  registrationDate: new Date(),
                }
              });
            }
            stockPacketId = pkt.id;
          }
        }

        parsedItems.push({
          rowNumber: index + 1,
          qualityId: Number(it.qualityId),
          hsnNumber: String(it.hsnNumber || '7113'),
          carats,
          pieces,
          rate,
          rateAlt,
          targetSaleRate: it.targetSaleRate != null && !isNaN(Number(it.targetSaleRate)) ? Number(it.targetSaleRate) : null,
          lessPct: discountPct + lessPct,
          termsRate: rate,
          grossAmount: gross,
          gstPct,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          netAmount: netVal,
          netAmountAlt: netAmountAltItem,
          stockPacketId,
        });
      }

      // Allow manual tax overrides from frontend
      if (data.totalCgst !== undefined) totalCgst = Number(data.totalCgst);
      if (data.totalSgst !== undefined) totalSgst = Number(data.totalSgst);
      if (data.totalIgst !== undefined) totalIgst = Number(data.totalIgst);

      let extraChargesList: Array<{ name: string; hsn?: string; amount: number }> = Array.isArray(data.extraCharges) ? data.extraCharges : [];
      if (extraChargesList.length === 0 && typeof data.narration === 'string' && data.narration.includes('__EXTRA_CHARGES__:')) {
        try {
          const m = data.narration.match(/__EXTRA_CHARGES__:(.*?)(?:__END__|$)/);
          if (m && m[1]) extraChargesList = JSON.parse(m[1]);
        } catch {}
      }
      const totalExtraCharges = extraChargesList.reduce((acc, c) => {
        const amt = Number(c.amount) || 0;
        const cCurr = (c as any).currency || transactionCurrency;
        if (cCurr === transactionCurrency) return acc + amt;
        if (cCurr === 'USD' && transactionCurrency === 'INR') {
          return acc + Math.round(amt * exchangeRate * 100) / 100;
        }
        if (cCurr === 'INR' && transactionCurrency === 'USD') {
          return acc + Math.round((amt / (exchangeRate > 0 ? exchangeRate : 1)) * 100) / 100;
        }
        return acc + amt;
      }, 0);
      totalGrossAmount += totalExtraCharges;

      const calculatedAddValue = (totalGrossAmount * addPct) / 100;
      const calculatedLessValue = (totalGrossAmount * lessPct) / 100;
      const taxableTotal = totalGrossAmount + calculatedAddValue - calculatedLessValue;
      const taxTotal = totalCgst + totalSgst + totalIgst;
      const rawNet = taxableTotal + taxTotal;
      const roundOff = Math.round(rawNet) - rawNet;
      const netAmount = Math.round(rawNet);
      const netAmountAlt = transactionCurrency === 'USD' ? Math.round(netAmount * exchangeRate * 100) / 100 : Math.round((netAmount / exchangeRate) * 100) / 100;

      const brokeragePct = Number(data.brokeragePct) || 0;
      const brokerageAmount = (taxableTotal * brokeragePct) / 100;

      // 1. Reverse old stock movements (Bug #2, #4 fix)
      const oldHasStockOutward = (existing.invoiceType === 'SALE_INVOICE' || existing.invoiceType === 'PURCHASE_RETURN');
      const oldIsFinancialOnly = (existing.invoiceType === 'SALE_DEBIT_NOTE' || existing.invoiceType === 'PURCHASE_DEBIT_NOTE');

      if (!oldIsFinancialOnly) {
        for (const item of existing.items) {
          const quality = await tx.quality.findUnique({ where: { id: item.qualityId } });
          if (quality?.isService) continue;

          // Bug #2 fix: Use stockPacketId (exact) instead of qualityId (ambiguous)
          if (!item.stockPacketId) continue;
          const packet = await tx.stockPacket.findUnique({
            where: { id: item.stockPacketId },
          });
          if (packet && !packet.isDeleted) {
            // Bug #4 fix: Use explicit carat math instead of unreliable skipWeight heuristic
            const currentCarats = Number(packet.caratWeight || 0);
            const itemCarats = Number(item.carats || 0);
            const restoredCarats = oldHasStockOutward
              ? currentCarats + itemCarats
              : Math.max(0, currentCarats - itemCarats);

            await tx.stockPacket.update({
              where: { id: packet.id },
              data: {
                caratWeight: restoredCarats,
                pieceCount: oldHasStockOutward
                  ? { increment: item.pieces || 0 }
                  : { decrement: item.pieces || 0 },
                currentStatus: oldHasStockOutward ? StockStatus.AVAILABLE : undefined,
              },
            });
          }
        }
      }

      // 2. Delete old ledger entries, stock movements, and items
      await tx.generalLedgerEntry.deleteMany({
        where: { companyId, sourceVoucherType: existing.invoiceType as any, sourceVoucherId: id },
      });
      await tx.stockMovement.deleteMany({
        where: { sourceVoucherType: existing.invoiceType as any, sourceVoucherId: id },
      });

      // Delete old items from the correct table
      if (existingIsPurchase) {
        await tx.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoiceId: id } });
      } else {
        await tx.saleInvoiceItem.deleteMany({ where: { saleInvoiceId: id } });
      }

      // 3. Update invoice header in the correct table
      let updatedInvoice: any;

      const oldJama = Number(existing.jamaAmount) || 0;
      const newOutstanding = Math.max(0, netAmount - oldJama);
      const newPaymentStatus = (oldJama === 0 || newOutstanding === netAmount)
        ? PaymentStatus.UNPAID
        : (newOutstanding <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL);

      if (existingIsPurchase) {
        updatedInvoice = await tx.purchaseInvoice.update({
          where: { id },
          data: {
            billNumber,
            invoiceDate,
            dueDate,
            supplierId: partyId,
            supplierGstin: party.gstinNumber,
            supplierStateCode: party.stateCode,
            brokerId,
            brokeragePct,
            brokerageAmount,
            totalCarats,
            totalPieces,
            totalGrossAmount,
            totalDiscount,
            totalCgst,
            totalSgst,
            totalIgst,
            roundOff,
            netAmount,
            netAmountAlt,
            transactionCurrency,
            exchangeRate,
            outstandingAmount: newOutstanding,
            paymentStatus: newPaymentStatus as any,
            narration: data.narration || '',
            updatedAt: new Date(),
            items: { create: parsedItems },
          },
          include: {
            items: true,
            supplier: { select: { id: true, accountName: true } },
            broker: { select: { id: true, accountName: true } },
          },
        });
        // Normalize for frontend
        updatedInvoice.customerId = updatedInvoice.supplierId;
        updatedInvoice.customer = updatedInvoice.supplier;
      } else {
        updatedInvoice = await tx.saleInvoice.update({
          where: { id },
          data: {
            billNumber,
            invoiceDate,
            dueDate,
            customerId: partyId,
            customerGstin: party.gstinNumber,
            customerStateCode: party.stateCode,
            brokerId,
            brokeragePct,
            brokerageAmount,
            totalCarats,
            totalPieces,
            totalGrossAmount,
            totalDiscount,
            totalCgst,
            totalSgst,
            totalIgst,
            roundOff,
            netAmount,
            netAmountAlt,
            transactionCurrency,
            exchangeRate,
            outstandingAmount: newOutstanding,
            paymentStatus: newPaymentStatus as any,
            narration: data.narration || '',
            updatedAt: new Date(),
            items: { create: parsedItems },
          },
          include: {
            items: true,
            customer: { select: { id: true, accountName: true } },
            broker: { select: { id: true, accountName: true } },
          },
        });
      }

      // 4. Re-create ledger entries
      const isSalesBook = invoiceType === 'SALE_INVOICE' || invoiceType === 'SALE_DEBIT_NOTE';
      const isSalesReturn = invoiceType === 'SALE_RETURN';
      const isPurchaseInvoice = invoiceType === 'PURCHASE_INVOICE';
      const isPurchaseReduction = invoiceType === 'PURCHASE_RETURN' || invoiceType === 'PURCHASE_DEBIT_NOTE';

      let partyDebitCredit: DebitCreditType = DebitCreditType.DEBIT;
      if (isSalesBook) partyDebitCredit = DebitCreditType.DEBIT;
      else if (isSalesReturn) partyDebitCredit = DebitCreditType.CREDIT;
      else if (isPurchaseInvoice) partyDebitCredit = DebitCreditType.CREDIT;
      else if (isPurchaseReduction) partyDebitCredit = DebitCreditType.DEBIT;

      // Party Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: partyId,
          voucherDate: invoiceDate,
          debitCreditType: partyDebitCredit,
          amount: toGl(netAmount),
          originalCurrency: transactionCurrency,
          originalAmount: netAmount,
          exchangeRate: exchangeRate,
          sourceVoucherType: invoiceType as any,
          sourceVoucherId: id,
          sourceBillNumber: billNumber,
          narration: `Bill No: ${billNumber}`,
        },
      });

      let revenueDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
      if (isSalesBook) revenueDebitCredit = DebitCreditType.CREDIT;
      else if (isSalesReturn) revenueDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseInvoice) revenueDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseReduction) revenueDebitCredit = DebitCreditType.CREDIT;

      // Revenue / Purchase Expense Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: salesOrPurchaseLedgerId,
          voucherDate: invoiceDate,
          debitCreditType: revenueDebitCredit,
          amount: toGl(taxableTotal),
          originalCurrency: transactionCurrency,
          originalAmount: taxableTotal,
          exchangeRate: exchangeRate,
          sourceVoucherType: invoiceType as any,
          sourceVoucherId: id,
          sourceBillNumber: billNumber,
          narration: `${invoiceType} revenue/expense posting`,
        },
      });

      let taxDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
      if (isSalesBook) taxDebitCredit = DebitCreditType.CREDIT;
      else if (isSalesReturn) taxDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseInvoice) taxDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseReduction) taxDebitCredit = DebitCreditType.CREDIT;

      if (totalCgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId, accountId: cgstLedgerId, voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: toGl(totalCgst), originalCurrency: transactionCurrency, originalAmount: totalCgst, exchangeRate,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: id, sourceBillNumber: billNumber, narration: 'CGST tax entry',
          },
        });
      }
      if (totalSgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId, accountId: sgstLedgerId, voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: toGl(totalSgst), originalCurrency: transactionCurrency, originalAmount: totalSgst, exchangeRate,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: id, sourceBillNumber: billNumber, narration: 'SGST tax entry',
          },
        });
      }
      if (totalIgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId, accountId: igstLedgerId, voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: toGl(totalIgst), originalCurrency: transactionCurrency, originalAmount: totalIgst, exchangeRate,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: id, sourceBillNumber: billNumber, narration: 'IGST tax entry',
          },
        });
      }

      // Round Off Posting
      if (Math.abs(roundOff) > 0.001) {
        const roundOffLedgerId = await getOrCreateDefaultAccount(
          this.prisma,
          companyId,
          'Round-off A/c',
          'Indirect Expenses',
          'Expense',
        );
        // See create(): round-off side depends on whether the party is debited or
        // credited; convert the amount to INR like every other GL line.
        const partySignedRoundOff = (partyDebitCredit === DebitCreditType.DEBIT ? 1 : -1) * roundOff;
        const roundOffDc: DebitCreditType = partySignedRoundOff < 0 ? DebitCreditType.DEBIT : DebitCreditType.CREDIT;
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: roundOffLedgerId,
            voucherDate: invoiceDate,
            debitCreditType: roundOffDc,
            amount: toGl(Math.abs(roundOff)),
            originalCurrency: transactionCurrency,
            originalAmount: Math.abs(roundOff),
            exchangeRate: exchangeRate,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: id,
            sourceBillNumber: billNumber,
            narration: 'Round off adjustment',
          },
        });
      }

      // 5. Re-create stock movements & update stock packets
      const hasStockInward = (invoiceType === 'PURCHASE_INVOICE' || invoiceType === 'SALE_RETURN');
      const hasStockOutward = (invoiceType === 'SALE_INVOICE' || invoiceType === 'PURCHASE_RETURN');
      const isFinancialOnly = (invoiceType === 'SALE_DEBIT_NOTE' || invoiceType === 'PURCHASE_DEBIT_NOTE');

      // Bug #3, #4, #14 fixes: Proper partial sale status, explicit carat math, clean totalCost
      if (!isFinancialOnly) {
        for (const item of parsedItems) {
          if (!item.stockPacketId) continue;

          const packet = await tx.stockPacket.findUnique({
            where: { id: item.stockPacketId },
          });

          if (packet) {
            const isSale = invoiceType === 'SALE_INVOICE';
            const currentCarats = Number(packet.caratWeight || 0);
            const itemCarats = Number(item.carats || 0);
            // Purchase returns are outward too — decrement, don't add (see create()).
            const remainingCarats = hasStockOutward
              ? Math.max(0, currentCarats - itemCarats)
              : currentCarats + itemCarats;

            // Bug #3 fix: Check remaining carats for partial vs full sale
            const newStatus = isSale
              ? (remainingCarats <= 0.0001 ? StockStatus.SOLD : StockStatus.AVAILABLE)
              : (invoiceType === 'SALE_RETURN'
                ? StockStatus.AVAILABLE
                : (invoiceType === 'PURCHASE_RETURN'
                  ? StockStatus.RETURNED
                  : packet.currentStatus));

            await tx.stockMovement.create({
              data: {
                stockPacketId: packet.id,
                movementDate: invoiceDate,
                movementType: hasStockInward ? MovementType.PURCHASE : MovementType.SALES,
                previousStatus: packet.currentStatus,
                newStatus: newStatus,
                carats: itemCarats,
                pieces: item.pieces || 0,
                sourceVoucherType: invoiceType as any,
                sourceVoucherId: id,
                remarks: isSale
                  ? (remainingCarats > 0.0001
                    ? `Sold ${itemCarats.toFixed(3)} Cts out of ${currentCarats.toFixed(3)} Total Cts (${remainingCarats.toFixed(3)} Cts remaining) — Updated ref: ${billNumber}`
                    : `Full sale of ${itemCarats.toFixed(3)} Cts — Updated ref: ${billNumber}`)
                  : `Updated Invoice ref: ${billNumber}`,
              },
            });

            // Bug #4 fix: Explicit carat math instead of skipWeight heuristic
            // Bug #14 fix: Single totalCost assignment
            await tx.stockPacket.update({
              where: { id: packet.id },
              data: {
                caratWeight: hasStockOutward ? remainingCarats : remainingCarats,
                pieceCount: hasStockOutward
                  ? Math.max(0, (packet.pieceCount || 0) - (item.pieces || 0))
                  : (packet.pieceCount || 0) + (item.pieces || 0),
                ...(invoiceType === 'PURCHASE_INVOICE' ? {
                  costPerCarat: item.rate,
                  totalCost: itemCarats * item.rate,
                } : {
                  totalCost: remainingCarats * Number(packet.costPerCarat || 0),
                }),
                currentStatus: newStatus,
              },
            });
          }
        }
      }

      return updatedInvoice;
    });
  }
}
