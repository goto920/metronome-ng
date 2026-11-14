import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

function getJstVersion(): string {
  const now = new Date();
  // Intl API を使って強制的に日本の現在日時を取得
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const yyyy = getPart('year');
  const mm = getPart('month');
  const dd = getPart('day');
  const hh = getPart('hour');
  const min = getPart('minute');

  return `v${yyyy}${mm}${dd}-${hh}${min}`;
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      targets: ['ios >= 12', 'safari >= 12', 'defaults'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),

    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-512x512.png', 'pwa-192x192.png', '**/*.mp3'],
      manifest: {
        name: "KG's Metronome Next Generation",
        short_name: 'Metronome-NG',
        description: 'High-precision web metronome and groove machine for drummers',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // 全 JS/CSS/HTML/JSON および mp3 音声をオフライン用に事前キャッシュ
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,mp3}'],
        // 音声ファイルを含めるため 1 ファイルあたりのキャッシュ上限を 10MB に拡張
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
  base: './',
  define: {
    __BUILD_VERSION__: JSON.stringify(getJstVersion()),
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
