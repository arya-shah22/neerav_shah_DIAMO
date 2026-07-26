// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Conversion Controller (IPC Bridge)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { StockConversionService } from './stock-conversion.service';
import { IApiResponse } from '../../../shared/types/common.types';
import { formatApiError } from '../../utils/format-api-error';

@Injectable()
@Controller()
export class StockConversionController {
  @Inject(StockConversionService)
  private readonly service!: StockConversionService;

  async handleList(payload: { companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.list(payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch stock conversions') };
    }
  }

  async handleGet(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.get(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch stock conversion') };
    }
  }

  async handleGetByPacket(payload: { packetId: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.getByPacket(payload.packetId, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch packet conversions') };
    }
  }

  async handleCreate(payload: { companyId: number; data: Record<string, any> }): Promise<IApiResponse> {
    try {
      const data = await this.service.create(payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to create stock conversion') };
    }
  }

  async handleUpdate(payload: { id: number; companyId: number; data: Record<string, any> }): Promise<IApiResponse> {
    try {
      const data = await this.service.update(payload.id, payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to update stock conversion') };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.delete(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to delete stock conversion') };
    }
  }
}
