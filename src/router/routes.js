/**
 * 라우트 정의.
 *
 * 라우터 인스턴스와 분리해 둔 이유:
 *
 * SSR 스모크 테스트도 같은 목록이 필요하다. 헤더가 메뉴마다 RouterLink를 그리는데,
 * 이름이 등록되지 않은 라우트를 만나면 해석 단계에서 터진다. 테스트가 목록을
 * 따로 들고 있으면 메뉴를 추가할 때마다 양쪽이 어긋나므로 정의는 한 곳에만 둔다.
 *
 * 그런데 router/index.js를 import하면 createWebHistory가 함께 실행된다.
 * 브라우저 API를 건드리는 일이라 Node에서 돌리는 테스트에는 부담이다.
 * 이 파일은 부수 효과가 없어서 어디서든 안전하게 가져다 쓸 수 있다.
 *
 * component는 함수라 import만으로는 실행되지 않는다(지연 로딩).
 */
export const routes = [
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
    path: '/standings',
    name: 'standings',
    component: () => import('@/views/StandingsView.vue'),
    meta: { title: '챔피언십 순위' },
  },
  {
    path: '/plan',
    name: 'race-plan',
    component: () => import('@/views/RacePlanView.vue'),
    // requiresAuth: 전역 가드가 읽는 표식. 규칙은 가드 한 곳에만 두고,
    // 라우트는 '이 화면이 로그인을 요구한다'는 사실만 선언한다.
    meta: { title: '관전 플랜', requiresAuth: true },
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
