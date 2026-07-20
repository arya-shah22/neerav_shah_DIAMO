// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Cash & Bank Voucher Controller (Phase 9)
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { CashBankService } from './cashbank.service';

@Controller()
export class CashBankController {
  @Inject(CashBankService)
  private readonly cashBankService!: CashBankService;

  async handleList(payload: { companyId: number }) {
    try {
      const data = await this.cashBankService.list(payload.companyId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleListUnpaidPurchases(payload: { companyId: number; supplierId: number }) {
    try {
      const data = await this.cashBankService.listUnpaidPurchases(payload.companyId, payload.supplierId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleListUnpaidSales(payload: { companyId: number; customerId: number }) {
    try {
      const data = await this.cashBankService.listUnpaidSales(payload.companyId, payload.customerId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleListPartyNotes(payload: { companyId: number; partyId: number }) {
    try {
      const data = await this.cashBankService.listPartyNotes(payload.companyId, payload.partyId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleGetRunningBalance(payload: { companyId: number; cashBankAccountId: number }) {
    try {
      const data = await this.cashBankService.getRunningBalance(payload.companyId, payload.cashBankAccountId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleCreate(payload: { companyId: number; data: Record<string, any> }) {
    try {
      const data = await this.cashBankService.create(payload.companyId, payload.data);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }) {
    try {
      const data = await this.cashBankService.delete(payload.id, payload.companyId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handlePreviewNumber(payload: { companyId: number; financialYearId: number; type: any }) {
    try {
      const data = await this.cashBankService.previewVoucherNumber(payload.companyId, payload.financialYearId, payload.type);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
