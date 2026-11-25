// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import site from './src/data/site.json' with { type: 'json' };

export default defineConfig({
  site: site.seo.url,
  output: 'static',
  // All CSS is ~14 KB gzipped: inlining removes two render-blocking requests.
  build: { inlineStylesheets: 'always' },
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/design-system') })],
  vite: { plugins: [tailwindcss()] },
});
