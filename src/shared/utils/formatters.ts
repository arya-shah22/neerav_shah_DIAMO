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
 * Format a Date object or ISO string to standard DD/MM/YYYY format
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
