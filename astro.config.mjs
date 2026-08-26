// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.usts1.com',
  trailingSlash: 'never',
  integrations: [
    react(),
    sitemap({
      // The apply form and privacy page carry no search value of their own.
      filter: (page) => !page.includes('/careers/apply'),
    }),
  ],
  build: {
    // SWA serves /about.html for /about, so keep flat files rather than dir/index.html.
    format: 'file',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
