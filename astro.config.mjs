// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://sonicxboy.dev',
  adapter: vercel({ maxDuration: 60 }),
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.endsWith('/viewports/') &&
        !page.endsWith('/stats/') &&
        !page.endsWith('/en/stats/') &&
        !page.endsWith('/stats/privacy/') &&
        !page.endsWith('/horus/'),
    }),
  ],
});
