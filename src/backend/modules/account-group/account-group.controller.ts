// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Group Controller (IPC Bridge)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { AccountGroupService } from './account-group.service';
import { IApiResponse } from '../../../shared/types/common.types';
import { formatApiError } from '../../utils/format-api-error';

@Injectable()
@Controller()
export class AccountGroupController {
  @Inject(AccountGroupService)
  private readonly service!: AccountGroupService;

  async handleList(companyId: number): Promise<IApiResponse> {
    try {
      const data = await this.service.list(companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch account groups') };
    }
  }

  async handleTree(companyId: number): Promise<IApiResponse> {
    try {
      const data = await this.service.tree(companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch account group tree') };
    }
  }

  async handleGet(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.get(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch account group') };
    }
  }

  async handleCreate(payload: { companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.create(payload.companyId, payload.data as Parameters<AccountGroupService['create']>[1]);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to create account group') };
    }
  }

  async handleUpdate(payload: { id: number; companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.update(payload.id, payload.companyId, payload.data as Parameters<AccountGroupService['update']>[2]);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to update account group') };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      await this.service.delete(payload.id, payload.companyId);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to delete account group') };
    }
  }

  async handleSeed(payload: { companyId: number }): Promise<IApiResponse> {
    try {
      const result = await this.service.seedDefaultGroups(payload.companyId);
      const data = await this.service.list(payload.companyId);
      const message =
        result.created === 0 && result.restored === 0
          ? 'Default chart of accounts is already up to date.'
          : `Loaded ${result.created} group(s).`;
      return { success: true, data, message };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to load default chart of accounts') };
    }
  }
}
