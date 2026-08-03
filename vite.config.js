import { fileURLToPath, URL } from 'node:url'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// GitHub Pages 배포용 base 경로. 저장소 이름이 skala-vue가 아니면 이 값을 바꿔주세요.
const REPO_NAME = 'skala-vue'

/**
 * GitHub Pages는 정적 파일 서버라 /skala-vue/f1 같은 경로에 해당하는 파일이 없으면
 * 그냥 404를 돌려준다. History 모드 SPA는 이 경로를 앱이 처리해야 하므로,
 * index.html을 404.html로 복사해 두면 GitHub Pages가 404 응답 대신 그 파일을 내려주고
 * 앱이 부팅되어 라우터가 경로를 처리한다.
 * (사이트 안에서 이동할 때는 문제가 없지만, 직접 접속·새로고침·링크 공유 시 필요)
 */
const githubPagesSpaFallback = () => ({
  name: 'github-pages-spa-fallback',
  closeBundle() {
    const dir = resolve(process.cwd(), 'dist')
    const index = resolve(dir, 'index.html')
    if (!existsSync(index)) return
    copyFileSync(index, resolve(dir, '404.html'))
    console.log('\nSPA 폴백 생성: dist/404.html')
  },
})

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${REPO_NAME}/` : '/',
  plugins: [vue(), vueDevTools(), githubPagesSpaFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
