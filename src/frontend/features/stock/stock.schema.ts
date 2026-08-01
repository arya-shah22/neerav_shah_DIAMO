import { z } from 'zod';

const optionalNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
    return undefined;
  }
  return Number(val);
}, z.number().min(0).optional());

const optionalPctNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
    return undefined;
  }
  return Number(val);
}, z.number().min(0).max(100).optional());

export const stockSchema = z
  .object({
    stockIdNumber: z.string().max(30).optional(),
    qualityId: z.number({ invalid_type_error: 'Quality is required' }).min(1, 'Quality is required'),
    category: z.enum(['CERTIFIED', 'NON_CERTIFIED']).default('NON_CERTIFIED'),
    registrationDate: z.string().min(1, 'Registration date is required'),
    currentStatus: z
      .enum(['CREATED', 'PURCHASED', 'AVAILABLE', 'HOLD', 'JOB_WORK', 'SOLD', 'RETURNED', 'DAMAGED', 'ARCHIVED', 'PROCESSED'])
      .default('AVAILABLE'),
    currentLocation: z.string().max(100).optional(),
    shape: z.string().max(30).optional(),
    caratWeight: z.number({ invalid_type_error: 'Carat weight is required' }).positive('Carat weight must be greater than zero'),
    pieceCount: z.preprocess((val) => {
      if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return Number(val);
    }, z.number().int().min(0, 'Cannot be negative').default(1)),
    color: z.string().max(30).optional(),
    clarity: z.string().max(30).optional(),
    cut: z.string().max(30).optional(),
    polish: z.string().max(30).optional(),
    symmetry: z.string().max(30).optional(),
    lengthMm: optionalNumber,
    widthMm: optionalNumber,
    depthMm: optionalNumber,
    measurements: z.string().optional(),
    totalDepthPct: optionalPctNumber,
    tablePct: optionalPctNumber,
    girdlePct: optionalPctNumber,
    // Extended Diamond Details
    fluorescenceIntensity: z.string().max(30).optional(),
    fluorescenceColor: z.string().max(30).optional(),
    rapPricePerCarat: optionalNumber,
    rapDiscountPct: z.preprocess((val) => {
      if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) return undefined;
      return Number(val);
    }, z.number().optional()),
    crownAngle: optionalNumber,
    crownHeight: optionalNumber,
    pavilionAngle: optionalNumber,
    pavilionDepth: optionalNumber,
    girdleMin: z.string().max(30).optional(),
    girdleMax: z.string().max(30).optional(),
    girdleCondition: z.string().max(30).optional(),
    culetSize: z.string().max(30).optional(),
    culetCondition: z.string().max(30).optional(),
    heartsAndArrows: z.string().max(10).optional(),
    eyeClean: z.string().max(20).optional(),
    shade: z.string().max(30).optional(),
    milky: z.string().max(30).optional(),
    treatment: z.string().max(50).optional(),
    tinge: z.string().max(30).optional(),
    lustre: z.string().max(30).optional(),
    tableInclusion: z.string().max(50).optional(),
    sideInclusion: z.string().max(50).optional(),
    tableOpen: z.string().max(30).optional(),
    crownOpen: z.string().max(30).optional(),
    girdleOpen: z.string().max(30).optional(),
    origin: z.string().max(50).optional(),
    certificateUrl: z.string().max(500).optional(),
    webUrl: z.string().max(500).optional(),
    inscription: z.string().max(100).optional(),
    keyToSymbols: z.string().max(255).optional(),
    diamondComment: z.string().max(2000).optional(),
    fancyColor: z.string().optional(),
    fancyColorIntensity: z.string().optional(),
    fancyColorOvertone: z.string().optional(),
    availability: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    tradeShow: z.string().optional(),
    brand: z.string().optional(),
    sellerSpec: z.string().optional(),
    pairStockNumber: z.string().optional(),
    isPairSeparable: z.string().optional(),
    parcelStones: z.string().optional(),
    reportFilename: z.string().optional(),
    reportIssueDate: z.string().optional(),
    labLocation: z.string().optional(),
    certComment: z.string().optional(),
    memberComment: z.string().optional(),
    allowRaplinkFeed: z.string().optional(),
    sarineLoupe: z.string().optional(),
    reportType: z.string().optional(),
    diamondType: z.string().optional(),
    blackInclusion: z.string().optional(),
    whiteInclusion: z.string().optional(),
    openInclusion: z.string().optional(),
    starLength: optionalNumber,
    growthType: z.string().optional(),
    bgm: z.string().optional(),
    certificateType: z.string().optional(),
    certificateNumber: z.string().optional(),
    costPerCarat: z.number().min(0).default(0),
    totalCost: z.number().min(0).default(0),
    targetSaleRate: optionalNumber,
    statusRemarks: z.string().max(255).optional(),
    imageLink: z
      .string()
      .max(500)
      .optional()
      .refine((v) => !v?.trim() || isValidHttpUrl(v), 'Enter a valid image URL'),
    videoLink: z
      .string()
      .max(500)
      .optional()
      .refine((v) => !v?.trim() || isValidHttpUrl(v), 'Enter a valid video URL'),
  })
  .superRefine((data, ctx) => {
    if (data.category === 'CERTIFIED' && !data.certificateNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Certificate number is required for certified stones',
        path: ['certificateNumber'],
      });
    }
  });

export type StockFormData = z.infer<typeof stockSchema>;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
