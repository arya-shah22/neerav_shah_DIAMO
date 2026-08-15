#!/usr/bin/env node
/*
 * fetch-mysql.js — download-on-build for the bundled MySQL server.
 *
 * DIAMO ERP ships a self-contained MySQL 9.1 server (resources/bin/mysql) so the
 * app runs on PCs without WAMP/XAMPP. Those binaries are ~83 MB and are NOT kept
 * in git. This script fetches the official MySQL Community ZIP, verifies it, and
 * lays down the minimal runtime — run automatically before the packaged build.
 *
 * It is idempotent: if a verified bundle is already present it does nothing, so
 * local dev machines that already have the binaries never re-download.
 *
 * Windows x64 only (the app's build target). On other platforms it no-ops so a
 * non-Windows checkout of the repo doesn't fail here.
 *
 * Security: the download is pinned two independent ways — the ZIP's published
 * MD5, and the SHA-256 of the exact mysqld.exe / errmsg.sys we validated. If
 * either mismatches, the script aborts and removes the partial bundle.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DEST = path.join(ROOT, 'resources', 'bin', 'mysql');
const MYSQLD = path.join(DEST, 'bin', 'mysqld.exe');
const ERRMSG = path.join(DEST, 'share', 'english', 'errmsg.sys');

const MYSQL_VERSION = '9.1.0';
const ZIP_NAME = `mysql-${MYSQL_VERSION}-winx64.zip`;
// Official MySQL CDN. The archives "/get/p/.../file/" redirector returns 403 to
// non-browser clients (anti-bot gate); the CDN path serves the file directly.
const ZIP_URL = `https://cdn.mysql.com/archives/mysql-9.1/${ZIP_NAME}`;
const INNER_DIR = `mysql-${MYSQL_VERSION}-winx64`; // top-level folder inside the zip

// Integrity pins.
const ZIP_MD5 = '0a2333afc4ef07471bda89232697698e'; // MySQL archive page
const MYSQLD_SHA256 = '582dfe746cafe923ff9add5f4dd30048f860a3b95dc4ac71d08e6b21597a5007';
const ERRMSG_SHA256 = 'c305f34e3256d1899a0f40a23e5c053c64b1727fe34de466024d400fad26dba5';

// VC++ runtime DLLs — the MySQL zip does not include these, and a clean PC
// without WAMP/the VC++ redistributable cannot start mysqld without them.
const VC_DLLS = ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll'];

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

/** True when a bundle is already present and matches the pinned hashes. */
function alreadyValid() {
  if (!fs.existsSync(MYSQLD) || !fs.existsSync(ERRMSG)) return false;
  return sha256(MYSQLD) === MYSQLD_SHA256 && sha256(ERRMSG) === ERRMSG_SHA256;
}

/** Download with cross-host redirect following. */
function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error('Too many redirects'));
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { 'User-Agent': 'diamo-erp-build/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          file.close();
          const next = new URL(res.headers.location, url).toString();
          return resolve(download(next, dest, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          file.close();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const total = Number(res.headers['content-length'] || 0);
        let seen = 0;
        let lastPct = -10;
        res.on('data', (chunk) => {
          seen += chunk.length;
          if (total) {
            const pct = Math.floor((seen / total) * 100);
            if (pct >= lastPct + 10) {
              lastPct = pct;
              process.stdout.write(`  downloading ${ZIP_NAME}: ${pct}%\r`);
            }
          }
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => { process.stdout.write('\n'); resolve(); }));
      })
      .on('error', (err) => {
        file.close();
        fs.rmSync(dest, { force: true });
        reject(err);
      });
  });
}

/**
 * Extract a .zip on Windows. Must use bsdtar (System32\tar.exe) or PowerShell —
 * the GNU `tar` that ships with Git Bash cannot read ZIP archives at all and is
 * often first on PATH, so we never rely on a bare `tar`.
 */
function extractZip(zipPath, outDir) {
  const winTar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  if (fs.existsSync(winTar)) {
    execFileSync(winTar, ['-xf', zipPath, '-C', outDir], { stdio: 'inherit' });
    return;
  }
  // Fallback for stripped-down Windows without bsdtar.
  execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${outDir}' -Force`],
    { stdio: 'inherit' }
  );
}

