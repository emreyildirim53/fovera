import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Live domain. fovera.app currently serves a parked "Coming Soon" page, so pointing
  // robots/sitemap/canonical there sent crawlers away from the real site.
  // Override with VITE_SITE_URL when the app moves to another domain.
  const siteUrl = (env.VITE_SITE_URL || 'https://fovera.mryildirim.com').replace(/\/+$/, '');
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
        // Social crawlers (WhatsApp, X, Facebook) don't run JS, so the runtime i18n
        // update never reaches them: ship absolute og/twitter/canonical URLs in the HTML.
        transformIndexHtml(html) {
          // Static JSON-LD so search engines and AI crawlers that don't run JS still see it
          // (src/i18n.ts refreshes it at runtime with the same shape per locale).
          const structuredData = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            '@id': `${siteUrl}/#app`,
            name: 'Fovera',
            alternateName: 'Fovera Flow',
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web browser (PWA)',
            description:
              'Fovera is a focused reading app that keeps every word centered, supports bilingual stories, and helps you read faster with calm, gesture-based control.',
            url: `${siteUrl}/`,
            image: `${siteUrl}/og-image.jpg`,
            screenshot: `${siteUrl}/og-image.jpg`,
            inLanguage: ['en', 'tr'],
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            featureList: [
              'Rapid serial visual presentation: every word stays centered',
              'Bilingual English and Turkish stories with optional word translations',
              'Gesture control for pace, pause and navigation',
              'PDF import',
              'Local-first reading progress, themes and statistics',
              'Installable PWA',
            ],
            author: {
              '@type': 'Person',
              '@id': 'https://www.mryildirim.com/#person',
              name: 'Emre Yıldırım',
              url: 'https://www.mryildirim.com/',
            },
            sameAs: ['https://www.mryildirim.com/portfolio/fovera', 'https://github.com/emreyildirim53/fovera'],
          }).replace(/</g, '\\u003c');
          return html
            .replace(
              '<script type="application/ld+json" id="structured-data"></script>',
              `<script type="application/ld+json" id="structured-data">${structuredData}</script>`
            )
            .replace(/(<meta property="og:image" content=")\/([^"]*")/, `$1${siteUrl}/$2`)
            .replace(/(<meta name="twitter:image" content=")\/([^"]*")/, `$1${siteUrl}/$2`)
            .replace('<meta property="og:url" content="/" />', `<meta property="og:url" content="${siteUrl}/" />`)
            .replace('<link rel="canonical" href="/" id="canonical-link" />', `<link rel="canonical" href="${siteUrl}/" id="canonical-link" />`);
        },
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'llms.txt',
            source: `# Fovera

> Fovera is a free focused-reading web app (installable PWA) by Emre Yıldırım. It shows text one word at a time in the center of the screen (rapid serial visual presentation), so the eye stays on one point while the text moves. Gestures control pace and navigation; the library has bilingual English/Turkish public-domain stories and you can import your own PDFs.

- Live app: ${siteUrl}/
- Price: free, runs in the browser, installable as a PWA
- Languages: English and Turkish (interface and stories), optional word-by-word translations
- Controls: tap anywhere to start or pause; horizontal swipes change speed; vertical swipes move between sentences and pages
- Privacy: local-first — reading position, speed, themes and stats stay in the browser
- Source code: https://github.com/emreyildirim53/fovera
- Project page: https://www.mryildirim.com/en/portfolio/fovera
- Developer: Emre Yıldırım — https://www.mryildirim.com/
`,
          });
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
