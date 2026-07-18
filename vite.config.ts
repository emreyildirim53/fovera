import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL || 'https://fovera.app').replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0] ?? '2026-07-18';

  return {
    base: '/',
    build: {
      target: 'es2020',
      sourcemap: false,
    },
    plugins: [
      {
        name: 'fovera-seo-artifacts',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'robots.txt',
            source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
          });
          this.emitFile({
            type: 'asset',
            fileName: 'sitemap.xml',
            source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
          });
        },
      },
      VitePWA({
        injectRegister: false,
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png'],
        manifest: {
          id: '/',
          name: 'Fovera',
          short_name: 'Fovera',
          description: 'The new era of focused reading.',
          theme_color: '#07070a',
          background_color: '#07070a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          lang: 'en',
          categories: ['books', 'education', 'productivity'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,xml,txt,webmanifest}'],
          globIgnores: [
            'assets/word-translations-*.json',
            'assets/pdf.worker.min-*.mjs',
            'books/**/*',
            'books-tr/**/*',
            'books/licenses/**/*',
            'covers/**/*.svg',
          ],
          runtimeCaching: [
            {
              urlPattern: /\/covers\/.*\.(?:png|jpg|jpeg|svg|webp)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'fovera-cover-assets',
                expiration: {
                  maxEntries: 32,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: /\/books(?:-tr)?\/.*\.(?:txt|html)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'fovera-book-assets',
                expiration: {
                  maxEntries: 96,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ],
  };
});
