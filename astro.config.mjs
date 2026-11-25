// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import site from './src/data/site.json' with { type: 'json' };

export default defineConfig({
  site: site.seo.url,
  output: 'static',
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/design-system') })],
  vite: { plugins: [tailwindcss()] },
});
