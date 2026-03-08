import path from 'path';
import { defineConfig } from 'vite';
import type { PluginContext } from 'rollup';
import react from '@vitejs/plugin-react';
import { createManualChunks } from './build/viteManualChunks';

function buildStampPlugin() {
  return {
    name: 'build-stamp',
    generateBundle(this: PluginContext) {
      const sha =
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        process.env.COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        '';
      const stamp = sha ? sha.slice(0, 12) : `local-${new Date().toISOString()}`;

      this.emitFile({
        type: 'asset',
        fileName: 'build.txt',
        source: `${stamp}\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const base = process.env.VITE_BASE || '/';
  return {
    base,
    server: {
      port: 3001,
      host: '0.0.0.0',
    },
    plugins: [react(), buildStampPlugin()],
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
    }
  };
});
