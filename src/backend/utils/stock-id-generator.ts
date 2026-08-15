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
  includeMonth?: boolean;
  sequenceLength?: number;
  separator?: string;
}

export function formatStockIdNumber(
  sequence: number,
  config: StockIdConfig = {},
  year = new Date().getFullYear(),
  date = new Date(),
): string {
  const prefix = config.prefix ?? DEFAULT_PREFIX;
  const seqLen = config.sequenceLength ?? SEQUENCE_LENGTH;
  const separator = config.separator ?? '-';
  const padded = String(sequence).padStart(seqLen, '0');
  
  const monthAbbr = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();

  let datePart = '';
  if (config.includeMonth && config.includeYear !== false) {
    datePart = `${monthAbbr}${year}`;
  } else if (config.includeMonth) {
    datePart = monthAbbr;
  } else if (config.includeYear !== false) {
    datePart = String(year);
  }

  if (datePart) {
    return `${prefix}${separator}${datePart}${separator}${padded}`;
  }
  return `${prefix}${separator}${padded}`;
}

/**
 * Atomically reserve the next stock sequence number for a company/financial year.
 *
 * Uses MySQL's LAST_INSERT_ID(GREATEST(current_number, minSeq) + 1): the value is
 * reserved and stashed per-connection inside the UPDATE, so concurrent callers can
 * never get the same number (unlike the previous scan-max + insert, which raced and
 * collided on the stock_id unique index). GREATEST keeps the counter above any
 * legacy scan-generated IDs so the switch-over never reuses an existing number.
 */
async function nextStockSequenceNumber(
  client: PrismaClient,
  companyId: number,
  financialYearId: number,
  minSeq: number,
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = async (tx: any): Promise<number> => {
    await tx.$executeRaw`
      INSERT INTO voucher_number_sequences
        (company_id, financial_year_id, voucher_type, current_number, last_generated_at)
      VALUES (${companyId}, ${financialYearId}, ${'STOCK_ENTRY'}, 0, NOW())
      ON DUPLICATE KEY UPDATE id = id
    `;
    await tx.$executeRaw`
      UPDATE voucher_number_sequences
      SET current_number = LAST_INSERT_ID(GREATEST(current_number, ${minSeq}) + 1), last_generated_at = NOW()
      WHERE company_id = ${companyId} AND financial_year_id = ${financialYearId} AND voucher_type = ${'STOCK_ENTRY'}
    `;
    const rows = await tx.$queryRaw<Array<{ n: bigint }>>`SELECT LAST_INSERT_ID() AS n`;
    return Number(rows[0].n);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (client as any).$transaction === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any).$transaction((tx: any) => run(tx));
  }
  return run(client);
}

export async function generateStockIdNumber(
  prisma: PrismaClient,
  companyId: number,
  config: StockIdConfig = {},
  financialYearId?: number,
): Promise<string> {
  let year = new Date().getFullYear();
  // Resolve a financial year to key the atomic stock-number sequence on. When the
  // caller doesn't pass one, fall back to the company's active (then latest) FY.
  let fyId = financialYearId;
  if (!fyId) {
    const activeFy =
      (await prisma.financialYear.findFirst({ where: { companyId, isActive: true }, orderBy: { fromDate: 'desc' } })) ||
      (await prisma.financialYear.findFirst({ where: { companyId }, orderBy: { fromDate: 'desc' } }));
    if (activeFy) fyId = activeFy.id;
  }
  if (fyId) {
    const fy = await prisma.financialYear.findUnique({ where: { id: fyId } });
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
        includeMonth: dbConfig.includeMonth,
        sequenceLength: dbConfig.digitLength,
        separator: dbConfig.separator,
      };
    }
  }

  const prefix = activeConfig.prefix ?? DEFAULT_PREFIX;
  const separator = activeConfig.separator ?? '-';
  const monthAbbr = new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase();

  let datePart = '';
  if (activeConfig.includeMonth && activeConfig.includeYear !== false) {
    datePart = `${monthAbbr}${year}`;
  } else if (activeConfig.includeMonth) {
    datePart = monthAbbr;
  } else if (activeConfig.includeYear !== false) {
    datePart = String(year);
  }

  const pattern = datePart ? `${prefix}${separator}${datePart}${separator}` : `${prefix}${separator}`;

  // Find the highest sequence already used for this pattern so the atomic counter
  // below starts above any legacy IDs. (No FOR UPDATE — atomicity now comes from
  // the sequence increment, not from locking the scanned rows.)
  let maxSeq = 0;
  const existing = await prisma.stockPacket.findMany({
    where: {
      companyId,
      stockIdNumber: { startsWith: pattern },
    },
    select: { stockIdNumber: true },
  });
  for (const item of existing) {
    const segment = item.stockIdNumber.slice(pattern.length);
    const parsed = parseInt(segment, 10);
    if (!Number.isNaN(parsed) && /^\d+$/.test(segment) && parsed > maxSeq) {
      maxSeq = parsed;
    }
  }

  // Atomically reserve the next number. Without a financial year we cannot key the
  // sequence table, so fall back to maxSeq + 1 (only reachable before any FY exists).
  const nextSequence = fyId
    ? await nextStockSequenceNumber(prisma, companyId, fyId, maxSeq)
    : maxSeq + 1;

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
