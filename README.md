# SKALA Weather · F1 서킷 날씨 대시보드

<p align="center">
  <strong>Vue 3 + Vite + Pinia + Element Plus + Chart.js</strong><br/>
  Apple 날씨 앱의 레이아웃 언어 × Mercedes-AMG PETRONAS F1 팀 컬러
</p>

SK㈜ AX SKALA _Full-stack Engineering · Frontend Framework(Vue.js)_ 과정의 전 챕터 실습을
하나의 완성형 애플리케이션으로 통합하고, F1 2026 시즌 연동·데이터 시각화·오프라인 대응 등
자기주도 확장 기능을 더한 프로젝트입니다.

---

## 핵심 기능

### 🏁 F1 2026 시즌 연동 (독자 확장)

- 전 **22개 그랑프리** 일정과 서킷 좌표를 내장하고, 서킷 위치 기반 **실시간 날씨**를 조회
- 다음 레이스까지 **초 단위 카운트다운** (1초 갱신)
- 시즌 캘린더: 다가오는 / 종료된 / 전체 탭 · 그리드 ↔ 정렬 가능한 테이블 뷰 전환
- 서킷 상세: 레이스 데이 전망, 현재 컨디션, 24시간 기온 차트, 5일 예보
- 일정 데이터는 **Jolpica-F1 API 우선 조회 → 실패 시 내장 스냅샷 폴백**

### 🌤️ 도시 날씨

- Geocoding 자동완성 검색, 즐겨찾기 고정, 최근 검색 기록
- **Geolocation API**로 현재 위치 날씨 자동 조회
- 시간별 / 일별 예보, Chart.js 기온 추이 시각화

### 🎨 테마 & UX

- **라이트 / 다크 / 시스템 연동** 3단계 테마 (OS 설정 변경 실시간 반영, FOUC 방지)
- 섭씨 / 화씨 전역 전환 — 모든 화면이 즉시 재조회
- 스켈레톤 로딩, 페이지 전환 애니메이션, 반응형 레이아웃
- `aria-label` / `aria-pressed` / `role` 지정, `prefers-reduced-motion` 대응

### 📡 오프라인 대응

- TTL 기반 localStorage 캐시 (stale-while-revalidate)
- `online` / `offline` 이벤트 감지 후 배너 노출 — 네트워크가 끊겨도 마지막 데이터 표시

---

## 기술 스택

| 영역       | 사용 기술                                                         |
| ---------- | ----------------------------------------------------------------- |
| 프레임워크 | Vue 3 (Composition API, `<script setup>`)                         |
| 빌드       | Vite 8 · 환경 변수 · 코드 스플리팅                                |
| 라우팅     | Vue Router (동적 라우트 · 지연 로딩 · **Navigation Guard** · 404) |
| 상태 관리  | Pinia — `config` / `weather` / `f1` / `theme` 4개 스토어          |
| HTTP       | Axios (요청·응답 인터셉터, 공통 에러 정규화)                      |
| UI         | Element Plus (Form · Data · Navigation · Feedback 전 카테고리)    |
| 시각화     | Chart.js (tree-shaking 등록, 테마 연동)                           |
| 품질       | ESLint · oxlint · Prettier · SSR 스모크 테스트                    |

---

## 개발 환경

| 도구    | 버전                                            |
| ------- | ----------------------------------------------- |
| Node.js | **24.16.0** (`.nvmrc` / `.node-version`에 고정) |
| npm     | **11.13.0** (`packageManager` 필드에 고정)      |

```bash
# nvm 사용 시 — .nvmrc를 읽어 자동 전환
nvm install && nvm use

# fnm 사용 시
fnm use --install-if-missing

# npm 버전 맞추기
npm install -g npm@11.13.0

# 확인
node --version   # v24.16.0
npm --version    # 11.13.0
```

`engines` 필드에 `node >=24.16.0 <25`, `npm >=11.13.0`을 명시했습니다.
버전이 맞지 않으면 설치 시 경고가 표시됩니다(강제 차단하려면 `.npmrc`에 `engine-strict=true` 추가).

## 시작하기

```bash
npm install
cp .env.example .env   # VITE_OPENWEATHER_API_KEY 값을 본인 키로 채우세요
npm run dev
```

API 키는 <https://openweathermap.org/api> 에서 무료로 발급받을 수 있습니다.
F1 일정 API(Jolpica)는 인증이 필요 없습니다.

## 스크립트

| 명령                 | 설명                                               |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | 개발 서버 실행                                     |
| `npm run build`      | 프로덕션 빌드 (`dist/`)                            |
| `npm run preview`    | 빌드 결과 로컬 미리보기                            |
| `npm run lint`       | oxlint + ESLint 검사 및 자동 수정                  |
| `npm run format`     | Prettier 포맷팅                                    |
| `npm run test:smoke` | **SSR 스모크 테스트** — 전 화면 렌더링 크래시 검증 |
| `npm run deploy`     | `dist/`를 `gh-pages` 브랜치에 수동 배포            |

### SSR 스모크 테스트

브라우저 없이 6개 View를 서버 렌더링해 런타임 크래시·템플릿 오류를 잡습니다.
CI(GitHub Actions)에서 lint 직후 자동 실행됩니다.

```
PASS  WeatherHomeView      (4035 chars)
PASS  F1CalendarView       (8111 chars)
PASS  CircuitDetailView    (2509 chars)
PASS  WeatherDetailView    (2079 chars)
PASS  WeatherAboutView     (4007 chars)
PASS  NotFoundView         (2271 chars)
```

---

## 배포 (GitHub Pages)

1. **GitHub Actions (권장)** — `main`에 push하면 `.github/workflows/deploy.yml`이
   lint → smoke test → build → Pages 배포를 자동 수행합니다.
   - 저장소 Settings → Secrets and variables → Actions에 `VITE_OPENWEATHER_API_KEY` 등록
   - Settings → Pages → Source를 **GitHub Actions**로 설정
2. **수동 배포** — `npm run build && npm run deploy`

> `vite.config.js`의 `REPO_NAME`이 실제 저장소 이름과 일치해야 정적 경로가 맞습니다.

## 보안

`.env`는 `.gitignore`에 포함되어 API 키가 Git에 업로드되지 않습니다.
저장소에는 `.env.example`만 커밋됩니다.

---

## 프로젝트 구조

```
src/
├─ api/           axios 클라이언트 · OpenWeatherMap · Jolpica-F1
├─ components/    RaceHero · CircuitWeatherCard · WeatherCard · TempChart
│                 SearchBar · ThemeToggle · UnitToggle · SkeletonCard · OfflineBanner
├─ data/          F1 2026 캘린더 스냅샷 (22개 GP · 서킷 좌표)
├─ router/        라우트 정의 · Navigation Guard · 타이틀 동기화
├─ stores/        config(단위) · weather(도시/즐겨찾기) · f1(시즌) · theme(다크모드)
├─ utils/         포맷터 · 아이콘 매핑 · TTL 캐시 · 온라인 감지 · Geolocation
└─ views/         WeatherHome · WeatherDetail · F1Calendar · CircuitDetail · About · NotFound
tests/            SSR 스모크 테스트 + 브라우저 API shim
```

---

## 크레딧

- 날씨 데이터 — [OpenWeatherMap](https://openweathermap.org/)
- F1 일정 데이터 — [Jolpica-F1](https://github.com/jolpica/jolpica-f1) (Ergast API 후속)
- 본 프로젝트는 학습 목적의 비영리 결과물이며 Mercedes-AMG PETRONAS F1 Team과 무관합니다.
