// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Default diamond shapes (built-in suggestions)
// Custom shapes are persisted per company via stock packet usage.
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_DIAMOND_SHAPES = [
  'Round',
  'Princess',
  'Cushion',
  'Oval',
  'Emerald',
  'Pear',
  'Marquise',
  'Radiant',
  'Asscher',
  'Heart',
] as const;

export type DefaultDiamondShape = (typeof DEFAULT_DIAMOND_SHAPES)[number];

/** Merge built-in shapes with company-specific custom shapes (case-insensitive dedupe). */
export function mergeDiamondShapes(defaults: readonly string[], custom: string[]): string[] {
  const merged = new Map<string, string>();
  for (const shape of defaults) {
    const trimmed = shape.trim();
    if (trimmed) merged.set(trimmed.toLowerCase(), trimmed);
  }
  for (const shape of custom) {
    const trimmed = shape.trim();
    if (trimmed) merged.set(trimmed.toLowerCase(), trimmed);
  }
  return Array.from(merged.values()).sort((a, b) => a.localeCompare(b));
}
