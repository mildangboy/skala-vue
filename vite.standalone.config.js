import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const OUT_DIR = 'standalone'

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 빌드 산출물(JS/CSS/favicon)을 index.html에 인라인해
 * 서버 없이 file:// 로 바로 열리는 단일 HTML을 만든다.
 *
 * 주의: String.replace의 문자열 치환은 $&, $' 같은 패턴을 특수 해석하므로
 * 반드시 치환 "함수"를 사용해야 번들이 손상되지 않는다.
 */
const inlineEverything = () => ({
  name: 'inline-everything',
  closeBundle() {
    const dir = resolve(process.cwd(), OUT_DIR)
    const htmlPath = resolve(dir, 'index.html')
    let html = readFileSync(htmlPath, 'utf8')
    const assetsDir = resolve(dir, 'assets')

    for (const file of readdirSync(assetsDir)) {
      const content = readFileSync(resolve(assetsDir, file), 'utf8')
      const name = escapeRegExp(file)

      if (file.endsWith('.css')) {
        const re = new RegExp(`<link[^>]*href="[^"]*${name}"[^>]*>`)
        if (!re.test(html)) throw new Error(`CSS 링크 태그를 찾지 못했습니다: ${file}`)
        html = html.replace(re, () => `<style>${content}</style>`)
      } else if (file.endsWith('.js')) {
        const re = new RegExp(`<script[^>]*src="[^"]*${name}"[^>]*></script>`)
        if (!re.test(html)) throw new Error(`script 태그를 찾지 못했습니다: ${file}`)
        const safe = content.replace(/<\/script>/gi, '<\\/script>')
        // IIFE 번들은 defer가 적용되지 않으므로, #app이 존재하는 </body> 직전으로 옮긴다
        html = html.replace(re, () => '')
        html = html.replace('</body>', () => `<script>${safe}</script>\n  </body>`)
      }
    }

    // favicon을 data URI로 인라인
    const favicon = resolve(dir, 'favicon.svg')
    if (existsSync(favicon)) {
      const uri = `data:image/svg+xml;base64,${readFileSync(favicon).toString('base64')}`
      html = html.replace(/href="\.?\/?favicon\.svg"/, () => `href="${uri}"`)
      rmSync(favicon, { force: true })
    }

    if (/<script[^>]*\ssrc=/.test(html) || /<link[^>]*rel="stylesheet"/.test(html)) {
      throw new Error('인라인되지 않은 외부 참조가 남아 있습니다.')
    }

    writeFileSync(htmlPath, html)
    rmSync(assetsDir, { recursive: true, force: true })
    console.log(`\n단일 HTML 생성 완료: ${OUT_DIR}/index.html`)
  },
})

export default defineConfig({
  base: './',
  // 단일 HTML 데모에는 API 키를 절대 굽지 않는다. 사용자가 실행 시 직접 입력한다.
  envFile: false,
  define: {
    'import.meta.env.VITE_STANDALONE': '"true"',
    'import.meta.env.VITE_OPENWEATHER_API_KEY': '""',
    'import.meta.env.VITE_OPENWEATHER_BASE_URL': '"https://api.openweathermap.org"',
  },
  plugins: [vue(), inlineEverything()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'assets/app.js' },
    },
  },
})
