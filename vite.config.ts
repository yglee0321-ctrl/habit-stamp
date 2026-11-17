import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

// mode 'web'  : 독립 웹사이트 (Firebase 로그인, 홈 화면 앱 설치)
// 그 외       : Claude 아티팩트용 HTML 한 장
export default defineConfig(({ mode }) => {
  const web = mode === 'web';

  const webHead: Plugin = {
    name: 'web-head',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `    <link rel="icon" type="image/svg+xml" href="icon.svg" />
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="습관도장" />
  </head>`
      );
    },
  };

  return {
    base: web ? process.env.BASE_PATH || '/' : './',
    plugins: [
      react(),
      tailwindcss(),
      ...(web
        ? [
            webHead,
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['apple-touch-icon.png', 'icon.svg'],
              workbox: {
                // 앱 화면(코드·아이콘)만 저장해 빠르게 열리게 하고, 기록 데이터는 저장하지 않음
                globPatterns: ['**/*.{js,css,html,svg,png}'],
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
                navigateFallback: 'index.html',
              },
              manifest: {
                id: './',
                name: '습관 도장',
                short_name: '습관도장',
                description: '매일의 기록과 달성을 한 장의 표로',
                lang: 'ko',
                theme_color: '#C23B22',
                background_color: '#FCFAF6',
                display: 'standalone',
                start_url: './',
                scope: './',
                icons: [
                  { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                  { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                  { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
              },
            }),
          ]
        : [viteSingleFile()]),
    ],
    build: web ? { outDir: 'dist-web' } : { outDir: 'dist', assetsInlineLimit: 100000000, copyPublicDir: false },
  };
});
