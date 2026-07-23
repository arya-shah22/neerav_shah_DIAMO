// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — System Preferences Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ISystemPreferences, DEFAULT_SYSTEM_PREFERENCES } from '../../../shared/types/preferences.types';

@Injectable()
export class PreferencesService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  // Retrieve current system preferences
  async getSettings(companyId: number): Promise<ISystemPreferences> {
    const record = await this.prisma.systemSetting.findFirst({
      where: { companyId, settingKey: 'SYSTEM_PREFERENCES' },
    });

    if (!record || !record.settingValue) {
      return DEFAULT_SYSTEM_PREFERENCES;
    }

    return record.settingValue as unknown as ISystemPreferences;
  }

  // Save or update system preferences
  async saveSettings(companyId: number, settings: ISystemPreferences, userId?: number): Promise<{ message: string }> {
    // Keep date format locked to DD-MM-YYYY
    const finalSettings = {
      ...settings,
      dateFormat: 'DD-MM-YYYY',
    };

    await this.prisma.systemSetting.upsert({
      where: {
        companyId_settingKey: {
          companyId,
          settingKey: 'SYSTEM_PREFERENCES',
        },
      },
      update: {
        settingValue: finalSettings as any,
        updatedBy: userId,
      },
      create: {
        companyId,
        settingKey: 'SYSTEM_PREFERENCES',
        settingValue: finalSettings as any,
        category: 'SYSTEM',
        description: 'System Preferences (Date and Time Display Formats)',
        updatedBy: userId,
      },
    });

    return { message: 'System preferences saved successfully' };
  }
}
