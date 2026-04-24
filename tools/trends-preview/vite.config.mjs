import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '../../frontend/node_modules/vite/dist/node/index.js';
import react from '../../frontend/node_modules/@vitejs/plugin-react/dist/index.js';
import tailwindcss from '../../frontend/node_modules/@tailwindcss/vite/dist/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const frontendRoot = path.resolve(repoRoot, 'frontend');

function frontendNodeModule(name) {
  return path.resolve(frontendRoot, 'node_modules', name);
}

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(frontendRoot, 'public'),
  plugins: [react(), tailwindcss()],
  server: {
    port: 4174,
    host: '127.0.0.1',
    fs: {
      allow: [repoRoot, frontendRoot],
    },
  },
  preview: {
    port: 4174,
    host: '127.0.0.1',
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(frontendRoot, 'src') },
      { find: /^react$/, replacement: frontendNodeModule('react') },
      { find: /^react\/jsx-runtime$/, replacement: frontendNodeModule('react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: frontendNodeModule('react/jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: frontendNodeModule('react-dom') },
      { find: /^react-dom\/client$/, replacement: frontendNodeModule('react-dom/client.js') },
      { find: /^lucide-react$/, replacement: frontendNodeModule('lucide-react') },
      { find: /^class-variance-authority$/, replacement: frontendNodeModule('class-variance-authority') },
      { find: /^clsx$/, replacement: frontendNodeModule('clsx') },
      { find: /^tailwind-merge$/, replacement: frontendNodeModule('tailwind-merge') },
      { find: /^radix-ui$/, replacement: frontendNodeModule('radix-ui') },
      { find: /^\.\.\/context\/AuthContext$/, replacement: path.resolve(__dirname, 'src/mocks/AuthContext.jsx') },
      { find: /^\.\.\/lib\/assessmentHistory$/, replacement: path.resolve(__dirname, 'src/mocks/assessmentHistory.js') },
    ],
  },
});
