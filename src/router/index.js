import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

const BASE_TITLE = 'SKALA Weather'

// 모든 라우트를 지연 로딩(lazy load)하여 초기 번들 크기를 최소화
const routes = [
  {
    path: '/',
    name: 'weather-home',
    component: () => import('@/views/WeatherHomeView.vue'),
    meta: { title: '홈' },
  },
  {
    path: '/city/:city',
    name: 'weather-detail',
    component: () => import('@/views/WeatherDetailView.vue'),
    props: true,
    meta: { title: '도시 날씨', parent: 'weather-home' },
    // 라우트 단위 가드: 도시명이 비어있으면 홈으로 되돌린다
    beforeEnter: (to) => {
      const city = String(to.params.city ?? '').trim()
      if (!city) return { name: 'weather-home' }
      return true
    },
  },
  {
    path: '/f1',
    name: 'f1-calendar',
    component: () => import('@/views/F1CalendarView.vue'),
    meta: { title: 'F1 2026 캘린더' },
  },
  {
    path: '/f1/:circuitId',
    name: 'circuit-detail',
    component: () => import('@/views/CircuitDetailView.vue'),
    props: true,
    meta: { title: '서킷 날씨', parent: 'f1-calendar' },
    // 여기서 서킷 ID가 유효한지 판정하지 않는다.
    //
    // 예전에는 내장 캘린더에 있는 ID인지 확인하고 없으면 404로 보냈다.
    // 하지만 내장 캘린더는 빌드 시점의 스냅샷이라 시즌 중에 일정이 바뀌면
    // 실제로 열리는 경기를 없는 서킷으로 판정한다(2026년 바레인 GP가
    // 세팡으로 옮겨가면서 실제로 이 일이 났다).
    //
    // 유효한 서킷 목록은 라이브 API만 알고 있고, 라우터 가드는 동기라
    // 그 답을 기다릴 수 없다. 그래서 판정은 데이터를 쥐고 있는 화면 쪽에 맡긴다.
  },
  {
    path: '/plan',
    name: 'race-plan',
    component: () => import('@/views/RacePlanView.vue'),
    meta: { title: '관전 플랜' },
  },
  {
    path: '/about',
    name: 'weather-about',
    component: () => import('@/views/WeatherAboutView.vue'),
    meta: { title: '소개' },
  },
  {
    // 정의되지 않은 모든 경로 -> 404 (catch-all)
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '페이지를 찾을 수 없음' },
  },
]

// 단일 HTML 데모(file:// 실행)에서는 서버 없이 동작하도록 해시 히스토리를 사용한다
const history =
  import.meta.env.VITE_STANDALONE === 'true'
    ? createWebHashHistory()
    : createWebHistory(import.meta.env.BASE_URL)

const router = createRouter({
  history,
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 뒤로가기 시 이전 스크롤 위치 복원
    return savedPosition ?? { top: 0, behavior: 'smooth' }
  },
})

// 전역 가드: 페이지 이동 시 문서 타이틀 동기화
router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} · ${BASE_TITLE}` : BASE_TITLE
})

export default router
