// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — LAN Update Distribution
//
// The source repository is private, so installed apps cannot read GitHub's
// release feed (it 404s without a token). Instead the HOST PC distributes
// updates to its LAN CLIENTs: you install one installer on the HOST, publish it
// from the UI, and every CLIENT then auto-updates from the HOST over the LAN —
// no internet and no credentials required.
//
// The HOST serves an electron-updater "generic" feed (latest.yml + the NSIS
// installer) over plain HTTP on the LAN; CLIENTs point autoUpdater at it.
// ═══════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { app } from 'electron';

/** TCP port for the update feed. LAN discovery already uses UDP 41234. */
export const LAN_UPDATE_PORT = 41235;

let server: http.Server | null = null;

export function getLanUpdateDir(): string {
  const dir = path.join(app.getPath('userData'), 'lan-updates');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** electron-updater expects the sha512 digest base64-encoded, not hex. */
function sha512Base64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('base64')));
  });
}

export interface LanUpdateStatus {
  published: boolean;
  version?: string;
  fileName?: string;
  port: number;
}

/** Read whatever installer is currently published for CLIENTs. */
export function getLanUpdateStatus(): LanUpdateStatus {
  try {
    const dir = getLanUpdateDir();
    const ymlPath = path.join(dir, 'latest.yml');
    if (!fs.existsSync(ymlPath)) return { published: false, port: LAN_UPDATE_PORT };

    const yml = fs.readFileSync(ymlPath, 'utf-8');
    const version = /^version:\s*(.+)$/m.exec(yml)?.[1]?.trim();
    const fileName = /^path:\s*(.+)$/m.exec(yml)?.[1]?.trim();
    if (!version || !fileName || !fs.existsSync(path.join(dir, fileName))) {
      return { published: false, port: LAN_UPDATE_PORT };
    }
    return { published: true, version, fileName, port: LAN_UPDATE_PORT };
  } catch {
    return { published: false, port: LAN_UPDATE_PORT };
  }
}

/**
 * Publish an installer so LAN CLIENTs can update to it. Copies the .exe into the
 * served folder and writes the latest.yml manifest electron-updater requires.
 */
export async function publishUpdateToLan(sourceExePath: string): Promise<LanUpdateStatus & { message: string }> {
  if (!fs.existsSync(sourceExePath)) {
    throw new Error('Installer not found at the selected path.');
  }
  const fileName = path.basename(sourceExePath);
  if (!/\.exe$/i.test(fileName)) {
    throw new Error('Please select the Windows installer (.exe).');
  }
  // The NSIS installer is what electron-updater can install silently; the
  // portable build cannot self-update, so reject it early with a clear message.
  if (!/setup/i.test(fileName)) {
    throw new Error('Please select the "DIAMO ERP Setup <version>.exe" installer, not the portable build.');
  }
  const version = /(\d+\.\d+\.\d+)/.exec(fileName)?.[1];
  if (!version) {
    throw new Error('Could not read a version number from the installer file name.');
  }

  const dir = getLanUpdateDir();
  // Only one update is served at a time — clear out any previous one.
  for (const existing of fs.readdirSync(dir)) {
    try {
      fs.rmSync(path.join(dir, existing), { force: true });
    } catch {
      /* keep going — a stale file is replaced below anyway */
    }
  }

  // electron-updater builds download URLs from this name; spaces would need
  // escaping, so normalise to the hyphenated form electron-builder publishes.
  const servedName = fileName.replace(/\s+/g, '-');
  const destPath = path.join(dir, servedName);
  fs.copyFileSync(sourceExePath, destPath);

  const size = fs.statSync(destPath).size;
  const sha512 = await sha512Base64(destPath);
  const latestYml = [
    `version: ${version}`,
    'files:',
    `  - url: ${servedName}`,
    `    sha512: ${sha512}`,
    `    size: ${size}`,
    `path: ${servedName}`,
    `sha512: ${sha512}`,
    `releaseDate: '${new Date().toISOString()}'`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'latest.yml'), latestYml, 'utf-8');

  console.log(`[LanUpdate] Published ${servedName} (v${version}) for LAN clients`);
  return {
    published: true,
    version,
    fileName: servedName,
    port: LAN_UPDATE_PORT,
    message: `Version ${version} is now available to LAN PCs. They will update the next time they start.`,
  };
}

