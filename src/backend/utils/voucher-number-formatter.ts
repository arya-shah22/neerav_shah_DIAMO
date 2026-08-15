import { Prisma, PrismaClient, VoucherType } from '@prisma/client';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * Atomically increment and return the next sequence number for a voucher type.
 *
 * Uses MySQL's LAST_INSERT_ID(current_number + 1): the incremented value is
 * stashed per-connection *inside* the UPDATE, so a following SELECT LAST_INSERT_ID()
 * reads exactly this connection's value. Unlike Prisma's upsert (which does an
 * UPDATE and then a separate SELECT of the row), two concurrent callers can never
 * read the same number — so voucher numbers never collide under load.
 *
 * Pass a transaction client when already inside prisma.$transaction so the three
 * statements share its pinned connection; pass the base client otherwise and it
 * opens its own short transaction for the required connection affinity.
 */
export async function nextVoucherSequenceNumber(
  client: PrismaLike,
  companyId: number,
  financialYearId: number,
  voucherType: VoucherType,
): Promise<number> {
  const run = async (tx: PrismaLike): Promise<number> => {
    await tx.$executeRaw`
      INSERT INTO voucher_number_sequences
        (company_id, financial_year_id, voucher_type, current_number, last_generated_at)
      VALUES (${companyId}, ${financialYearId}, ${voucherType}, 0, NOW())
      ON DUPLICATE KEY UPDATE id = id
    `;
    await tx.$executeRaw`
      UPDATE voucher_number_sequences
      SET current_number = LAST_INSERT_ID(current_number + 1), last_generated_at = NOW()
      WHERE company_id = ${companyId}
        AND financial_year_id = ${financialYearId}
        AND voucher_type = ${voucherType}
    `;
    const rows = await tx.$queryRaw<Array<{ n: bigint }>>`SELECT LAST_INSERT_ID() AS n`;
    return Number(rows[0].n);
  };

  // A base PrismaClient exposes $transaction; a transaction client does not.
  if (typeof (client as PrismaClient).$transaction === 'function') {
    return (client as PrismaClient).$transaction((tx) => run(tx));
  }
  return run(client);
}

export interface VoucherNumberConfigData {
  prefix?: string | null;
  separator?: string | null;
  suffix?: string | null;
  digitLength?: number;
  includeYear?: boolean;
  includeMonth?: boolean;
}

export function formatVoucherNumber(
  sequenceNum: number,
  config: VoucherNumberConfigData,
  yearSuffix: string,
  typeAbbr: string,
  _companyCode: string,
  docDate: Date = new Date(),
): string {
  const prefix = config.prefix !== undefined && config.prefix !== null && config.prefix !== '' ? config.prefix : typeAbbr;
  const separator = config.separator || '-';
  const suffix = config.suffix ? `${separator}${config.suffix}` : '';
  const digitLength = config.digitLength || 6;
  const seqStr = String(sequenceNum).padStart(digitLength, '0');
  
  const monthAbbr = docDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();

  let datePart = '';
  if (config.includeMonth && config.includeYear !== false) {
    datePart = `${monthAbbr}${yearSuffix}`;
  } else if (config.includeMonth) {
    datePart = monthAbbr;
  } else if (config.includeYear !== false) {
    datePart = yearSuffix;
  }

  if (datePart) {
    return `${prefix}${separator}${datePart}${separator}${seqStr}${suffix}`;
  }
  return `${prefix}${separator}${seqStr}${suffix}`;
}

export async function getOrInitializeVoucherConfig(
  prisma: any,
  companyId: number,
  financialYearId: number,
  voucherType: VoucherType,
  defaultPrefix: string,
) {
  return await prisma.voucherNumberConfig.upsert({
    where: {
      companyId_financialYearId_voucherType: {
        companyId,
        financialYearId,
        voucherType,
      },
    },
    update: {},
    create: {
      companyId,
      financialYearId,
      voucherType,
      method: 'AUTOMATIC',
      prefix: defaultPrefix,
      separator: '-',
      suffix: '',
      digitLength: 6,
      includeYear: true,
      includeMonth: false,
      resetAnnually: true,
    },
  });
}
