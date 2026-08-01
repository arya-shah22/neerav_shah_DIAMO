// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Diamond Measurement Parser & Formatter Utility
// Synchronizes combined measurement string (e.g. "6.50-6.52x4.00" or "6.50*6.52*4.00")
// and individual dimensions (lengthMm, widthMm, depthMm).
// ═══════════════════════════════════════════════════════════════

export interface ParsedMeasurements {
  lengthMm: number | null;
  widthMm: number | null;
  depthMm: number | null;
  measurements: string | null;
}

/**
  Parse a raw measurement string like "6.50-6.52x4.00", "6.50*6.52*4.00", or "6.50 x 6.52 x 4.00"
  into numerical length, width, and depth values.
 */
export function parseMeasurementString(str?: string | null): { lengthMm: number | null; widthMm: number | null; depthMm: number | null } {
  if (!str?.trim()) return { lengthMm: null, widthMm: null, depthMm: null };
  const clean = str.trim().toLowerCase();

  // Pattern 1: "6.50-6.52x4.00" or "6.50 - 6.52 x 4.00" or "6.50-6.52*4.00"
  const roundMatch = clean.match(/^([\d.]+)\s*[-–—]\s*([\d.]+)\s*[*xX×]\s*([\d.]+)$/);
  if (roundMatch) {
    const l = parseFloat(roundMatch[1]);
    const w = parseFloat(roundMatch[2]);
    const d = parseFloat(roundMatch[3]);
    return {
      lengthMm: !isNaN(l) ? l : null,
      widthMm: !isNaN(w) ? w : null,
      depthMm: !isNaN(d) ? d : null,
    };
  }

  // Pattern 2: "6.50x6.52x4.00" or "6.50 * 6.52 * 4.00" or "6.50 X 6.52 X 4.00"
  const fancyMatch = clean.match(/^([\d.]+)\s*[*xX×]\s*([\d.]+)\s*[*xX×]\s*([\d.]+)$/);
  if (fancyMatch) {
    const l = parseFloat(fancyMatch[1]);
    const w = parseFloat(fancyMatch[2]);
    const d = parseFloat(fancyMatch[3]);
    return {
      lengthMm: !isNaN(l) ? l : null,
      widthMm: !isNaN(w) ? w : null,
      depthMm: !isNaN(d) ? d : null,
    };
  }

  // Pattern 3: 2 numbers "6.50x6.52" or "6.50*6.52"
  const twoMatch = clean.match(/^([\d.]+)\s*[*xX×]\s*([\d.]+)$/);
  if (twoMatch) {
    const l = parseFloat(twoMatch[1]);
    const w = parseFloat(twoMatch[2]);
    return {
      lengthMm: !isNaN(l) ? l : null,
      widthMm: !isNaN(w) ? w : null,
      depthMm: null,
    };
  }

  return { lengthMm: null, widthMm: null, depthMm: null };
}

/**
 * Format numerical length, width, and depth into standard measurement string.
 * Uses Round format ("6.50-6.52x4.00") if shape is ROUND or length != width,
 * otherwise fancy format ("6.50x6.52x4.00").
 */
export function formatMeasurementString(
  lengthMm?: number | string | null,
  widthMm?: number | string | null,
  depthMm?: number | string | null,
  shape?: string | null,
): string | null {
  const l = lengthMm != null && !isNaN(Number(lengthMm)) ? Number(lengthMm) : null;
  const w = widthMm != null && !isNaN(Number(widthMm)) ? Number(widthMm) : null;
  const d = depthMm != null && !isNaN(Number(depthMm)) ? Number(depthMm) : null;

  if (l == null && w == null && d == null) return null;

  const lStr = l != null ? l.toFixed(2) : '';
  const wStr = w != null ? w.toFixed(2) : '';
  const dStr = d != null ? d.toFixed(2) : '';

  const isRound = shape?.trim().toUpperCase() === 'ROUND' || shape?.trim().toUpperCase() === 'RBC';

  if (l != null && w != null && d != null) {
    if (isRound && l !== w) {
      const min = Math.min(l, w).toFixed(2);
      const max = Math.max(l, w).toFixed(2);
      return `${min}-${max}x${dStr}`;
    }
    return `${lStr}x${wStr}x${dStr}`;
  }

  if (l != null && w != null) {
    if (isRound && l !== w) {
      const min = Math.min(l, w).toFixed(2);
      const max = Math.max(l, w).toFixed(2);
      return `${min}-${max}`;
    }
    return `${lStr}x${wStr}`;
  }

  if (l != null) return lStr;
  return null;
}

/**
 * Normalize and synchronize measurements for stock payload:
 * Fills missing length/width/depth from measurement string OR
 * generates combined measurement string from length/width/depth.
 */
export function syncStockMeasurements(data: {
  lengthMm?: any;
  widthMm?: any;
  depthMm?: any;
  measurements?: any;
  shape?: any;
}): ParsedMeasurements {
  let l = data.lengthMm != null && data.lengthMm !== '' && !isNaN(Number(data.lengthMm)) ? Number(data.lengthMm) : null;
  let w = data.widthMm != null && data.widthMm !== '' && !isNaN(Number(data.widthMm)) ? Number(data.widthMm) : null;
  let d = data.depthMm != null && data.depthMm !== '' && !isNaN(Number(data.depthMm)) ? Number(data.depthMm) : null;
  let m = typeof data.measurements === 'string' && data.measurements.trim() ? data.measurements.trim() : null;

  // If measurements string is present but individual dimensions are missing, parse them out
  if (m && (l == null || w == null || d == null)) {
    const parsed = parseMeasurementString(m);
    if (l == null) l = parsed.lengthMm;
    if (w == null) w = parsed.widthMm;
    if (d == null) d = parsed.depthMm;
  }

  // Generate clean standardized measurement string if missing or if individuals were updated
  if (l != null || w != null || d != null) {
    const formatted = formatMeasurementString(l, w, d, data.shape);
    if (formatted) m = formatted;
  }

  return {
    lengthMm: l,
    widthMm: w,
    depthMm: d,
    measurements: m,
  };
}
