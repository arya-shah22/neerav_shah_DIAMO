// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Company Module Backend
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { AccountGroupModule } from '../account-group/account-group.module';

@Module({
  imports: [AccountGroupModule],
  providers: [CompanyService, CompanyController],
  exports: [CompanyService, CompanyController],
})
export class CompanyModule {}
