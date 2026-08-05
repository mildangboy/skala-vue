import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/authStore'

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

/**
 * 전역 가드 — 로그인이 필요한 화면을 진입 '전에' 막는다.
 *
 * 예전에는 화면에 들어간 뒤 SignInGate가 안내를 띄웠다. 동작은 했지만
 * 순서가 뒤집혀 있었다. 관전 플랜 화면은 들어가는 순간 Firestore를 조회하는데,
 * 비로그인 상태에서는 보안 규칙이 어차피 거부하므로 헛요청이 한 번 나간다.
 * 진입 전에 판정하면 그 요청 자체가 없어진다.
 *
 * 두 가지를 조심한다.
 *
 * 1) Firebase 설정이 없으면 막지 않는다. 로그인할 방법 자체가 없는 환경이라
 *    막아버리면 아무도 못 들어간다(플랜은 이때 기기 저장으로 동작한다).
 * 2) 되돌아올 곳을 redirect 쿼리에 실어 보낸다. 로그인 후 홈에 남겨두면
 *    사용자가 원래 가려던 화면을 다시 찾아 들어가야 한다.
 */
router.beforeEach((to) => {
  if (!to.meta?.requiresAuth) return true

  const auth = useAuthStore()
  if (!auth.configured) return true
  if (auth.isSignedIn) return true

  return { name: 'weather-home', query: { redirect: to.fullPath, reason: 'auth' } }
})

// 전역 가드: 페이지 이동 시 문서 타이틀 동기화
router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} · ${BASE_TITLE}` : BASE_TITLE
})

export default router
