import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
//
// `base` defaults to '/', which is correct for local dev, `vite preview`,
// and a custom-domain deployment. The GitHub Pages workflow
// (.github/workflows/deploy.yml) is the only place that sets
// `VITE_BASE_PATH=/pecasluissantos/` — this repo is deployed as a GitHub
// Pages *project* page (https://jorgepita.github.io/pecasluissantos/), not
// a user/org page, so the app needs to know its own path prefix. Reading
// it from an env var (rather than hardcoding it here) keeps a plain local
// `npm run build` producing the same '/'-rooted output it always has — see
// docs/ARCHITECTURE.md ("Deployment strategy").
//
// `import.meta.env.BASE_URL` (Vite's own reflection of this value) is what
// `src/app/App.tsx` passes to `BrowserRouter`'s `basename` — so this is the
// single place the path prefix is defined; nothing else hardcodes it.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
