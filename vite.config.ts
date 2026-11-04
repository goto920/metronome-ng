import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      // iOS 12 などのレガシーブラウザ向けにPolyfillと旧構文を出力
      targets: ['ios >= 12', 'safari >= 12', 'defaults'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ],
  // 相対パスでビルド（GitHub Pages やローカル配備を容易にする）
  base: './',
})
