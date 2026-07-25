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
  separator?: string;
}

export function formatStockIdNumber(
  sequence: number,
  config: StockIdConfig = {},
  year = new Date().getFullYear(),
): string {
  const prefix = config.prefix ?? DEFAULT_PREFIX;
  const seqLen = config.sequenceLength ?? SEQUENCE_LENGTH;
  const separator = config.separator ?? '-';
  const padded = String(sequence).padStart(seqLen, '0');
  if (config.includeYear !== false) {
    return `${prefix}${separator}${year}${separator}${padded}`;
  }
  return `${prefix}${separator}${padded}`;
}

export async function generateStockIdNumber(
  prisma: PrismaClient,
  companyId: number,
  config: StockIdConfig = {},
  financialYearId?: number,
): Promise<string> {
  let year = new Date().getFullYear();
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({ where: { id: financialYearId } });
    if (fy) {
      year = fy.fromDate.getFullYear();
    }
  }

  // Load configuration from database if not explicitly provided
  let activeConfig = { ...config };
  if (!config.prefix && config.includeYear === undefined && !config.sequenceLength && !config.separator) {
    const dbConfig = await prisma.voucherNumberConfig.findFirst({
      where: {
        companyId,
        voucherType: 'STOCK_ENTRY',
      },
    });
    if (dbConfig) {
      activeConfig = {
        prefix: dbConfig.prefix ?? undefined,
        includeYear: dbConfig.includeYear,
        sequenceLength: dbConfig.digitLength,
        separator: dbConfig.separator,
      };
    }
  }

  const prefix = activeConfig.prefix ?? DEFAULT_PREFIX;
  const separator = activeConfig.separator ?? '-';
  const pattern = activeConfig.includeYear !== false ? `${prefix}${separator}${year}${separator}` : `${prefix}${separator}`;

  // Concurrency-safe Sequence Generation: Query max sequence with row-level lock or raw SQL FOR UPDATE
  let nextSequence = 1;
  try {
    const rawResult: Array<{ stock_id_number: string }> = await (prisma as any).$queryRawUnsafe(
      `SELECT stock_id_number FROM stock_packets WHERE company_id = ? AND stock_id_number LIKE ? ORDER BY id DESC FOR UPDATE`,
      companyId,
      `${pattern}%`
    );

    if (rawResult && rawResult.length > 0) {
      let maxSeq = 0;
      for (const item of rawResult) {
        if (!item.stock_id_number) continue;
        const segment = item.stock_id_number.slice(pattern.length);
        const parsed = parseInt(segment, 10);
        if (!Number.isNaN(parsed) && /^\d+$/.test(segment)) {
          if (parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }
      nextSequence = maxSeq + 1;
    }
  } catch (err) {
    // Fallback if raw query is not supported in current tx context
    const existing = await prisma.stockPacket.findMany({
      where: {
        companyId,
        stockIdNumber: { startsWith: pattern },
      },
      select: { stockIdNumber: true },
    });

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
  }

  return formatStockIdNumber(nextSequence, activeConfig, year);
}

export async function previewNextStockIdNumber(
  prisma: PrismaClient,
  companyId: number,
  config: StockIdConfig = {},
  financialYearId?: number,
): Promise<string> {
  return generateStockIdNumber(prisma, companyId, config, financialYearId);
}
