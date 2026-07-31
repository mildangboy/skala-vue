import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// SSR 스모크 테스트 전용 설정 — tests/ssr-smoke.mjs를 Node에서 실행 가능한 번들로 빌드한다.
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    ssr: 'tests/ssr-smoke.mjs',
    outDir: 'smoke-dist',
    emptyOutDir: true,
    rollupOptions: { output: { format: 'esm' } },
  },
  ssr: { noExternal: true },
})
