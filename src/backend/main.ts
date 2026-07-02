// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — NestJS Server Bootstrap
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function bootstrapNestApp() {
  // Create NestJS app as a standalone application context (non-HTTP mode)
  // Communication runs purely through Electron IPC channels rather than TCP/HTTP sockets.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  await app.init();
  return app;
}
