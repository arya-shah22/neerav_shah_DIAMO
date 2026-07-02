// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Controller (IPC Bridge)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { AccountService } from './account.service';
import { IApiResponse } from '../../../shared/types/common.types';
import { formatApiError } from '../../utils/format-api-error';

@Injectable()
@Controller()
export class AccountController {
  @Inject(AccountService)
  private readonly service!: AccountService;

  async handleList(payload: { companyId: number; search?: string; groupId?: number; isBroker?: boolean }): Promise<IApiResponse> {
    try {
      const data = await this.service.list(payload.companyId, payload);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch accounts') };
    }
  }

  async handleSearch(payload: { companyId: number; query: string }): Promise<IApiResponse> {
    try {
      const data = await this.service.search(payload.companyId, payload.query);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Search failed') };
    }
  }

  async handleGet(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.get(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch account') };
    }
  }

  async handleCreate(payload: { companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.create(payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to create account') };
    }
  }

  async handleUpdate(payload: { id: number; companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.update(payload.id, payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to update account') };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      await this.service.delete(payload.id, payload.companyId);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to delete account') };
    }
  }
}
