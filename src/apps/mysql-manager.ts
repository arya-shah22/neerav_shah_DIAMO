// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Embedded Portable Database Manager
// ═══════════════════════════════════════════════════════════════
import fs from 'fs';
import net from 'net';
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
  const isDev = !app.isPackaged;
  const baseDir = isDev ? process.cwd() : app.getPath('userData');
  const dir = path.join(baseDir, 'Database');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function loadDatabaseConfig(): IDatabaseConfig {
  const configPath = getDatabaseConfigPath();
  const isDev = !app.isPackaged;

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
  if (process.platform === 'win32') {
    return `mysql://${userPass}@127.0.0.1:${config.hostPort}/${config.dbName}`;
  }
  return `mysql://${userPass}@localhost/${config.dbName}?socket=/tmp/mysql_diamo.sock`;
}

/** Resolve a single-`*` path pattern against the filesystem (e.g. wamp64/bin/mysql/*\/bin/mysqld.exe). */
function expandGlob(pattern: string): string[] {
  const star = pattern.indexOf('*');
  if (star === -1) return fs.existsSync(pattern) ? [pattern] : [];

  const sep = process.platform === 'win32' ? '\\' : '/';
  const parent = pattern.slice(0, pattern.lastIndexOf(sep, star));
  const rest = pattern.slice(pattern.indexOf(sep, star) + 1);
  try {
    return fs
      .readdirSync(parent)
      .map((entry) => path.join(parent, entry, rest))
      .filter((candidate) => fs.existsSync(candidate));
  } catch {
    return [];
  }
}

/**
 * Locate a mysqld binary: the bundled copy first, then common system installs.
 * Version directories are globbed rather than hardcoded — pinning exact versions
 * (e.g. mysql8.0.36) misses real installs such as WAMP's mysql9.1.0.
 */
export function findMysqldBinary(): string | null {
  const exe = process.platform === 'win32' ? 'mysqld.exe' : 'mysqld';
  const patterns = [
    path.join(process.resourcesPath || '', 'bin', 'mysql', exe),
    path.join(app.getAppPath(), 'resources', 'bin', 'mysql', exe),
    ...(process.platform === 'win32'
      ? [
          `C:\\Program Files\\MySQL\\*\\bin\\${exe}`,
          `C:\\Program Files\\MariaDB*\\bin\\${exe}`,
          `C:\\xampp\\mysql\\bin\\${exe}`,
          `C:\\wamp64\\bin\\mysql\\*\\bin\\${exe}`,
          `C:\\wamp64\\bin\\mariadb\\*\\bin\\${exe}`,
        ]
      : ['/opt/homebrew/bin/mysqld', '/usr/local/bin/mysqld', '/usr/sbin/mysqld']),
  ];

  for (const pattern of patterns) {
    const [found] = expandGlob(pattern);
    if (found) return found;
  }
  return null;
}

/** Resolve true once something accepts a TCP connection on host:port. */
function isPortOpen(host: string, port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

export async function ensureEmbeddedMySQLRunning(config: IDatabaseConfig): Promise<boolean> {
  if (config.role === 'CLIENT') {
    console.log('[MySQLManager] Running in CLIENT mode — relying on Host PC database at:', config.hostIp);
    return true;
  }

  const dataDir = getDatabaseDataDir();
  console.log('[MySQLManager] Running in HOST mode — Database data folder at:', dataDir);

  // A server may already be listening (a MySQL/MariaDB Windows service, XAMPP or
  // WAMP started by the user). Reuse it rather than spawning a second server that
  // would only fail to bind the port.
  if (await isPortOpen('127.0.0.1', config.hostPort)) {
    console.log(`[MySQLManager] A database server is already listening on port ${config.hostPort} — reusing it`);
    return true;
  }

  const mysqldBin = findMysqldBinary();

  if (!mysqldBin) {
    console.error('[MySQLManager] No mysqld binary found and nothing is listening on port', config.hostPort);
    return false;
  }
  console.log('[MySQLManager] Using mysqld binary at:', mysqldBin);

  // Initialize data directory if empty
  try {
    const files = fs.readdirSync(dataDir);
    if (files.length === 0) {
      console.log('[MySQLManager] Initializing empty Database data folder at:', dataDir);
      const { spawnSync } = require('child_process');
      spawnSync(mysqldBin, [`--initialize-insecure`, `--datadir=${dataDir}`], { stdio: 'inherit' });
    }
  } catch (initErr) {
    console.error('[MySQLManager] Error initializing Database folder:', initErr);
  }

  try {
    console.log('[MySQLManager] Launching embedded mysqld process from:', mysqldBin);
    // NOTE: --skip-grant-tables must NOT be used here. MySQL 8 silently turns on
    // --skip-networking alongside it, so the server comes up with "port: 0" and
    // refuses every TCP connection — while we connect over TCP on 127.0.0.1.
    // --initialize-insecure already creates root with an empty password, which is
    // what the default connection string expects.
    const mysqldArgs = [
      `--datadir=${dataDir}`,
      `--port=${config.hostPort}`,
      '--mysqlx=OFF',
      '--bind-address=0.0.0.0',
    ];

    if (process.platform !== 'win32') {
      mysqldArgs.push('--socket=/tmp/mysql_diamo.sock');
    }

    mysqlProcess = spawn(mysqldBin, mysqldArgs, {
      detached: false,
      stdio: 'ignore',
    });

    mysqlProcess.on('error', (err) => {
      console.error('[MySQLManager] Embedded mysqld process error:', err);
    });

    mysqlProcess.on('exit', (code, signal) => {
      console.log(`[MySQLManager] Embedded mysqld process exited with code ${code}, signal ${signal}`);
      mysqlProcess = null;
    });

    // Poll until the server accepts connections. A fixed short delay is not
    // enough: a freshly initialized data directory can take many seconds.
    for (let attempt = 0; attempt < 60; attempt++) {
      if (await isPortOpen('127.0.0.1', config.hostPort)) {
        console.log(`[MySQLManager] mysqld is accepting connections on port ${config.hostPort}`);
        return true;
      }
      if (!mysqlProcess) break; // process exited — stop waiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.error(`[MySQLManager] mysqld did not start listening on port ${config.hostPort}`);
    return false;
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
