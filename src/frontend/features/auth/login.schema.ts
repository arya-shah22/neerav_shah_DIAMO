// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Auth Login Form Validation Schema
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

export const loginSchema = z.object({
  userIdHandle: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(50, { message: 'Username cannot exceed 50 characters' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' }),
  rememberMe: z.boolean().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;
