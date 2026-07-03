// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Controller (IPC Bridge)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { StockService, StockListFilters } from './stock.service';
import { IApiResponse } from '../../../shared/types/common.types';
import { formatApiError } from '../../utils/format-api-error';
import { StockCategory, StockStatus } from '@prisma/client';

@Injectable()
@Controller()
export class StockController {
  @Inject(StockService)
  private readonly service!: StockService;

  async handleList(payload: {
    companyId: number;
    search?: string;
    status?: StockStatus;
    category?: StockCategory;
    qualityId?: number;
  }): Promise<IApiResponse> {
    try {
      const filters: StockListFilters = {
        search: payload.search,
        status: payload.status,
        category: payload.category,
        qualityId: payload.qualityId,
      };
      const data = await this.service.list(payload.companyId, filters);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch stock') };
    }
  }

  async handleSearch(payload: { companyId: number; query: string }): Promise<IApiResponse> {
    try {
      const data = await this.service.search(payload.companyId, payload.query);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Stock search failed') };
    }
  }

  async handleGet(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.get(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch stock packet') };
    }
  }

  async handlePreviewId(companyId: number): Promise<IApiResponse> {
    try {
      const data = await this.service.previewStockId(companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to preview stock ID') };
    }
  }

  async handleListShapes(companyId: number): Promise<IApiResponse> {
    try {
      const data = await this.service.listShapes(companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch shape list') };
    }
  }

  async handleTimeline(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.timeline(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch stock timeline') };
    }
  }

  async handleCreate(payload: {
    companyId: number;
    data: Record<string, unknown>;
    userId?: number;
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.create(payload.companyId, payload.data, payload.userId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to create stock packet') };
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
      return { success: false, error: formatApiError(error, 'Failed to update stock packet') };
    }
  }

  async handleDelete(payload: { id: number; companyId: number; userId?: number }): Promise<IApiResponse> {
    try {
      await this.service.delete(payload.id, payload.companyId, payload.userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to delete stock packet') };
    }
  }
}
