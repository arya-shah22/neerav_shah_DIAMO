// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Exchange Rate Service
// Manages exchange rate logging, retrieval, and conversion helpers
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CurrencyCode } from '@prisma/client';

@Injectable()
export class ExchangeRateService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  /**
   * Log a new exchange rate entry.
   * Called automatically when transactions use a non-INR currency,
   * or manually from the Exchange Rate History page.
   */
  async logRate(params: {
    companyId: number;
    rateDate: Date | string;
    exchangeRate: number;
    fromCurrency?: CurrencyCode;
    toCurrency?: CurrencyCode;
    source?: string;
    sourceVoucherType?: string;
    sourceVoucherId?: number;
    remarks?: string;
    createdBy?: number;
  }) {
    const date = typeof params.rateDate === 'string' ? new Date(params.rateDate) : params.rateDate;

    return this.prisma.exchangeRateLog.create({
      data: {
        companyId: params.companyId,
        rateDate: date,
        exchangeRate: params.exchangeRate,
        fromCurrency: params.fromCurrency || 'USD',
        toCurrency: params.toCurrency || 'INR',
        source: params.source || 'MANUAL',
        sourceVoucherType: params.sourceVoucherType,
        sourceVoucherId: params.sourceVoucherId,
        remarks: params.remarks,
        createdBy: params.createdBy,
      },
    });
  }

  /**
   * Get the most recent USD→INR exchange rate for a company.
   * Used to pre-fill the exchange rate input on transaction forms.
   */
  async getLatestRate(companyId: number): Promise<{ exchangeRate: number; rateDate: Date } | null> {
    const record = await this.prisma.exchangeRateLog.findFirst({
      where: {
        companyId,
        fromCurrency: 'USD',
        toCurrency: 'INR',
      },
      orderBy: [
        { rateDate: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        exchangeRate: true,
        rateDate: true,
      },
    });

    if (!record) return null;

    return {
      exchangeRate: Number(record.exchangeRate),
      rateDate: record.rateDate,
    };
  }

  /**
   * Get the exchange rate closest to a specific date.
   * Falls back to the most recent rate before that date.
   */
  async getRateForDate(companyId: number, date: Date | string): Promise<number> {
    const targetDate = typeof date === 'string' ? new Date(date) : date;

    // Try exact date first
    const exact = await this.prisma.exchangeRateLog.findFirst({
      where: {
        companyId,
        fromCurrency: 'USD',
        toCurrency: 'INR',
        rateDate: targetDate,
      },
      orderBy: { createdAt: 'desc' },
      select: { exchangeRate: true },
    });

    if (exact) return Number(exact.exchangeRate);

    // Fall back to the most recent rate before the target date
    const before = await this.prisma.exchangeRateLog.findFirst({
      where: {
        companyId,
        fromCurrency: 'USD',
        toCurrency: 'INR',
        rateDate: { lte: targetDate },
      },
      orderBy: [
        { rateDate: 'desc' },
        { createdAt: 'desc' },
      ],
      select: { exchangeRate: true },
    });

    if (before) return Number(before.exchangeRate);

    // No rate found — return 1 (no conversion)
    return 1;
  }

  /**
   * Get exchange rate history for a date range.
   */
  async getRateHistory(companyId: number, from?: Date | string, to?: Date | string) {
    const where: any = {
      companyId,
      fromCurrency: 'USD',
      toCurrency: 'INR',
    };

    if (from || to) {
      where.rateDate = {};
      if (from) where.rateDate.gte = typeof from === 'string' ? new Date(from) : from;
      if (to) where.rateDate.lte = typeof to === 'string' ? new Date(to) : to;
    }

    const records = await this.prisma.exchangeRateLog.findMany({
      where,
      orderBy: [
        { rateDate: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 500,
    });

    return records.map((r: any) => ({
      id: r.id,
      companyId: r.companyId,
      rateDate: r.rateDate,
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency,
      exchangeRate: Number(r.exchangeRate),
      source: r.source,
      sourceVoucherType: r.sourceVoucherType,
      sourceVoucherId: r.sourceVoucherId,
      remarks: r.remarks,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Delete an exchange rate log entry.
   */
  async deleteRate(id: number, companyId: number) {
    return this.prisma.exchangeRateLog.deleteMany({
      where: { id, companyId },
    });
  }

  /**
   * Update an existing exchange rate log entry.
   */
  async updateRate(id: number, companyId: number, exchangeRate: number, remarks?: string) {
    return this.prisma.exchangeRateLog.updateMany({
      where: { id, companyId },
      data: { exchangeRate, remarks },
    });
  }

  // ─── Conversion Helpers ───────────────────────────────────────

  /**
   * Convert USD amount to INR using the given exchange rate.
   */
  convertToInr(amountUsd: number, exchangeRate: number): number {
    return Math.round(amountUsd * exchangeRate * 100) / 100;
  }

  /**
   * Convert INR amount to USD using the given exchange rate.
   */
  convertToUsd(amountInr: number, exchangeRate: number): number {
    if (exchangeRate === 0) return 0;
    return Math.round((amountInr / exchangeRate) * 100) / 100;
  }

  /**
   * Compute the alternate currency amount based on the transaction currency.
   * If transactionCurrency = 'USD', returns INR equivalent.
   * If transactionCurrency = 'INR', returns USD equivalent.
   */
  computeAltAmount(amount: number, transactionCurrency: CurrencyCode, exchangeRate: number): number {
    if (transactionCurrency === 'USD') {
      return this.convertToInr(amount, exchangeRate);
    }
    return this.convertToUsd(amount, exchangeRate);
  }

  /**
   * Normalize any amount to INR (for GL posting).
   * If already INR, returns as-is.
   * If USD, converts using exchangeRate.
   */
  normalizeToInr(amount: number, transactionCurrency: CurrencyCode, exchangeRate: number): number {
    if (transactionCurrency === 'INR') return amount;
    return this.convertToInr(amount, exchangeRate);
  }
}
