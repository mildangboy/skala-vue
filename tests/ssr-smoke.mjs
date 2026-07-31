import './browser-shim.mjs'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import WeatherHomeView from '@/views/WeatherHomeView.vue'
import F1CalendarView from '@/views/F1CalendarView.vue'
import CircuitDetailView from '@/views/CircuitDetailView.vue'
import WeatherDetailView from '@/views/WeatherDetailView.vue'
import WeatherAboutView from '@/views/WeatherAboutView.vue'
import RacePlanView from '@/views/RacePlanView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const VIEW_MAP = {
  WeatherHomeView,
  F1CalendarView,
  CircuitDetailView,
  WeatherDetailView,
  WeatherAboutView,
  RacePlanView,
  NotFoundView,
}

/**
 * SSR 스모크 테스트 — 각 View를 서버 렌더링해서 런타임 크래시/템플릿 오류를 잡는다.
 * 브라우저 전용 API는 최소 shim으로 대체한다.
 */
const views = [
  ['WeatherHomeView', '/', {}],
  ['F1CalendarView', '/f1', {}],
  ['CircuitDetailView', '/f1/zandvoort', {}],
  ['WeatherDetailView', '/city/Seoul', {}],
  ['WeatherAboutView', '/about', {}],
  ['RacePlanView', '/plan', {}],
  ['NotFoundView', '/nope', {}],
]

let failed = 0
for (const [name, path] of views) {
  try {
    const ViewComp = VIEW_MAP[name]
    if (!ViewComp) throw new Error(`VIEW_MAP에 ${name}이(가) 등록되지 않았습니다`)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'weather-home', component: ViewComp },
        { path: '/f1', name: 'f1-calendar', component: ViewComp },
        { path: '/f1/:circuitId', name: 'circuit-detail', component: ViewComp },
        { path: '/city/:city', name: 'weather-detail', component: ViewComp },
        { path: '/about', name: 'weather-about', component: ViewComp },
        { path: '/plan', name: 'race-plan', component: ViewComp },
        { path: '/:pathMatch(.*)*', name: 'not-found', component: ViewComp },
      ],
    })
    const app = createSSRApp(App)
    app.use(createPinia())
    app.use(router)
    await router.push(path)
    await router.isReady()
    const html = await renderToString(app)
    const ok = html.length > 200
    console.log(`${ok ? 'PASS' : 'WARN'}  ${name.padEnd(20)} (${html.length} chars)`)
    if (process.env.DUMP === name) {
      console.log('\n--- rendered text ---')
      console.log(
        html
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 900),
      )
      console.log('---\n')
    }
    if (!ok) failed++
  } catch (err) {
    failed++
    console.log(`FAIL  ${name.padEnd(20)} ${err.message.split('\n')[0]}`)
  }
}
console.log(failed ? `\n${failed} view(s) failed` : '\nAll views rendered successfully')
process.exit(failed ? 1 : 0)
