import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://northstar-it-services.frizqon.workers.dev',
  output: 'static',
  integrations: [
    preact(),
    sitemap({
      filter: (page) => !page.includes('/admin')
    })
  ],
  build: { assets: '_assets' }
});
