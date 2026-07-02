// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Broker Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { AccountGroupModule } from '../account-group/account-group.module';
import { BrokerService } from './broker.service';
import { BrokerController } from './broker.controller';

@Module({
  imports: [AccountModule, AccountGroupModule],
  providers: [BrokerService, BrokerController],
  exports: [BrokerService, BrokerController],
})
export class BrokerModule {}
