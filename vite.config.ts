import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/apps/main.ts',
        vite: {
          build: {
            outDir: 'dist/apps',
            rollupOptions: {
              external: ['electron', '@prisma/client', '@nestjs/core', '@nestjs/common'],
            },
          },
        },
      },
      {
        entry: 'src/apps/preload.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist/apps',
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@frontend': path.resolve(__dirname, 'src/frontend'),
      '@backend': path.resolve(__dirname, 'src/backend'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@apps': path.resolve(__dirname, 'src/apps'),
    },
  },
  root: '.',
  build: {
    outDir: 'dist/renderer',
  },
});
