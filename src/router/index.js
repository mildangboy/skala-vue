import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { routes } from './routes'

const BASE_TITLE = 'Weather F1'

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
