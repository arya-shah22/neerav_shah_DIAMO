import { z } from 'zod';

export const invoiceItemSchema = z.object({
  qualityId: z.number({ required_error: 'Quality is required' }),
  hsnNumber: z.string().max(8).optional().default('7113'),
  quantity: z.number().optional().default(0),
  carats: z.number({ required_error: 'Carats is required' }).positive('Carats must be positive'),
  pieces: z.number().min(1).default(1),
  rate: z.number({ required_error: 'Rate is required' }).min(0, 'Rate cannot be negative'),
  discountPct: z.number().min(0).max(100).default(0),
});

export const invoiceSchema = z.object({
  financialYearId: z.number({ required_error: 'Financial year is required' }),
  invoiceType: z.enum(['SALE_INVOICE', 'PURCHASE_INVOICE']),
  isManualBillNumber: z.boolean().default(false),
  billNumber: z.string().optional().or(z.literal('')),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  customerId: z.number({ required_error: 'Party / Client is required' }),
  brokerId: z.number().nullable().optional(),
  brokeragePct: z.number().min(0).max(100).default(0),
  creditDays: z.number().min(0).default(0),
  addPct: z.number().min(0).max(100).default(0),
  lessPct: z.number().min(0).max(100).default(0),
  totalCgst: z.number().min(0).default(0),
  totalSgst: z.number().min(0).default(0),
  totalIgst: z.number().min(0).default(0),
  narration: z.string().optional().or(z.literal('')),
  items: z.array(invoiceItemSchema).min(1, 'At least one item must be added'),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;
