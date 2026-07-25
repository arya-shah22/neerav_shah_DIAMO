import { z } from 'zod';

const optionalNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))) {
    return undefined;
  }
  return Number(val);
}, z.number().optional().nullable());

export const invoiceItemSchema = z.object({
  qualityId: z.number({ required_error: 'Quality is required', invalid_type_error: 'Quality is required' }).min(1, 'Quality is required'),
  hsnNumber: z.string().max(8).optional().default('7113'),
  quantity: optionalNumber.default(0),
  carats: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val)) ? 0 : Number(val)),
    z.number({ required_error: 'Carats is required' }).positive('Carats must be greater than 0')
  ),
  pieces: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val)) ? null : Number(val)),
    z.number().min(0).optional().nullable().default(1)
  ),
  isPiecesUncounted: z.boolean().optional().default(false),
  rate: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val)) ? 0 : Number(val)),
    z.number({ required_error: 'Rate is required' }).min(0, 'Rate cannot be negative')
  ),
  discountPct: optionalNumber.default(0),
  stockPacketId: z.preprocess((val) => (val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val)) ? null : Number(val)), z.number().nullable().optional()),
  stockIdNumber: z.string().optional(),
  isManualStockId: z.boolean().optional().default(false),
  category: z.string().optional(),
  shape: z.string().optional(),
  color: z.string().optional(),
  clarity: z.string().optional(),
  cut: z.string().optional(),
  polish: z.string().optional(),
  symmetry: z.string().optional(),
  certificateType: z.string().optional(),
  certificateNumber: z.string().optional(),
  lengthMm: optionalNumber,
  widthMm: optionalNumber,
  depthMm: optionalNumber,
  totalDepthPct: optionalNumber,
  tablePct: optionalNumber,
  imageLink: z.string().optional(),
  videoLink: z.string().optional(),
});

export const invoiceSchema = z.object({
  financialYearId: z.number({ required_error: 'Financial year is required' }),
  invoiceType: z.enum([
    'SALE_INVOICE',
    'SALE_RETURN',
    'SALE_DEBIT_NOTE',
    'PURCHASE_INVOICE',
    'PURCHASE_RETURN',
    'PURCHASE_DEBIT_NOTE',
  ]),
  referenceInvoiceId: z.number().nullable().optional(),
  referenceBillNumber: z.string().nullable().optional(),
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
