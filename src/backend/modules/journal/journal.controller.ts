// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Journal Voucher Controller (Stage 7 / Phase 8)
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { JournalService } from './journal.service';

@Controller()
export class JournalController {
  @Inject(JournalService)
  private readonly journalService!: JournalService;

  async handleList(payload: { companyId: number }) {
    try {
      const data = await this.journalService.list(payload.companyId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleCreate(payload: { companyId: number; data: Record<string, any> }) {
    try {
      const data = await this.journalService.create(payload.companyId, payload.data);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }) {
    try {
      const data = await this.journalService.delete(payload.id, payload.companyId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
