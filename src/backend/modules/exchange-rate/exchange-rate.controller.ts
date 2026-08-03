// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Exchange Rate Controller
// IPC endpoints for exchange rate management
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import type { IApiResponse } from '../../../shared/types/common.types';

@Controller()
export class ExchangeRateController {
  @Inject(ExchangeRateService)
  private readonly exchangeRateService!: ExchangeRateService;

  /**
   * Log a new exchange rate entry (manual or from transaction).
   */
  async handleLogRate(payload: {
    companyId: number;
    rateDate: string;
    exchangeRate: number;
    fromCurrency?: 'USD' | 'INR';
    toCurrency?: 'USD' | 'INR';
    source?: string;
    sourceVoucherType?: string;
    sourceVoucherId?: number;
    remarks?: string;
    userId?: number;
  }): Promise<IApiResponse<any>> {
    try {
      const result = await this.exchangeRateService.logRate({
        companyId: payload.companyId,
        rateDate: payload.rateDate,
        exchangeRate: payload.exchangeRate,
        fromCurrency: payload.fromCurrency as any,
        toCurrency: payload.toCurrency as any,
        source: payload.source,
        sourceVoucherType: payload.sourceVoucherType,
        sourceVoucherId: payload.sourceVoucherId,
        remarks: payload.remarks,
        createdBy: payload.userId,
      });
      return { success: true, data: { message: 'Exchange rate logged successfully', id: result.id } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to log exchange rate' };
    }
  }

  /**
   * Get the latest USD→INR exchange rate for pre-filling forms.
   */
  async handleGetLatestRate(payload: { companyId: number }): Promise<IApiResponse<any>> {
    try {
      const rate = await this.exchangeRateService.getLatestRate(payload.companyId);
      return { success: true, data: rate || { exchangeRate: 1, rateDate: new Date().toISOString() } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to get latest rate' };
    }
  }

  /**
   * Get the exchange rate for a specific date.
   */
  async handleGetRateForDate(payload: { companyId: number; date: string }): Promise<IApiResponse<any>> {
    try {
      const rate = await this.exchangeRateService.getRateForDate(payload.companyId, payload.date);
      return { success: true, data: { exchangeRate: rate } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to get rate for date' };
    }
  }

  /**
   * Get exchange rate history.
   */
  async handleGetRateHistory(payload: { companyId: number; from?: string; to?: string }): Promise<IApiResponse<any>> {
    try {
      const history = await this.exchangeRateService.getRateHistory(
        payload.companyId,
        payload.from,
        payload.to,
      );
      return { success: true, data: history };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to get rate history' };
    }
  }

  /**
   * Update an existing exchange rate entry.
   */
  async handleUpdateRate(payload: { id: number; companyId: number; exchangeRate: number; remarks?: string }): Promise<IApiResponse<any>> {
    try {
      await this.exchangeRateService.updateRate(payload.id, payload.companyId, payload.exchangeRate, payload.remarks);
      return { success: true, data: { message: 'Exchange rate updated successfully' } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update exchange rate' };
    }
  }

  /**
   * Delete an exchange rate entry.
   */
  async handleDeleteRate(payload: { id: number; companyId: number }): Promise<IApiResponse<any>> {
    try {
      await this.exchangeRateService.deleteRate(payload.id, payload.companyId);
      return { success: true, data: { message: 'Exchange rate deleted successfully' } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete exchange rate' };
    }
  }
}
