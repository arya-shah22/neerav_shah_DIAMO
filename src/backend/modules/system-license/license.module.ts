// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — License Management & Version Info NestJS Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { LicenseService } from './license.service';
import { LicenseController } from './license.controller';

@Module({
  providers: [LicenseService, LicenseController],
  exports: [LicenseService, LicenseController],
})
export class LicenseModule {}
