import { defineConfig } from 'astro/config';

// SITE / BASE can be overridden at build time, e.g. for GitHub Pages:
//   SITE=https://<user>.github.io BASE=/AG-Zott-Website npm run build
export default defineConfig({
  site: process.env.SITE || 'https://example.org',
  base: process.env.BASE || '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
