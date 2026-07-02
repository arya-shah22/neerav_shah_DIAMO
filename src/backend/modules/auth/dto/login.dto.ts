// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Auth DTOs
// ═══════════════════════════════════════════════════════════════

import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  userIdHandle!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
}
