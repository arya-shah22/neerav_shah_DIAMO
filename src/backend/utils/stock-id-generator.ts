// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock ID Number Generator
// Format: DM-YYYY-XXXXXX (per phase 12.1 / 13.3 specs)
// ═══════════════════════════════════════════════════════════════

import { PrismaService } from '../database/prisma.service';

type PrismaClient = PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

const DEFAULT_PREFIX = 'DM';
const SEQUENCE_LENGTH = 6;

export interface StockIdConfig {
  prefix?: string;
  includeYear?: boolean;
  sequenceLength?: number;
}

export function formatStockIdNumber(
  sequence: number,
  config: StockIdConfig = {},
  year = new Date().getFullYear(),
): string {
  const prefix = config.prefix ?? DEFAULT_PREFIX;
  const seqLen = config.sequenceLength ?? SEQUENCE_LENGTH;
  const padded = String(sequence).padStart(seqLen, '0');
  if (config.includeYear !== false) {
    return `${prefix}-${year}-${padded}`;
  }
  return `${prefix}-${padded}`;
}

export async function generateStockIdNumber(
  prisma: PrismaClient,
  companyId: number,
  config: StockIdConfig = {},
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = config.prefix ?? DEFAULT_PREFIX;
  const pattern = config.includeYear !== false ? `${prefix}-${year}-` : `${prefix}-`;

  const existing = await prisma.stockPacket.findMany({
    where: {
      companyId,
      stockIdNumber: { startsWith: pattern },
    },
    select: { stockIdNumber: true },
  });

  let nextSequence = 1;
  if (existing.length > 0) {
    let maxSeq = 0;
    for (const item of existing) {
      const segment = item.stockIdNumber.slice(pattern.length);
      const parsed = parseInt(segment, 10);
      if (!Number.isNaN(parsed) && /^\d+$/.test(segment)) {
        if (parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
    nextSequence = maxSeq + 1;
  }

  return formatStockIdNumber(nextSequence, config, year);
}

export async function previewNextStockIdNumber(
  prisma: PrismaClient,
  companyId: number,
  config: StockIdConfig = {},
): Promise<string> {
  return generateStockIdNumber(prisma, companyId, config);
}