/** Pull a version number out of an installer file name, e.g. "...Setup 0.0.7.exe". */
function versionFromFileName(fileName: string): string | null {
  return /(\d+\.\d+\.\d+)/.exec(fileName)?.[1] ?? null;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Look for a DIAMO installer already sitting on this PC, so the HOST can share
 * an update without the user having to locate the file by hand. Checks the
 * places an installer realistically lands: Downloads, Desktop, and next to the
 * installed app. Prefers an installer matching the running version — that is
 * the build the rest of the network should converge on.
 */
export function findLocalInstaller(preferVersion?: string): string | null {
  const dirs: string[] = [];
  const safePath = (name: Parameters<typeof app.getPath>[0]) => {
    try {
      return app.getPath(name);
    } catch {
      return null;
    }
  };
  for (const name of ['downloads', 'desktop'] as const) {
    const dir = safePath(name);
    if (dir) dirs.push(dir);
  }
  try {
    dirs.push(path.dirname(app.getPath('exe')));
  } catch {
    /* not available in some environments */
  }

  const found: Array<{ file: string; version: string }> = [];
  for (const dir of dirs) {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue; // unreadable/missing folder — just skip it
    }
    for (const entry of entries) {
      // Matches both "DIAMO ERP Setup 0.0.7.exe" (local build) and
      // "DIAMO-ERP-Setup-0.0.7.exe" (published release asset).
      if (!/^diamo.*setup.*\.exe$/i.test(entry)) continue;
      const version = versionFromFileName(entry);
      if (!version) continue;
      found.push({ file: path.join(dir, entry), version });
    }
  }
  if (found.length === 0) return null;

  if (preferVersion) {
    const exact = found.find((f) => f.version === preferVersion.replace(/^v/, ''));
    if (exact) return exact.file;
  }
  found.sort((a, b) => compareVersions(b.version, a.version));
  return found[0].file;
}

/**
 * Publish automatically when an installer for the running version is already on
 * this PC. Called at HOST startup so that installing a new build is all the user
 * has to do — CLIENTs then pick it up with no further interaction.
 * Returns null when there is nothing to do.
 */
export async function autoPublishUpdate(): Promise<(LanUpdateStatus & { message: string }) | null> {
  const runningVersion = app.getVersion();
  const current = getLanUpdateStatus();
  if (current.published && current.version === runningVersion) {
    return null; // already sharing this build
  }

  const installer = findLocalInstaller(runningVersion);
  if (!installer) return null;

  const installerVersion = versionFromFileName(path.basename(installer));
  // Only auto-publish the build this HOST is actually running; anything else is
  // ambiguous and is left to the explicit "Share" action.
  if (installerVersion !== runningVersion) return null;

  try {
    return await publishUpdateToLan(installer);
  } catch (err) {
    console.warn('[LanUpdate] Auto-publish skipped:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Serve the published update to CLIENTs. HOST mode only. */
export function startLanUpdateServer(port: number = LAN_UPDATE_PORT): void {
  if (server) return;

  const dir = getLanUpdateDir();
  server = http.createServer((req, res) => {
    try {
      const requested = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
      // Serve only from the update folder — never let a path escape it.
      const target = path.resolve(dir, requested);
      if (!target.startsWith(path.resolve(dir)) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
        res.writeHead(404).end('Not found');
        return;
      }

      const size = fs.statSync(target).size;
      const range = req.headers.range;
      // electron-updater may resume downloads with a Range request.
      if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range);
        const start = match && match[1] ? parseInt(match[1], 10) : 0;
        const end = match && match[2] ? parseInt(match[2], 10) : size - 1;
        if (start >= size || end >= size || start > end) {
          res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
          return;
        }
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': 'application/octet-stream',
        });
        fs.createReadStream(target, { start, end }).pipe(res);
        return;
      }

      res.writeHead(200, {
        'Content-Length': size,
        'Accept-Ranges': 'bytes',
        'Content-Type': target.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream',
      });
      fs.createReadStream(target).pipe(res);
    } catch (err) {
      console.error('[LanUpdate] Request failed:', err);
      try {
        res.writeHead(500).end('Server error');
      } catch {
        /* response already sent */
      }
    }
  });

  server.on('error', (err) => {
    console.error('[LanUpdate] Update server error:', err);
    server = null;
  });

  server.listen(port, '0.0.0.0', () => {
    const status = getLanUpdateStatus();
    console.log(
      `[LanUpdate] Serving LAN updates on port ${port}` +
        (status.published ? ` (currently offering v${status.version})` : ' (nothing published yet)')
    );
  });
}

export function stopLanUpdateServer(): void {
  if (server) {
    try {
      server.close();
    } catch {
      /* already closing */
    }
    server = null;
  }
}
