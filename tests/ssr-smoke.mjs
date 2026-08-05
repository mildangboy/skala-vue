import './browser-shim.mjs'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { routes } from '@/router/routes'
import WeatherHomeView from '@/views/WeatherHomeView.vue'
import F1CalendarView from '@/views/F1CalendarView.vue'
import CircuitDetailView from '@/views/CircuitDetailView.vue'
import WeatherDetailView from '@/views/WeatherDetailView.vue'
import WeatherAboutView from '@/views/WeatherAboutView.vue'
import RacePlanView from '@/views/RacePlanView.vue'
import StandingsView from '@/views/StandingsView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const VIEW_MAP = {
  WeatherHomeView,
  F1CalendarView,
  CircuitDetailView,
  WeatherDetailView,
  WeatherAboutView,
  RacePlanView,
  StandingsView,
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
  ['StandingsView', '/standings', {}],
  ['NotFoundView', '/nope', {}],
]

/**
 * 검사 대상이 실제 라우트를 빠짐없이 덮는지 먼저 확인한다.
 *
 * 화면을 새로 만들고 이 목록에 넣는 걸 잊으면, 테스트는 조용히 통과하면서
 * 정작 새 화면만 검사되지 않는다. 그런 침묵이 제일 나쁘다.
 */
const covered = new Set(views.map(([, path]) => path))
const uncovered = routes
  .map((r) => r.path)
  .filter((p) => !p.includes(':') && !covered.has(p))
if (uncovered.length) {
  console.log(`FAIL  검사 목록에 빠진 라우트: ${uncovered.join(', ')}`)
  process.exit(1)
}

let failed = 0
for (const [name, path] of views) {
  try {
    const ViewComp = VIEW_MAP[name]
    if (!ViewComp) throw new Error(`VIEW_MAP에 ${name}이(가) 등록되지 않았습니다`)
    const router = createRouter({
      history: createMemoryHistory(),
      // 실제 라우트의 경로·이름을 그대로 쓰고 컴포넌트만 검사 대상으로 바꾼다.
      // 헤더의 RouterLink가 모든 메뉴 이름을 해석할 수 있어야 하기 때문이다.
      routes: routes.map((r) => ({ path: r.path, name: r.name, component: ViewComp })),
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
