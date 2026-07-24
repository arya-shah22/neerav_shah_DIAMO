// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — User Workspace Module
// Phase 15.4: Module definition for personal workspace
// ═══════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { UserWorkspaceService } from './workspace.service';
import { UserWorkspaceController } from './workspace.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UserWorkspaceController],
  providers: [UserWorkspaceService],
  exports: [UserWorkspaceService],
})
export class UserWorkspaceModule {}
