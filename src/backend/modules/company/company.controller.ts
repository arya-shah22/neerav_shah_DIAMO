// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Company Controller Backend
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { CompanyService } from './company.service';
import { IApiResponse } from '../../../shared/types/common.types';

@Injectable()
@Controller()
export class CompanyController {
  @Inject(CompanyService)
  private readonly companyService!: CompanyService;

  async handleList(): Promise<IApiResponse> {
    try {
      const data = await this.companyService.list();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch companies',
      };
    }
  }

  async handleListStates(): Promise<IApiResponse> {
    try {
      const data = await this.companyService.listStates();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch state codes',
      };
    }
  }

  async handleGet(id: number): Promise<IApiResponse> {
    try {
      const data = await this.companyService.get(id);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch company details',
      };
    }
  }

  async handleCreate(payload: any): Promise<IApiResponse> {
    try {
      const data = await this.companyService.create(payload);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create company',
      };
    }
  }

  async handleUpdate(payload: { id: number; data: any }): Promise<IApiResponse> {
    try {
      const data = await this.companyService.update(payload.id, payload.data);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update company',
      };
    }
  }

  async handleDelete(id: number): Promise<IApiResponse> {
    try {
      await this.companyService.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete company',
      };
    }
  }
}
