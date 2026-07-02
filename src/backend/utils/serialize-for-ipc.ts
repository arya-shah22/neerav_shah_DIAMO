// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Serialize Prisma models for Electron IPC
// Prisma Decimal and Date objects cannot be structured-cloned.
// ═══════════════════════════════════════════════════════════════

import { Prisma } from '@prisma/client';

export function serializeForIpc<T>(value: T): T {
  return serializeValue(value) as T;
}

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'bigint') return Number(value);

  if (value instanceof Date) return value.toISOString();

  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();

  if (Array.isArray(value)) return value.map(serializeValue);

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      out[key] = serializeValue(record[key]);
    }
    return out;
  }

  return value;
}
