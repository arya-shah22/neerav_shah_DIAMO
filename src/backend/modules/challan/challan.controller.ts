// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Challan Controller (Stage 6)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { ChallanService, ChallanListFilters } from './challan.service';
import { IApiResponse } from '../../../shared/types/common.types';
import { formatApiError } from '../../utils/format-api-error';
import { ChallanPurpose, ChallanStatus } from '@prisma/client';

@Injectable()
@Controller()
export class ChallanController {
  @Inject(ChallanService)
  private readonly service!: ChallanService;

  async handleList(payload: {
    companyId: number;
    purpose?: ChallanPurpose;
    search?: string;
    status?: ChallanStatus;
  }): Promise<IApiResponse> {
    try {
      const filters: ChallanListFilters = {
        purpose: payload.purpose,
        search: payload.search,
        status: payload.status,
      };
      const data = await this.service.list(payload.companyId, filters);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch challans') };
    }
  }

  async handleGet(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.get(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch challan details') };
    }
  }

  async handlePreviewNumber(payload: {
    companyId: number;
    financialYearId: number;
    purpose: ChallanPurpose;
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.previewVoucherNumber(
        payload.companyId,
        payload.financialYearId,
        payload.purpose,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to generate challan number') };
    }
  }

  async handleCreate(payload: {
    companyId: number;
    financialYearId: number;
    data: Record<string, unknown>;
    userId?: number;
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.create(
        payload.companyId,
        payload.financialYearId,
        payload.data,
        payload.userId,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to create challan') };
    }
  }

  async handleUpdate(payload: {
    id: number;
    companyId: number;
    data: Record<string, unknown>;
    userId?: number;
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.update(
        payload.id,
        payload.companyId,
        payload.data,
        payload.userId,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to update challan') };
    }
  }

  async handleDelete(payload: { id: number; companyId: number; userId?: number }): Promise<IApiResponse> {
    try {
      await this.service.delete(payload.id, payload.companyId, payload.userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to delete challan') };
    }
  }

  async handleUpdateStatus(payload: {
    id: number;
    companyId: number;
    status: ChallanStatus;
    actualReturnDate?: string;
    items?: { id: number; returnedCarats: number; returnedPieces: number }[];
    userId?: number;
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.updateStatus(
        payload.id,
        payload.companyId,
        payload.status,
        {
          actualReturnDate: payload.actualReturnDate,
          items: payload.items,
        },
        payload.userId,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to update challan status') };
    }
  }
}
