import { z } from 'zod';

export const brokerSchema = z.object({
  accountName: z.string().min(1, 'Broker name is required').max(200),
  printName: z.string().max(200).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE'),
  gstinNumber: z.string().max(15).optional().or(z.literal('')),
  panNumber: z.string().max(10).optional().or(z.literal('')),
  creditDays: z.number().min(0).default(0),
  creditLimit: z.number().min(0).default(0),
  addressLine1: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  stateCode: z.string().max(2).optional().or(z.literal('')),
  pincode: z.string().max(10).optional().or(z.literal('')),
  mobile: z.string().max(15).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  bankAccountNumber: z.string().max(30).optional().or(z.literal('')),
  bankName: z.string().max(100).optional().or(z.literal('')),
  bankIfsc: z.string().max(11).optional().or(z.literal('')),
  brokeragePct: z.number().min(0).max(100).default(0),
  addLess: z.enum(['ADD', 'LESS']).default('LESS'),
  tdsPct: z.number().min(0).max(100).default(5),
});

export type BrokerFormData = z.infer<typeof brokerSchema>;
