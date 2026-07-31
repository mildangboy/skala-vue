# SKALA Weather Dashboard (skala-vue)

Vue 3 + Vite 기반의 실시간 날씨 대시보드입니다. SK㈜ AX SKALA *Full-stack Engineering · Frontend Framework(Vue.js)* 과정의
커리큘럼(Composition API → 컴포넌트 분리 → 라우팅 → 상태 관리 → API 연동 → UI 라이브러리)을 하나의 완성형 애플리케이션으로 구현했습니다.

## 주요 기능

- 도시 검색(Geocoding 자동완성) 및 실시간 날씨 조회
- 즐겨찾기 도시 대시보드, 최근 검색 기록 (localStorage 영속화)
- 도시 상세 페이지: 시간별/일별 예보
- 섭씨/화씨 단위 전역 토글 (Pinia)
- 404 Not Found 처리, 라우트 지연 로딩(lazy load)
- Element Plus 기반 UI, 반응형 레이아웃

## 기술 스택

Vue 3(Composition API, `<script setup>`) · Vite · Vue Router · Pinia · Axios · Element Plus · ESLint + oxlint + Prettier

## 시작하기

```bash
npm install
cp .env.example .env   # VITE_OPENWEATHER_API_KEY 값을 본인의 OpenWeatherMap API 키로 채워주세요
npm run dev
```

API 키는 https://openweathermap.org/api 에서 무료로 발급받을 수 있습니다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 로컬 미리보기 |
| `npm run lint` | oxlint + eslint 검사 및 자동 수정 |
| `npm run format` | Prettier 포맷팅 |
| `npm run deploy` | `dist/`를 `gh-pages` 브랜치에 수동 배포 |

## 배포 (GitHub Pages)

두 가지 방식 중 하나를 사용할 수 있습니다.

1. **GitHub Actions (권장)** — `main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동으로 lint → build → Pages 배포까지 수행합니다.
   저장소 Settings → Secrets and variables → Actions에 `VITE_OPENWEATHER_API_KEY`를 등록하세요.
   Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 설정해야 합니다.
2. **수동 배포** — 로컬에서 `npm run build && npm run deploy` 실행 시 `dist/`가 `gh-pages` 브랜치로 push됩니다.

> `vite.config.js`의 `REPO_NAME` 값이 실제 GitHub 저장소 이름과 다르면 빌드 결과 경로가 어긋나니 반드시 일치시켜 주세요.

## 보안

`.env` 파일은 `.gitignore`에 포함되어 있어 API 키가 Git에 업로드되지 않습니다. `.env.example`만 저장소에 커밋됩니다.

## 프로젝트 구조

```
src/
├─ api/            axios 클라이언트, OpenWeatherMap API 함수
├─ components/      SearchBar, WeatherCard, WeatherParent, BaseDashboardCard 등
├─ router/          라우트 정의 (지연 로딩)
├─ stores/          Pinia 스토어 (config: 단위, weather: 즐겨찾기/검색)
├─ utils/           포맷터, 아이콘 매핑
└─ views/           WeatherHomeView, WeatherDetailView, WeatherAboutView, NotFoundView
```
