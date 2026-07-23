// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — System Preferences NestJS Module
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';

@Module({
  providers: [PreferencesService, PreferencesController],
  exports: [PreferencesService, PreferencesController],
})
export class PreferencesModule {}
