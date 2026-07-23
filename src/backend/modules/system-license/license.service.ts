// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — License Management & Version Info Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import os from 'os';
import fs from 'fs';
import path from 'path';

@Injectable()
export class LicenseService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  // Track the last timestamp we calculated uptime delta
  private lastCheckTime = Date.now();

  async getLicenseAndAppInfo(companyId: number) {
    // 1. Fetch activation date as earliest user createdAt
    let activationDate = new Date().toISOString();
    try {
      const firstUser = await this.prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (firstUser) {
        activationDate = firstUser.createdAt.toISOString();
      }
    } catch (e) {
      console.warn('Failed to resolve first user activation date:', e);
    }

    // 2. Fetch package version dynamically
    let appVersion = 'v1.0.0';
    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        appVersion = `v${pkg.version}`;
      }
    } catch (e) {
      console.warn('Failed to parse package.json version:', e);
    }

    const licenseKey = 'DIAMO-OFFLINE-ENT-9876-5432';
    const licenseType = 'Enterprise Edition (Multi-User)';
    const registeredCompany = 'DIAMO';
    const registeredUser = 'superadmin';
    const maxCompanies = 50;
    const maxUsers = 50;
    const status = 'ACTIVE';

    // 3. Count current usage in database
    let activeUserCount = 1;
    let activeCompanyCount = 1;
    try {
      activeUserCount = await this.prisma.user.count({ where: { isDeleted: false } });
      activeCompanyCount = await this.prisma.company.count({ where: { isDeleted: false } });
    } catch (e) {
      console.warn('Failed to query resource usage counts:', e);
    }

    // 4. Calculate cumulative uptime seconds
    const now = Date.now();
    const deltaSeconds = Math.floor((now - this.lastCheckTime) / 1000);
    this.lastCheckTime = now;

    let cumulativeSeconds = 0;
    try {
      const uptimeSetting = await this.prisma.systemSetting.findFirst({
        where: { companyId, settingKey: 'CUMULATIVE_UPTIME' },
      });
      if (uptimeSetting && uptimeSetting.settingValue) {
        cumulativeSeconds = Number((uptimeSetting.settingValue as any).seconds || 0);
      }

      if (deltaSeconds > 0) {
        cumulativeSeconds += deltaSeconds;
        await this.prisma.systemSetting.upsert({
          where: {
            companyId_settingKey: {
              companyId,
              settingKey: 'CUMULATIVE_UPTIME',
            },
          },
          update: { settingValue: { seconds: cumulativeSeconds } },
          create: {
            companyId,
            settingKey: 'CUMULATIVE_UPTIME',
            settingValue: { seconds: cumulativeSeconds },
            category: 'SYSTEM',
            description: 'Cumulative usage duration in seconds',
          },
        });
      }
    } catch (e) {
      console.warn('Failed to save cumulative uptime:', e);
    }

    // 5. System Hardware Profile
    const osPlatform = `${os.type()} ${os.release()} (${os.arch()})`;
    const cpuModel = os.cpus()[0]?.model || 'Generic CPU';

    // 6. Release Patch Logs (Local Change History)
    const changeLogs = [
      { version: 'v1.0.0', date: '2026-07-23', description: 'Production Release. Completed Ledger, Cash/Bank Vouchers, and automated Backup management features.' },
      { version: 'v0.9.8', date: '2026-07-15', description: 'Beta Release. Integrated customizable invoice templates and supervisor security lockouts.' },
      { version: 'v0.9.0', date: '2026-06-01', description: 'Initial Alpha Build. Implemented core database schemas, inventory packages, and multi-currency registers.' },
    ];

    return {
      license: {
        licenseKey,
        licenseType,
        registeredCompany,
        registeredUser,
        activationDate,
        maxCompanies,
        maxUsers,
        status,
        activeUserCount,
        activeCompanyCount,
      },
      app: {
        name: 'DIAMO ERP',
        edition: 'Diamond & Precious Stones Inventory Edition',
        version: appVersion,
        buildNumber: 'B20260723-99',
        releaseDate: '2026-07-23',
        uptimeSeconds: cumulativeSeconds,
      },
      system: {
        osPlatform,
        cpuModel,
        processMemoryMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      },
      changeLogs,
    };
  }

  // Reset cumulative usage uptime seconds back to 0
  async resetCumulativeUptime(companyId: number) {
    await this.prisma.systemSetting.upsert({
      where: {
        companyId_settingKey: {
          companyId,
          settingKey: 'CUMULATIVE_UPTIME',
        },
      },
      update: { settingValue: { seconds: 0 } },
      create: {
        companyId,
        settingKey: 'CUMULATIVE_UPTIME',
        settingValue: { seconds: 0 },
        category: 'SYSTEM',
        description: 'Cumulative usage duration in seconds',
      },
    });
    this.lastCheckTime = Date.now();
    return { success: true };
  }

  // Update offline license signature key
  async updateLicenseKey(companyId: number, licenseKey: string) {
    if (!licenseKey || licenseKey.trim().length < 10) {
      throw new Error('Invalid license key format.');
    }

    const payload = {
      licenseKey,
      licenseType: 'Enterprise Edition (Multi-User)',
      registeredCompany: 'DIAMO',
      registeredUser: 'superadmin',
      activationDate: new Date().toISOString(),
      maxCompanies: 50,
      maxUsers: 50,
      status: 'ACTIVE',
    };

    await this.prisma.systemSetting.upsert({
      where: {
        companyId_settingKey: {
          companyId,
          settingKey: 'LICENSE_SETTINGS',
        },
      },
      update: { settingValue: payload },
      create: {
        companyId,
        settingKey: 'LICENSE_SETTINGS',
        settingValue: payload,
        category: 'SYSTEM',
        description: 'DIAMO Offline Activation Parameters',
      },
    });

    return payload;
  }
}
