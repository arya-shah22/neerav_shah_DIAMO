// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Company Validation Schema
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const companySchema = z.object({
  companyName: z
    .string()
    .min(3, { message: 'Company name must be at least 3 characters long' })
    .max(150, { message: 'Company name cannot exceed 150 characters' }),
  companyCode: z
    .string()
    .length(3, { message: 'Company code must be exactly 3 characters' })
    .transform((val) => val.toUpperCase()),
  panNumber: z
    .string()
    .min(10, { message: 'PAN Number must be 10 characters' })
    .max(10, { message: 'PAN Number must be 10 characters' })
    .refine((val) => PAN_REGEX.test(val.toUpperCase()), {
      message: 'Invalid Indian PAN format (e.g. ABCDE1234F)',
    })
    .transform((val) => val.toUpperCase()),
  gstinNumber: z
    .string()
    .nullable()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || GSTIN_REGEX.test(val.toUpperCase()), {
      message: 'Invalid Indian GSTIN format (e.g. 24ABCDE1234F1Z5)',
    })
    .transform((val) => (val ? val.toUpperCase() : null)),
  tanNumber: z
    .string()
    .max(10, { message: 'TAN number cannot exceed 10 characters' })
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  udyamMsme: z
    .string()
    .max(30, { message: 'MSME registration number cannot exceed 30 characters' })
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  iecCode: z
    .string()
    .max(15, { message: 'IEC Code cannot exceed 15 characters' })
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  gstEnabled: z.boolean().default(true),
  gstRegistrationDate: z
    .string()
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  businessType: z
    .string()
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  isDefault: z.boolean().default(false),
  addressLine1: z
    .string()
    .max(255)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  addressLine2: z
    .string()
    .max(255)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  city: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  stateCode: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  pincode: z
    .string()
    .nullable()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^[0-9]{6}$/.test(val), {
      message: 'Pincode must be exactly 6 digits',
    })
    .transform((val) => val || null),
  mobile: z
    .string()
    .max(20)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  phone: z
    .string()
    .max(20)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  email: z
    .string()
    .nullable()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'Invalid email address format',
    })
    .transform((val) => val || null),
  website: z
    .string()
    .max(255)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  bankAccountNumber: z
    .string()
    .max(30)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  bankName: z
    .string()
    .max(150)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  bankBranch: z
    .string()
    .max(150)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  bankIfsc: z
    .string()
    .nullable()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val.toUpperCase()), {
      message: 'Invalid Indian IFSC code format (e.g. SBIN0001234)',
    })
    .transform((val) => (val ? val.toUpperCase() : null)),
  bankSwift: z
    .string()
    .max(11)
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
});

export type CompanyFormData = z.infer<typeof companySchema>;
