import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');
const frontendSrc = path.resolve(repoRoot, 'frontend', 'src');
const normalizePath = (value) => value.split(path.sep).join('/');

function watchFrontendSrcForFullReload() {
  return {
    name: 'watch-frontend-src-for-full-reload',
    configureServer(server) {
      // The preview app imports files from ../../frontend/src, which sits
      // outside this Vite root. Watch that tree explicitly and notify the
      // client so it can preserve fixture state, reload, and auto-regenerate.
      const normalizedFrontendSrc = `${normalizePath(frontendSrc)}/`;
      const notifyClient = (file) => {
        const normalizedFile = normalizePath(file);
        if (!normalizedFile.startsWith(normalizedFrontendSrc)) {
          return;
        }

        const modules = server.moduleGraph.getModulesByFile(file);
        if (modules) {
          for (const mod of modules) {
            server.moduleGraph.invalidateModule(mod);
          }
        }

        server.ws.send({
          type: 'custom',
          event: 'frontend-src-updated',
          data: { file: normalizedFile },
        });
      };

      server.watcher.add(frontendSrc);
      server.watcher.on('add', notifyClient);
      server.watcher.on('change', notifyClient);
      server.watcher.on('unlink', notifyClient);

      return () => {
        server.watcher.off('add', notifyClient);
        server.watcher.off('change', notifyClient);
        server.watcher.off('unlink', notifyClient);
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), watchFrontendSrcForFullReload()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  server: {
    port: 4174,
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
  },
});
