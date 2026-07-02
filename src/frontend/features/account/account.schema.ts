import { z } from 'zod';

export const accountSchema = z.object({
  accountGroupId: z.number({ required_error: 'Account group is required' }),
  accountName: z.string().min(1, 'Account name is required').max(200),
  printName: z.string().max(200).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE'),
  gstinNumber: z.string().max(15).optional().or(z.literal('')),
  panNumber: z.string().max(10).optional().or(z.literal('')),
  gstRegType: z.enum(['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'SEZ', 'DEEMED_EXPORT']).optional().nullable(),
  udyamMsme: z.string().max(50).optional().or(z.literal('')),
  creditDays: z.number().min(0).default(0),
  creditLimit: z.number().min(0).default(0),
  addressLine1: z.string().max(200).optional().or(z.literal('')),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  stateCode: z.string().max(2).optional().or(z.literal('')),
  pincode: z.string().max(10).optional().or(z.literal('')),
  country: z.string().max(50).default('India'),
  mobile: z.string().max(15).optional().or(z.literal('')),
  phone: z.string().max(15).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  bankAccountNumber: z.string().max(30).optional().or(z.literal('')),
  bankName: z.string().max(100).optional().or(z.literal('')),
  bankBranch: z.string().max(100).optional().or(z.literal('')),
  bankIfsc: z.string().max(11).optional().or(z.literal('')),
  openingBalanceAmount: z.number().default(0),
  openingBalanceType: z.enum(['DEBIT', 'CREDIT']).optional().nullable(),
});

export type AccountFormData = z.infer<typeof accountSchema>;
