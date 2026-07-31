import { createRouter, createWebHistory } from 'vue-router'
import { F1_CALENDAR_2026 } from '@/data/f1Calendar2026'

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
    // 존재하지 않는 서킷 ID로 접근하면 404로 보낸다
    beforeEnter: (to) => {
      const known = F1_CALENDAR_2026.some((r) => r.circuitId === to.params.circuitId)
      if (!known) return { name: 'not-found', params: { pathMatch: to.path.slice(1).split('/') } }
      return true
    },
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

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
