import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
//
// `base` is left at the default ('/') so the app works out of the box in
// local dev and on a custom domain. If this is ever deployed to GitHub
// Pages as a *project* page (https://<user>.github.io/<repo>/) without a
// custom domain, set base to '/<repo-name>/' — see docs/ARCHITECTURE.md.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
