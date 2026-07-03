import { z } from 'zod';

export const qualitySchema = z.object({
  qualityName: z.string().min(1, 'Quality name is required').max(100),
  itemCode: z.string().min(1, 'Item code is required').max(30),
  hsnNumber: z.string().min(1, 'HSN is required').max(8),
  uqc: z.enum(['CTS', 'PCS']).default('CTS'),
  purchaseRate: z.number().min(0).default(0),
  saleRate: z.number().min(0).default(0),
  mrp: z.number().min(0).default(0),
  minLevel: z.number().min(0).default(0),
  maxLevel: z.number().min(0).default(0),
  openingBalanceCarats: z.number().min(0).default(0),
  openingBalancePcs: z.number().min(0).default(0),
  openingBalanceRate: z.number().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE'),
  gstPct: z.number().min(0).max(100).optional(),
  cessPct: z.number().min(0).max(100).default(0),
  isService: z.boolean().default(false),
});

export type QualityFormData = z.infer<typeof qualitySchema>;
