import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import legacy from '@vitejs/plugin-legacy';

// ビルド実行時の日本時間（JST）からバージョン文字列を生成 (例: v20261107-1030)
function getJstVersion(): string {
  const now = new Date();
  const jstDate = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60000);
  const yyyy = jstDate.getFullYear();
  const mm = String(jstDate.getMonth() + 1).padStart(2, '0');
  const dd = String(jstDate.getDate()).padStart(2, '0');
  const hh = String(jstDate.getHours()).padStart(2, '0');
  const min = String(jstDate.getMinutes()).padStart(2, '0');
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
  ],
  // GitHub Pages / サブディレクトリ配備用の相対パス設定
  base: './',
  define: {
    __BUILD_VERSION__: JSON.stringify(getJstVersion()),
  },
  build: {
    // 音声アセットやレガシーバンドルを含むため警告上限を緩和
    chunkSizeWarningLimit: 2000,
  },
});
