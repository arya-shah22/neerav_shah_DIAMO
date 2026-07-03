// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Invoice Controller (IPC Bridge)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { IApiResponse } from '../../../shared/types/common.types';
import { formatApiError } from '../../utils/format-api-error';
import { InvoiceType } from '@prisma/client';

@Injectable()
@Controller()
export class InvoiceController {
  @Inject(InvoiceService)
  private readonly service!: InvoiceService;

  async handleList(payload: { companyId: number; type: InvoiceType }): Promise<IApiResponse> {
    try {
      const data = await this.service.list(payload.companyId, payload.type);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch invoices') };
    }
  }

  async handlePreviewNumber(payload: { companyId: number; financialYearId: number; type: InvoiceType }): Promise<IApiResponse> {
    try {
      const data = await this.service.previewVoucherNumber(payload.companyId, payload.financialYearId, payload.type);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to preview next sequential number') };
    }
  }

  async handleGet(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.get(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch invoice details') };
    }
  }

  async handleCreate(payload: { companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.create(payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to create invoice') };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.delete(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to delete invoice') };
    }
  }

  async handleUpdate(payload: { id: number; companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.update(payload.id, payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to update invoice') };
    }
  }
}
