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

// Prisma connection-pool tuning appended to every DATABASE_URL. Without an
// explicit limit Prisma defaults to num_cpus*2+1 connections, which starves
// under multi-PC (HOST + several CLIENTs) load and makes the UI hang while
// queries wait for a free connection. A larger pool + longer wait avoids that;
// 15 per app stays well under MySQL's max_connections even with several clients.
const POOL_PARAMS = 'connection_limit=15&pool_timeout=20';

export function getConnectionString(config: IDatabaseConfig): string {
  const userPass = config.dbPass ? `${config.dbUser}:${config.dbPass}` : config.dbUser;
  let url: string;
  if (config.role === 'CLIENT') {
    url = `mysql://${userPass}@${config.hostIp}:${config.hostPort}/${config.dbName}`;
  } else if (process.platform === 'win32') {
    url = `mysql://${userPass}@127.0.0.1:${config.hostPort}/${config.dbName}`;
  } else {
    url = `mysql://${userPass}@localhost/${config.dbName}?socket=/tmp/mysql_diamo.sock`;
  }
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${POOL_PARAMS}`;
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
    // Bundled MySQL ships in a standard layout: resources/bin/mysql/{bin,share}.
    // mysqld living under a `bin/` dir lets MySQL auto-detect its basedir/share.
    path.join(process.resourcesPath || '', 'bin', 'mysql', 'bin', exe),
    path.join(app.getAppPath(), 'resources', 'bin', 'mysql', 'bin', exe),
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

  // basedir = the MySQL root (parent of bin/). Passing it and the messages dir
  // explicitly means mysqld finds share/errmsg.sys and charsets no matter what
  // the process working directory is — essential for the bundled copy, which is
  // not launched from its own folder.
  const mysqlBaseDir = path.dirname(path.dirname(mysqldBin));
  const shareDir = path.join(mysqlBaseDir, 'share');
  const baseArgs = fs.existsSync(shareDir)
    ? [`--basedir=${mysqlBaseDir}`, `--lc-messages-dir=${shareDir}`]
    : [];

  // Initialize data directory if empty
  try {
    const files = fs.readdirSync(dataDir);
    if (files.length === 0) {
      console.log('[MySQLManager] Initializing empty Database data folder at:', dataDir);
      const { spawnSync } = require('child_process');
      spawnSync(mysqldBin, [...baseArgs, `--initialize-insecure`, `--datadir=${dataDir}`], { stdio: 'inherit' });
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
      ...baseArgs,
      `--datadir=${dataDir}`,
      `--port=${config.hostPort}`,
      '--mysqlx=OFF',
      '--bind-address=0.0.0.0',
      // Multi-user (HOST + LAN CLIENTs) tuning. The defaults (128 MB buffer pool)
      // are undersized once several PCs share this server, causing disk-bound
      // queries that make the host UI sluggish. These are pure-performance knobs
      // with no durability trade-off (innodb-flush-log-at-trx-commit left at its
      // safe default of 1 so no committed financial data can be lost).
      '--innodb-buffer-pool-size=512M',
      '--max-connections=200',
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
