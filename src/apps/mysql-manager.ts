// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Embedded Portable Database Manager
// ═══════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';

export interface IDatabaseConfig {
  role: 'HOST' | 'CLIENT';
  isConfigured: boolean;
  hostIp: string;
  hostPort: number;
  dbName: string;
  dbUser: string;
  dbPass: string;
  autoDiscover: boolean;
}

let mysqlProcess: ChildProcess | null = null;

export function getDatabaseConfigPath(): string {
  return path.join(app.getPath('userData'), 'database_config.json');
}

export function getDatabaseDataDir(): string {
  const dir = path.join(app.getPath('userData'), 'database_data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function loadDatabaseConfig(): IDatabaseConfig {
  const configPath = getDatabaseConfigPath();
  const isDev = process.env.NODE_ENV !== 'production';

  const defaultConfig: IDatabaseConfig = {
    role: 'HOST',
    isConfigured: isDev, // In development (npm run dev), auto-mark as configured so developers are never interrupted
    hostIp: '127.0.0.1',
    hostPort: 3306,
    dbName: 'diamo_db',
    dbUser: 'root',
    dbPass: '',
    autoDiscover: true,
  };

  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return { ...defaultConfig, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('[MySQLManager] Error loading database_config.json:', err);
  }

  // Save default if not exists
  saveDatabaseConfig(defaultConfig);
  return defaultConfig;
}

export function saveDatabaseConfig(config: IDatabaseConfig): void {
  try {
    const configPath = getDatabaseConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('[MySQLManager] Error saving database_config.json:', err);
  }
}

export function getConnectionString(config: IDatabaseConfig): string {
  if (config.role === 'CLIENT') {
    const userPass = config.dbPass ? `${config.dbUser}:${config.dbPass}` : config.dbUser;
    return `mysql://${userPass}@${config.hostIp}:${config.hostPort}/${config.dbName}`;
  }
  const userPass = config.dbPass ? `${config.dbUser}:${config.dbPass}` : config.dbUser;
  return `mysql://${userPass}@127.0.0.1:${config.hostPort}/${config.dbName}`;
}

export async function ensureEmbeddedMySQLRunning(config: IDatabaseConfig): Promise<boolean> {
  if (config.role === 'CLIENT') {
    console.log('[MySQLManager] Running in CLIENT mode — relying on Host PC database at:', config.hostIp);
    return true;
  }

  const dataDir = getDatabaseDataDir();
  console.log('[MySQLManager] Running in HOST mode — Database data folder at:', dataDir);

  // Look for bundled mysqld binary if available
  const possiblePaths = [
    path.join(process.resourcesPath, 'bin', 'mysql', process.platform === 'win32' ? 'mysqld.exe' : 'mysqld'),
    path.join(app.getAppPath(), 'resources', 'bin', 'mysql', process.platform === 'win32' ? 'mysqld.exe' : 'mysqld'),
  ];

  let mysqldBin: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      mysqldBin = p;
      break;
    }
  }

  if (!mysqldBin) {
    console.log('[MySQLManager] Bundled mysqld binary not found; using system database service on port 3306');
    return true;
  }

  try {
    console.log('[MySQLManager] Launching embedded mysqld process from:', mysqldBin);
    mysqlProcess = spawn(
      mysqldBin,
      [
        `--datadir=${dataDir}`,
        `--port=${config.hostPort}`,
        '--bind-address=0.0.0.0',
        '--skip-grant-tables',
      ],
      {
        detached: false,
        stdio: 'ignore',
      }
    );

    mysqlProcess.on('error', (err) => {
      console.error('[MySQLManager] Embedded mysqld process error:', err);
    });

    mysqlProcess.on('exit', (code, signal) => {
      console.log(`[MySQLManager] Embedded mysqld process exited with code ${code}, signal ${signal}`);
      mysqlProcess = null;
    });

    // Brief delay to allow mysqld socket binding
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return true;
  } catch (err) {
    console.error('[MySQLManager] Failed to launch embedded mysqld:', err);
    return false;
  }
}

export function stopEmbeddedMySQL(): void {
  if (mysqlProcess) {
    console.log('[MySQLManager] Stopping embedded mysqld process...');
    try {
      mysqlProcess.kill();
    } catch (err) {
      console.error('[MySQLManager] Error killing mysqld process:', err);
    }
    mysqlProcess = null;
  }
}
