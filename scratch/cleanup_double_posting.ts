import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.generalLedgerEntry.findMany({
    where: {
      narration: { contains: 'Write-Off against Loan LN-2627-000003' }
    }
  });

  console.log("=== WRITEOFF ENTRIES FOUND ===");
  console.log(entries);

  for (const e of entries) {
    await prisma.generalLedgerEntry.update({
      where: { id: e.id },
      data: { amount: 100 }
    });
  }

  console.log("Successfully updated write-off GL entries to ₹100.00.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
