import { z } from 'zod';

export const accountGroupSchema = z.object({
  groupName: z.string().min(1, 'Group name is required').max(150),
  nature: z.enum(['Assets', 'Liabilities', 'Income', 'Expense']),
  parentGroupId: z.number().nullable().optional(),
  sortOrder: z.number().min(0).default(0),
});

export type AccountGroupFormData = z.infer<typeof accountGroupSchema>;
