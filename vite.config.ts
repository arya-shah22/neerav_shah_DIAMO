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
              external: ['electron', '@prisma/client', '.prisma/client', '.prisma', '@nestjs/core', '@nestjs/common'],
              output: {
                // ═══════════════════════════════════════════════════════════
                // CRITICAL: This banner runs BEFORE any require() in the
                // built bundle. Vite hoists require('@prisma/client') to
                // the top, so DATABASE_URL must be set before that line.
                // ═══════════════════════════════════════════════════════════
                banner: `
(function() {
  if (process.env.DATABASE_URL) return;
  var _fs = require("fs");
  var _path = require("path");
  var _app = require("electron").app;
  function loadDbUrl() {
    try {
      var ud = _app.getPath("userData");
      var ep = _path.join(ud, ".env");
      if (_fs.existsSync(ep)) {
        var m = _fs.readFileSync(ep, "utf-8").match(/DATABASE_URL\\s*=\\s*"?([^"\\n]+)"?/);
        if (m && m[1]) return m[1];
      }
    } catch(e) {}
    try {
      var rp = _path.join(process.cwd(), ".env");
      if (_fs.existsSync(rp)) {
        var m2 = _fs.readFileSync(rp, "utf-8").match(/DATABASE_URL\\s*=\\s*"?([^"\\n]+)"?/);
        if (m2 && m2[1]) return m2[1];
      }
    } catch(e) {}
    return "mysql://root:@localhost:3307/diamo_erp";
  }
  process.env.DATABASE_URL = loadDbUrl();
  console.log("[Banner] DATABASE_URL set before any module loads:", process.env.DATABASE_URL ? "OK" : "MISSING");
})();
`,
              },
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
    minify: 'esbuild',
    sourcemap: false,
  },
});
