// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Common Shared Formatters
// ═══════════════════════════════════════════════════════════════

/**
 * Format weights (carats) to exactly 3 decimal places
 * Phase 17.1 §9 & Phase 18 carat precision rules
 */
export function formatCarats(carats: number | string | null | undefined): string {
  if (carats == null) return '0.000';
  const val = typeof carats === 'string' ? parseFloat(carats) : carats;
  return isNaN(val) ? '0.000' : val.toFixed(3);
}

/**
 * Format currency to Indian Rupees display (Lakhs/Crores separators)
 * Format monetary amounts to exactly 2 decimal places
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return '₹0.00';
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(val)) return '₹0.00';
  
  // Indian numbering system formatting (e.g., 12,34,567.89)
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(val);
}

/**
 * Format currency to US Dollars display
 */
export function formatUsd(amount: number | string | null | undefined): string {
  if (amount == null) return '$0.00';
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(val)) return '$0.00';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(val);
}

/**
 * Format amount with dynamic currency code
 */
export function formatAmount(amount: number | string | null | undefined, currency: 'USD' | 'INR'): string {
  if (currency === 'USD') return formatUsd(amount);
  return formatCurrency(amount);
}

/**
 * Format dual-currency display string
 * e.g., "$500.00 (₹41,625.00)" or "₹41,625.00 ($500.00)"
 */
export function formatDualCurrency(
  amountPrimary: number | string | null | undefined,
  amountAlt: number | string | null | undefined,
  primaryCurrency: 'USD' | 'INR'
): string {
  const altCurrency = primaryCurrency === 'USD' ? 'INR' : 'USD';
  const primary = formatAmount(amountPrimary, primaryCurrency);
  const alt = formatAmount(amountAlt, altCurrency);
  return `${primary} (${alt})`;
}

/**
 * Format a Date object or ISO string to standard DD-MM-YYYY format
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format a Date object or ISO string to time format (12-Hour or 24-Hour)
 */
export function formatTime(date: Date | string | null | undefined, use12Hour: boolean = true): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (use12Hour) {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Hour '0' should be '12'
    const hoursStr = String(hours).padStart(2, '0');
    return `${hoursStr}:${minutes} ${ampm}`;
  } else {
    const hoursStr = String(hours).padStart(2, '0');
    return `${hoursStr}:${minutes}`;
  }
}
