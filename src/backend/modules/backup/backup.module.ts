// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Backup & Recovery Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';

@Module({
  providers: [BackupService, BackupController],
  exports: [BackupService, BackupController],
})
export class BackupModule {}
