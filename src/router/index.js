import { createRouter, createWebHistory } from 'vue-router'

// 모든 라우트를 지연 로딩(lazy load)하여 초기 번들 크기를 최소화
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'weather-home',
      component: () => import('@/views/WeatherHomeView.vue'),
    },
    {
      path: '/city/:city',
      name: 'weather-detail',
      component: () => import('@/views/WeatherDetailView.vue'),
      props: true,
    },
    {
      path: '/about',
      name: 'weather-about',
      component: () => import('@/views/WeatherAboutView.vue'),
    },
    {
      // 정의되지 않은 모든 경로 -> 404 처리 (catch-all)
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
