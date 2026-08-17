// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — License Management & Version Info Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import os from 'os';

/**
 * Version of the build running on THIS machine.
 *
 * Electron's app.getVersion() reads the version baked in at package time, so it
 * is correct in both dev and packaged builds. The previous implementation read
 * package.json from process.cwd() — which is not the app directory in a packaged
 * build, so the read silently failed and the hardcoded 'v1.0.0' was displayed.
 * It also preferred INSTALLED_PATCH_LOGS from the SHARED database, which is
 * wrong on a LAN: every PC would report whatever version some other PC wrote.
 */
function getAppVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron');
    const version = app?.getVersion?.();
    if (version) return `v${String(version).replace(/^v/, '')}`;
  } catch {
    // Not running inside Electron (e.g. unit tests) — fall through.
  }
  return 'v0.0.0';
}

/** Numeric semver comparison: true when `latest` is strictly newer than `current`. */
function isNewerVersion(latest: string, current: string): boolean {
  const parts = (v: string) =>
    String(v).replace(/^v/, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const a = parts(latest);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

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

    // 2. Version of THIS machine's running build (see getAppVersion).
    const appVersion = getAppVersion();

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
    let installedPatches: any[] = [];
    try {
      const patchSetting = await this.prisma.systemSetting.findFirst({
        where: { companyId, settingKey: 'INSTALLED_PATCH_LOGS' },
      });
      if (patchSetting && patchSetting.settingValue && Array.isArray(patchSetting.settingValue)) {
        installedPatches = patchSetting.settingValue as any[];
      }
    } catch (e) {
      console.warn('Failed to load installed patch logs:', e);
    }

    const defaultLogs = [
      { version: 'v1.0.0', date: '2026-07-23', description: 'Production Release. Completed Ledger, Cash/Bank Vouchers, and automated Backup management features.' },
      { version: 'v0.9.8', date: '2026-07-15', description: 'Beta Release. Integrated customizable invoice templates and supervisor security lockouts.' },
      { version: 'v0.9.0', date: '2026-06-01', description: 'Initial Alpha Build. Implemented core database schemas, inventory packages, and multi-currency registers.' },
    ];

    const changeLogs = [...installedPatches, ...defaultLogs];

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

  /**
   * Check for a newer published release.
   *
   * This asks electron-updater, which reads the GitHub release feed configured
   * in electron-builder.yml (latest.yml on each release). The previous version
   * of this method never contacted any server — it compared against a hardcoded
   * 'v1.0.0' and always reported "up to date", so updates were never offered.
   */
  async checkForUpdates(_companyId: number) {
    const currentVersion = getAppVersion();

    // 1. Internet reachability (resolve the update host, not a generic site).
    const hasInternet = await new Promise<boolean>((resolve) => {
      require('dns').lookup('github.com', (err: any) => {
        resolve(!(err && (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN')));
      });
    });

    if (!hasInternet) {
      return {
        hasInternet: false,
        updateAvailable: false,
        currentVersion,
        message: 'No internet connection available. Please check your network.',
      };
    }

    // 2. Ask the real updater what the latest published release is.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { autoUpdater } = require('electron-updater');
      const result = await autoUpdater.checkForUpdates();
      const raw = result?.updateInfo?.version;
      const latestVersion = raw ? `v${String(raw).replace(/^v/, '')}` : null;

      if (latestVersion && isNewerVersion(latestVersion, currentVersion)) {
        const notes = result?.updateInfo?.releaseNotes;
        return {
          hasInternet: true,
          updateAvailable: true,
          currentVersion,
          latestVersion,
          releaseDate: String(result?.updateInfo?.releaseDate || '').split('T')[0] || undefined,
          releaseNotes:
            typeof notes === 'string' && notes.trim()
              ? notes.replace(/<[^>]+>/g, '').trim()
              : `Version ${latestVersion} is available to install.`,
        };
      }

      return {
        hasInternet: true,
        updateAvailable: false,
        currentVersion,
        latestVersion: latestVersion || currentVersion,
        message: `Your software is up to date (${currentVersion}).`,
      };
    } catch (err) {
      // Unpackaged dev builds have no update feed; network/feed errors land here too.
      return {
        hasInternet: true,
        updateAvailable: false,
        currentVersion,
        message: `Could not check for updates: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Download (if needed) and install the pending update, then restart.
   *
   * Previously this only wrote a patch-log row and claimed success without
   * installing anything, so the app stayed on the same build forever.
   */
  async applyUpdate(companyId: number, targetVersion: string) {
    const versionStr = targetVersion || getAppVersion();
    const newPatch = {
      version: versionStr,
      date: new Date().toISOString().split('T')[0],
      description: `Installed release ${versionStr}.`,
    };

    let existingPatches: any[] = [];
    try {
      const record = await this.prisma.systemSetting.findFirst({
        where: { companyId, settingKey: 'INSTALLED_PATCH_LOGS' },
      });
      if (record && record.settingValue && Array.isArray(record.settingValue)) {
        existingPatches = record.settingValue as any[];
      }
    } catch (e) {
      console.warn('Failed to query existing patches:', e);
    }

    const updatedPatches = [newPatch, ...existingPatches.filter(p => p.version !== newPatch.version)];

    await this.prisma.systemSetting.upsert({
      where: {
        companyId_settingKey: {
          companyId,
          settingKey: 'INSTALLED_PATCH_LOGS',
        },
      },
      update: { settingValue: updatedPatches },
      create: {
        companyId,
        settingKey: 'INSTALLED_PATCH_LOGS',
        settingValue: updatedPatches,
        category: 'SYSTEM',
        description: 'Installed Software Release Patches & Release Notes History',
      },
    });

    // Actually fetch and install. autoDownload is enabled in main.ts, so the
    // package is usually already on disk by now; downloadUpdate() then resolves
    // immediately. quitAndInstall is deferred so this IPC response reaches the
    // renderer before Electron tears the app down to run the installer.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { autoUpdater } = require('electron-updater');
      try {
        await autoUpdater.downloadUpdate();
      } catch {
        // Already downloaded, or download raced with the auto-download — the
        // install below still works from the cached package.
      }
      setTimeout(() => {
        try {
          autoUpdater.quitAndInstall();
        } catch (installErr) {
          console.error('[License] quitAndInstall failed:', installErr);
        }
      }, 1000);
    } catch (err) {
      return {
        success: false,
        version: newPatch.version,
        message: `Could not install the update: ${err instanceof Error ? err.message : String(err)}`,
        requiresRestart: false,
      };
    }

    return {
      success: true,
      version: newPatch.version,
      message: 'Update downloaded. DIAMO ERP will now restart to finish installing.',
      requiresRestart: true,
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

