// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Print Template Service
// CRUD operations for print template layout configurations
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IPrintLayoutConfig, mergeWithDefaults, DEFAULT_LAYOUT_CONFIG } from '../../../shared/types/print-template.types';

@Injectable()
export class PrintTemplateService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  /**
   * Get the layout config for a specific voucher type.
   * Returns merged config with defaults if no record exists or if partial keys are missing.
   */
  async getTemplateConfig(companyId: number, voucherType: string): Promise<IPrintLayoutConfig> {
    const record = await this.prisma.printTemplate.findFirst({
      where: { companyId, voucherType: voucherType as any },
    });

    if (!record || !record.layoutConfig) {
      return { ...DEFAULT_LAYOUT_CONFIG };
    }

    return mergeWithDefaults(record.layoutConfig as Partial<IPrintLayoutConfig>);
  }

  /**
   * Upsert the layout config for a specific voucher type.
   * Creates a new record if none exists, otherwise updates the existing one.
   */
  async saveTemplateConfig(
    companyId: number,
    voucherType: string,
    layoutConfig: IPrintLayoutConfig,
    targetCompanyIds?: number[],
  ): Promise<{ message: string }> {
    const companyIdsToUpdate = (targetCompanyIds && targetCompanyIds.length > 0)
      ? Array.from(new Set(targetCompanyIds))
      : [companyId];

    for (const cId of companyIdsToUpdate) {
      const existing = await this.prisma.printTemplate.findFirst({
        where: { companyId: cId, voucherType: voucherType as any },
      });

      if (existing) {
        await this.prisma.printTemplate.update({
          where: { id: existing.id },
          data: {
            layoutConfig: layoutConfig as any,
          },
        });
      } else {
        await this.prisma.printTemplate.create({
          data: {
            companyId: cId,
            voucherType: voucherType as any,
            templateName: `${voucherType} Default Template`,
            isDefault: true,
            layoutConfig: layoutConfig as any,
            paperSize: 'A4',
            orientation: 'portrait',
          },
        });
      }
    }

    if (companyIdsToUpdate.length > 1) {
      return { message: `Print template layout saved for ${companyIdsToUpdate.length} firms` };
    }
    return { message: 'Print template configuration updated successfully' };
  }

  /**
   * Get all template configs for a company (for the settings sidebar status display).
   * Returns a map of voucherType → layoutConfig.
   */
  async getAllTemplates(companyId: number): Promise<Record<string, IPrintLayoutConfig>> {
    const records = await this.prisma.printTemplate.findMany({
      where: { companyId },
    });

    const result: Record<string, IPrintLayoutConfig> = {};
    for (const record of records) {
      result[record.voucherType] = mergeWithDefaults(record.layoutConfig as Partial<IPrintLayoutConfig>);
    }

    return result;
  }

  /**
   * Reset / delete the layout config for a specific voucher type.
   */
  async resetTemplateConfig(companyId: number, voucherType: string): Promise<{ message: string }> {
    await this.prisma.printTemplate.deleteMany({
      where: { companyId, voucherType: voucherType as any },
    });
    return { message: 'Print template reset to factory defaults' };
  }

  /**
   * Copy a layout config from one source voucher type to multiple target voucher types.
   */
  async copyTemplateConfig(
    companyId: number,
    _sourceVoucherType: string,
    targetVoucherTypes: string[],
    layoutConfig: IPrintLayoutConfig,
  ): Promise<{ message: string; copiedCount: number }> {
    for (const targetType of targetVoucherTypes) {
      const existing = await this.prisma.printTemplate.findFirst({
        where: { companyId, voucherType: targetType as any },
      });

      if (existing) {
        await this.prisma.printTemplate.update({
          where: { id: existing.id },
          data: { layoutConfig: layoutConfig as any },
        });
      } else {
        await this.prisma.printTemplate.create({
          data: {
            companyId,
            voucherType: targetType as any,
            templateName: `${targetType} Template`,
            isDefault: true,
            layoutConfig: layoutConfig as any,
            paperSize: 'A4',
            orientation: 'portrait',
          },
        });
      }
    }

    return {
      message: `Template layout copied to ${targetVoucherTypes.length} document type(s)`,
      copiedCount: targetVoucherTypes.length,
    };
  }
}
