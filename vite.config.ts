import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createManualChunks } from './build/viteManualChunks';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
  const buildVersion =
    env.VITE_APP_VERSION ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    `${pkg.version || '0.0.0'}-${Date.now()}`;
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(buildVersion),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: createManualChunks,
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
    },
  };
});
