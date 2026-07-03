import { PrismaClient } from '@prisma/client';

export async function findOrCreateStateCode(
  prisma: PrismaClient,
  stateNameOrCode: string | null | undefined
): Promise<string | null> {
  if (!stateNameOrCode) return null;
  const trimmed = stateNameOrCode.trim();
  if (!trimmed) return null;

  // 1. If it's a 2-character code, check if it already exists in standard codes
  if (trimmed.length <= 2) {
    const existing = await prisma.stateCode.findFirst({
      where: { stateCode: trimmed.toUpperCase() },
    });
    if (existing) return existing.stateCode;
  }

  // 2. Check if a state with this name already exists (case-insensitive)
  const existingByName = await prisma.stateCode.findFirst({
    where: { stateName: { equals: trimmed } },
  });
  if (existingByName) return existingByName.stateCode;

  // 3. Otherwise, capitalize the first letter of each word to make it nice
  const capitalized = trimmed
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // 4. Check again with capitalized name
  const existingByCapName = await prisma.stateCode.findFirst({
    where: { stateName: capitalized },
  });
  if (existingByCapName) return existingByCapName.stateCode;

  // 5. Generate a new unique 2-character numeric code starting from '39'
  const allStates = await prisma.stateCode.findMany({
    select: { stateCode: true },
  });

  let nextNum = 39;
  let code = String(nextNum).padStart(2, '0');
  while (allStates.some((s) => s.stateCode === code)) {
    nextNum++;
    code = String(nextNum).padStart(2, '0');
    if (nextNum > 99) {
      // Fallback to alphabetical combinations if range [39-99] is exhausted (highly unlikely)
      code = 'XX';
      break;
    }
  }

  const newState = await prisma.stateCode.create({
    data: {
      stateCode: code,
      stateName: capitalized,
      isUt: false,
    },
  });

  return newState.stateCode;
}
