import { VoucherType } from '@prisma/client';

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
  let config = await prisma.voucherNumberConfig.findFirst({
    where: { companyId, financialYearId, voucherType },
  });

  if (!config) {
    config = await prisma.voucherNumberConfig.create({
      data: {
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
  return config;
}
