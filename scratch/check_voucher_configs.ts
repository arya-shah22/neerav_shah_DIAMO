import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.voucherNumberConfig.findMany({});
  console.table(configs.map(c => ({
    id: c.id,
    companyId: c.companyId,
    financialYearId: c.financialYearId,
    voucherType: c.voucherType,
    prefix: c.prefix,
    includeYear: c.includeYear,
    includeMonth: c.includeMonth
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
