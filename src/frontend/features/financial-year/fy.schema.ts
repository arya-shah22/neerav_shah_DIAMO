// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Financial Year Form Schema
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const financialYearSchema = z
  .object({
    fromDate: z
      .string()
      .min(1, 'Start date is required')
      .regex(dateRegex, 'Invalid date format'),
    toDate: z
      .string()
      .min(1, 'End date is required')
      .regex(dateRegex, 'Invalid date format'),
    isActive: z.boolean().default(false),
    gstActive: z.boolean().default(true),
    tcsActive: z.boolean().default(true),
    accountEffect: z.boolean().default(true),
    lockTransactionUptoDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Timezone-safe string date parsing
    const fromParts = data.fromDate.split('-').map(Number);
    const toParts = data.toDate.split('-').map(Number);

    if (fromParts.length !== 3 || toParts.length !== 3) return;

    const [fromY, fromM, fromD] = fromParts;
    const [toY, toM, toD] = toParts;

    if (data.fromDate >= data.toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be strictly after start date',
        path: ['toDate'],
      });
    }

    if (fromM !== 4 || fromD !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Financial year must start on April 1st (01/04)',
        path: ['fromDate'],
      });
    }

    if (toM !== 3 || toD !== 31) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Financial year must end on March 31st (31/03)',
        path: ['toDate'],
      });
    }

    if (toY !== fromY + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Financial year must span exactly one fiscal period (April to March)',
        path: ['toDate'],
      });
    }

    if (data.lockTransactionUptoDate && data.lockTransactionUptoDate.trim()) {
      const fromIso = data.fromDate;
      const toIso = data.toDate;
      const lockIso = data.lockTransactionUptoDate;
      if (lockIso < fromIso || lockIso > toIso) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Lock date must be within the financial year (between start date and end date)',
          path: ['lockTransactionUptoDate'],
        });
      }
    }
  });

export type FinancialYearFormData = z.infer<typeof financialYearSchema>;

export const editFinancialYearSchema = z
  .object({
    fromDate: z
      .string()
      .min(1, 'Start date is required')
      .regex(dateRegex, 'Invalid date format'),
    toDate: z
      .string()
      .min(1, 'End date is required')
      .regex(dateRegex, 'Invalid date format'),
    gstActive: z.boolean().default(true),
    tcsActive: z.boolean().default(true),
    accountEffect: z.boolean().default(true),
    lockTransactionUptoDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fromDate >= data.toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be strictly after start date',
        path: ['toDate'],
      });
    }

    if (data.lockTransactionUptoDate && data.lockTransactionUptoDate.trim()) {
      const fromIso = data.fromDate;
      const toIso = data.toDate;
      const lockIso = data.lockTransactionUptoDate;
      if (lockIso < fromIso || lockIso > toIso) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Lock date must be within the financial year dates',
          path: ['lockTransactionUptoDate'],
        });
      }
    }
  });

export type EditFinancialYearFormData = z.infer<typeof editFinancialYearSchema>;

/**
 * Build a list of selectable FY start years (current ± 5).
 */
export function getFinancialYearOptions(): { label: string; startYear: number; fromDate: string; toDate: string }[] {
  const currentYear = new Date().getFullYear();
  const options = [];

  for (let y = currentYear - 3; y <= currentYear + 3; y++) {
    options.push({
      label: `FY ${y}-${String(y + 1).slice(-2)}`,
      startYear: y,
      fromDate: `${y}-04-01`,
      toDate: `${y + 1}-03-31`,
    });
  }

  return options;
}

/**
 * Suggest standard Indian FY dates from a reference year.
 * e.g. referenceYear=2025 → 2025-04-01 to 2026-03-31
 */
export function suggestFinancialYearDates(referenceYear?: number): {
  fromDate: string;
  toDate: string;
} {
  const year = referenceYear ?? new Date().getFullYear();
  const month = new Date().getMonth();
  const startYear = month >= 3 ? year : year - 1;

  return {
    fromDate: `${startYear}-04-01`,
    toDate: `${startYear + 1}-03-31`,
  };
}
