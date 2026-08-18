// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — First-Run Database Bootstrap
// ═══════════════════════════════════════════════════════════════
// A fresh install points at a MySQL server that has no DIAMO database at all.
// Nothing else in the app creates it: there are no Prisma migrations shipped and
// prisma/seed.ts is a developer script that never runs in the packaged app. So
// on first launch this module creates the database, applies the schema and
// seeds the reference data + Super Admin, leaving the app actually usable.
//
// Runs on the HOST machine only — a CLIENT workstation must never write schema
// to the shared database it connects to.
// ═══════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { STATE_CODES, HSN_CODES, DEFAULT_ADMIN } from '../shared/constants/seed-data';

/** schema.sql is shipped via extraResources when packaged; read from prisma/ in dev. */
function resolveSchemaSqlPath(): string | null {
  const candidates = [
    path.join(process.resourcesPath || '', 'schema.sql'),
    path.join(app.getAppPath(), 'prisma', 'schema.sql'),
    path.join(process.cwd(), 'prisma', 'schema.sql'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/**
 * Split the generated DDL into individual statements.
 * Safe here because a Prisma-generated schema contains only CREATE TABLE and
 * ALTER TABLE — no stored procedures, triggers or DELIMITER blocks.
 */
function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*$/m)
    .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
    .filter((statement) => statement.length > 0);
}

/**
 * Force every CREATE TABLE onto InnoDB. The app requires transactions, foreign
 * keys and row locking (all the voucher/stock atomic-sequence logic depends on
 * them) — MyISAM silently provides none of these. Because a client PC's MySQL
 * may default to MyISAM (WAMP does), we cannot rely on the server default: we
 * make the engine explicit. Setting it per-statement (rather than a SET SESSION
 * default_storage_engine) is deliberate — Prisma runs statements over a pool, so
 * a session variable would not reliably apply to each CREATE. Statements that
 * already name an engine are left untouched.
 */
function forceInnoDb(statement: string): string {
  if (!/^\s*CREATE TABLE/i.test(statement) || /\bENGINE\s*=/i.test(statement)) {
    return statement;
  }
  // Insert ENGINE=InnoDB right after the closing paren of the column list.
  const closeParen = statement.lastIndexOf(')');
  if (closeParen === -1) return statement;
  return `${statement.slice(0, closeParen + 1)} ENGINE=InnoDB${statement.slice(closeParen + 1)}`;
}

async function seedReferenceData(prisma: PrismaClient): Promise<void> {
  for (const state of STATE_CODES) {
    await prisma.stateCode.upsert({
      where: { stateCode: state.code },
      update: { stateName: state.name },
      create: { stateCode: state.code, stateName: state.name },
    });
  }

  for (const hsn of HSN_CODES) {
    await prisma.hsnCode.upsert({
      where: { hsnCode: hsn.code },
      update: { description: hsn.description, gstPct: hsn.gstPct },
      create: { hsnCode: hsn.code, description: hsn.description, gstPct: hsn.gstPct },
    });
  }

  // Clean up legacy pre-seeded default codes if not linked to any active quality
  try {
    const defaultCodeSet = new Set(HSN_CODES.map((h) => h.code));
    const legacySeedCodes = ['71023920', '71023930', '71042000', '71042010', '71031000', '71039100', '71131110', '71131120', '71131910', '7113'];
    for (const oldCode of legacySeedCodes) {
      if (!defaultCodeSet.has(oldCode)) {
        const isUsed = await prisma.quality.findFirst({ where: { hsnNumber: oldCode, isDeleted: false } });
        if (!isUsed) {
          await prisma.hsnCode.deleteMany({ where: { hsnCode: oldCode } });
        }
      }
    }
  } catch (_cleanupErr) {}

  // Ensure new optional columns exist on qualities table for existing installations
  try {
    const cols = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_name = 'qualities' AND column_name IN ('declaration_text', 'terms_conditions')`
    );
    const existingCols = new Set(cols.map((c) => c.COLUMN_NAME.toLowerCase()));
    if (!existingCols.has('declaration_text')) {
      await prisma.$executeRawUnsafe('ALTER TABLE `qualities` ADD COLUMN `declaration_text` TEXT NULL');
    }
    if (!existingCols.has('terms_conditions')) {
      await prisma.$executeRawUnsafe('ALTER TABLE `qualities` ADD COLUMN `terms_conditions` TEXT NULL');
    }
  } catch (colErr) {
    // Ignore schema update errors if information_schema query is restricted
  }

  // Only create the Super Admin when there is no user at all. Upserting would
  // reset a real administrator's password back to the default on every launch.
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    await prisma.user.create({
      data: {
        userIdHandle: DEFAULT_ADMIN.userIdHandle,
        passwordHash: await bcrypt.hash(DEFAULT_ADMIN.password, 12),
        fullName: DEFAULT_ADMIN.fullName,
        email: DEFAULT_ADMIN.email,
        isSuperAdmin: true,
        status: 'ACTIVE',
      },
    });
    console.log(`[DbBootstrap] Created Super Admin "${DEFAULT_ADMIN.userIdHandle}"`);
  }
}

/**
 * Ensure the configured database exists, has the schema applied and is seeded.
 * Idempotent: on an already-provisioned database this only re-upserts the
 * reference tables. Throws if the database could not be made usable.
 */
export async function ensureDatabaseReady(databaseUrl: string): Promise<void> {
  const parsed = new URL(databaseUrl);
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'diamo_db';

  if (!/^[A-Za-z0-9_$]+$/.test(dbName)) {
    throw new Error(`Refusing to use unsafe database name: ${dbName}`);
  }

  // ─── 1. Create the database ───────────────────────────────
  // Prisma must connect to an existing database, so go via the built-in `mysql`
  // one, which is always present.
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/mysql';
  const adminClient = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    await adminClient.$executeRawUnsafe(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[DbBootstrap] Database "${dbName}" is present`);
  } finally {
    await adminClient.$disconnect();
  }

  // ─── 2. Apply the schema when the database is empty ───────
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
      'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ?',
      dbName
    );
    const tableCount = Number(rows?.[0]?.c ?? 0);

    if (tableCount === 0) {
      const schemaPath = resolveSchemaSqlPath();
      if (!schemaPath) {
        throw new Error('schema.sql not found — cannot create the database schema');
      }

      const statements = splitSqlStatements(fs.readFileSync(schemaPath, 'utf-8'));
      console.log(`[DbBootstrap] Empty database — applying ${statements.length} schema statements`);
      for (const statement of statements) {
        await prisma.$executeRawUnsafe(forceInnoDb(statement));
      }
      console.log('[DbBootstrap] Schema applied');
    } else {
      console.log(`[DbBootstrap] Schema already present (${tableCount} tables)`);
    }

    // ─── 3. Seed reference data + Super Admin ───────────────
    await seedReferenceData(prisma);

    // ─── 4. Open LAN access for CLIENT PCs ───────────────────
    // The bundled MySQL is initialized with only `<user>@localhost`, so a CLIENT
    // PC connecting over the LAN is rejected at authentication with error 1130
    // ("Host '<name>' is not allowed to connect to this MySQL server") — even
    // though mysqld binds 0.0.0.0 and the port is reachable. Create a matching
    // `<user>@'%'` account so clients using the same credentials can connect.
    // Non-fatal: a failure here only affects multi-PC (HOST/CLIENT) use.
    try {
      const dbUser = decodeURIComponent(parsed.username) || 'root';
      const dbPass = decodeURIComponent(parsed.password);
      await ensureLanAccess(prisma, dbUser, dbPass);
      console.log(`[DbBootstrap] LAN access ensured for '${dbUser}'@'%'`);
    } catch (lanErr) {
      console.warn('[DbBootstrap] Could not ensure LAN access — CLIENT PCs may fail to connect:', lanErr);
    }

    console.log('[DbBootstrap] Database is ready');
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Create/refresh a `<user>@'%'` account so CLIENT PCs on the LAN can authenticate
 * against this HOST's MySQL. Runs as the local root, which holds the global
 * privileges needed for CREATE USER / GRANT. Idempotent — safe on every launch.
 *
 * SECURITY NOTE: this mirrors the host's own credentials. With the default
 * root/empty-password setup that means any device on the LAN can connect as root
 * with no password. That matches the app's existing single-trusted-LAN model;
 * set a database password in setup to lock it down.
 */
async function ensureLanAccess(prisma: PrismaClient, dbUser: string, dbPass: string): Promise<void> {
  const u = dbUser.replace(/'/g, "''");
  const p = dbPass.replace(/'/g, "''");
  await prisma.$executeRawUnsafe(`CREATE USER IF NOT EXISTS '${u}'@'%' IDENTIFIED BY '${p}'`);
  await prisma.$executeRawUnsafe(`ALTER USER '${u}'@'%' IDENTIFIED BY '${p}'`);
  await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON *.* TO '${u}'@'%' WITH GRANT OPTION`);
  await prisma.$executeRawUnsafe('FLUSH PRIVILEGES');
}
