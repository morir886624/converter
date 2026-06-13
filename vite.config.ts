import { defineConfig } from 'vite';
import { writeFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { conversions, DOMAIN } from './src/conversions.config';

function sitemapPlugin() {
  return {
    name: 'generate-sitemap',
    closeBundle() {
      const paths = ['/', '/app', ...conversions.map((c) => `/${c.slug}`)];
      const now = new Date().toISOString().split('T')[0];
      const urls = paths
        .map(
          (p) =>
            `  <url>\n    <loc>${DOMAIN}${p}</loc>\n    <lastmod>${now}</lastmod>\n  </url>`,
        )
        .join('\n');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
      writeFileSync('dist/sitemap.xml', xml);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    sitemapPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'ffmpeg/**'],
      manifest: {
        name: 'File Converter',
        short_name: 'Converter',
        description: 'Convert your files directly in the browser — 100% private.',
        theme_color: '#6366f1',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@imgly/background-removal'],
  },
  worker: {
    format: 'es',
  },
});
