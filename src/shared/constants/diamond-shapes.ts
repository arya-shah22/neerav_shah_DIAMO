// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Default diamond shapes (built-in suggestions)
// Custom shapes are persisted per company via stock packet usage.
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_DIAMOND_SHAPES = [
  'ROUND',
  'PRINCESS',
  'CUSHION',
  'OVAL',
  'EMERALD',
  'PEAR',
  'MARQUISE',
  'RADIANT',
  'ASSCHER',
  'HEART',
] as const;

export type DefaultDiamondShape = (typeof DEFAULT_DIAMOND_SHAPES)[number];

/** Merge built-in shapes with company-specific custom shapes (case-insensitive dedupe, returning uppercase). */
export function mergeDiamondShapes(defaults: readonly string[], custom: string[]): string[] {
  const merged = new Map<string, string>();
  for (const shape of defaults) {
    const trimmed = shape.trim().toUpperCase();
    if (trimmed) merged.set(trimmed, trimmed);
  }
  for (const shape of custom) {
    const trimmed = shape.trim().toUpperCase();
    if (trimmed) merged.set(trimmed, trimmed);
  }
  return Array.from(merged.values()).sort((a, b) => a.localeCompare(b));
}