function copyRuntimeBinaries(extractedRoot) {
  const srcBin = path.join(extractedRoot, 'bin');
  const dstBin = path.join(DEST, 'bin');
  fs.mkdirSync(dstBin, { recursive: true });

  // mysqld.exe + runtime DLLs (skip client tools, .pdb debug symbols, .lib files)
  fs.copyFileSync(path.join(srcBin, 'mysqld.exe'), path.join(dstBin, 'mysqld.exe'));
  for (const entry of fs.readdirSync(srcBin)) {
    if (entry.toLowerCase().endsWith('.dll') && !/debug/i.test(entry)) {
      fs.copyFileSync(path.join(srcBin, entry), path.join(dstBin, entry));
    }
  }

  // share/ (error messages + charsets) and lib/private (ICU data) — required.
  fs.cpSync(path.join(extractedRoot, 'share'), path.join(DEST, 'share'), { recursive: true });
  const libPrivate = path.join(extractedRoot, 'lib', 'private');
  if (fs.existsSync(libPrivate)) {
    fs.cpSync(libPrivate, path.join(DEST, 'lib', 'private'), { recursive: true });
  }

  // VC++ runtime DLLs from the build machine's System32.
  const sys32 = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32');
  for (const dll of VC_DLLS) {
    const src = path.join(sys32, dll);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dstBin, dll));
    else console.warn(`  WARNING: ${dll} not found in System32 — clean PCs may fail to start mysqld`);
  }
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('[fetch-mysql] Non-Windows platform — skipping (bundle is Windows-only).');
    return;
  }
  if (alreadyValid()) {
    console.log('[fetch-mysql] Verified MySQL bundle already present — skipping download.');
    return;
  }

  console.log(`[fetch-mysql] Preparing bundled MySQL ${MYSQL_VERSION}...`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'diamo-mysql-'));
  const zipPath = path.join(tmp, ZIP_NAME);
  try {
    console.log(`[fetch-mysql] Downloading ${ZIP_URL}`);
    await download(ZIP_URL, zipPath);

    const gotMd5 = md5(zipPath);
    if (gotMd5 !== ZIP_MD5) {
      throw new Error(`ZIP MD5 mismatch: expected ${ZIP_MD5}, got ${gotMd5}`);
    }
    console.log('[fetch-mysql] ZIP MD5 verified.');

    console.log('[fetch-mysql] Extracting...');
    extractZip(zipPath, tmp);

    const extractedRoot = path.join(tmp, INNER_DIR);
    if (!fs.existsSync(path.join(extractedRoot, 'bin', 'mysqld.exe'))) {
      throw new Error(`Expected ${path.join(INNER_DIR, 'bin', 'mysqld.exe')} in the archive`);
    }

    // Fresh bundle dir.
    fs.rmSync(DEST, { recursive: true, force: true });
    fs.mkdirSync(DEST, { recursive: true });
    copyRuntimeBinaries(extractedRoot);

    // Post-extract integrity: pin the exact validated binaries.
    const mysqldHash = sha256(MYSQLD);
    const errmsgHash = sha256(ERRMSG);
    if (mysqldHash !== MYSQLD_SHA256) {
      throw new Error(`mysqld.exe SHA-256 mismatch: expected ${MYSQLD_SHA256}, got ${mysqldHash}`);
    }
    if (errmsgHash !== ERRMSG_SHA256) {
      throw new Error(`errmsg.sys SHA-256 mismatch: expected ${ERRMSG_SHA256}, got ${errmsgHash}`);
    }

    const sizeMb = (
      fs.readdirSync(DEST, { recursive: true })
        .map((f) => path.join(DEST, f))
        .filter((f) => fs.statSync(f).isFile())
        .reduce((sum, f) => sum + fs.statSync(f).size, 0) / (1024 * 1024)
    ).toFixed(1);
    console.log(`[fetch-mysql] Bundle ready and verified (${sizeMb} MB) at resources/bin/mysql`);
  } catch (err) {
    // Never leave a half-written / unverified bundle behind.
    fs.rmSync(DEST, { recursive: true, force: true });
    console.error(`[fetch-mysql] FAILED: ${err.message}`);
    process.exit(1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
