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
        await prisma.$executeRawUnsafe(statement);
      }
      console.log('[DbBootstrap] Schema applied');
    } else {
      console.log(`[DbBootstrap] Schema already present (${tableCount} tables)`);
    }

    // ─── 3. Seed reference data + Super Admin ───────────────
    await seedReferenceData(prisma);
    console.log('[DbBootstrap] Database is ready');
  } finally {
    await prisma.$disconnect();
  }
}
