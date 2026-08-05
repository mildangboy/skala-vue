# Weather F1 · F1 서킷 날씨 대시보드

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
- 그랑프리 정보 모달: 주말 세션 일정(시각 순 정렬), 서킷 제원·레이아웃, 최근 5년 우승자와 최고 랩
- 일정 데이터는 **Jolpica-F1 API 우선 조회 → 실패 시 내장 스냅샷 폴백**.
  시즌 중 개최지가 바뀌어도(2026 바레인 GP → 세팡) 라이브 일정을 그대로 따른다

### 🏆 챔피언십 순위 (독자 확장)

- 드라이버 / 컨스트럭터 순위표 — 포인트·승수 정렬, **실제 팀 컬러** 표기
- **시즌 포인트 누적 추이 차트** (상위 10) — 라운드별 순위를 모아 직접 구성.
  팀메이트는 같은 색 파선으로 구분하고, 선 끝에 이름을 직접 그려 범례 없이 읽힌다
- 각 행에 **최근 5경기 획득 포인트 스파크라인** — 누적값의 차분이라 추가 요청 없음
- 끝난 라운드의 순위는 불변이므로 라운드 단위로 영구 캐시.
  최초 4초 → 이후 1ms. 표를 먼저 띄우고 추이는 뒤에서 채운다

### 🌧️ 레이스 시간대 예보 (독자 확장)

- 경기 시작 1시간 전 ~ 3시간 후를 **1시간 간격**으로 — 강수확률·기온·바람
- 경기 중 최대 강수확률로 우천 여부를 한 줄 판정 (평균이 아니라 최대값을 쓰는 이유는
  두 시간 중 한 시간만 쏟아져도 레이스 결과가 뒤집히기 때문)
- 이 기능만 **Open-Meteo**(16일·1시간·키 불필요)를 쓴다.
  OpenWeather 무료 예보는 5일·3시간이라 2주 간격인 레이스를 대부분 놓치고,
  두 시간짜리 경기가 3시간 칸 하나에 뭉개진다

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
| 상태 관리  | Pinia — `config` / `weather` / `f1` / `standings` / `plan` / `auth` / `theme` |
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

### SPA 라우팅과 404

GitHub Pages는 정적 파일 서버라 `/f1` 같은 경로에 해당하는 파일이 없으면 404를 돌려줍니다.
History 모드 SPA는 이 경로를 앱이 처리해야 하므로, 빌드 시 `index.html`을 `404.html`로
복사합니다(`vite.config.js`의 `github-pages-spa-fallback` 플러그인). 덕분에 하위 경로로
직접 접속하거나 새로고침해도 앱이 부팅되어 라우터가 경로를 처리합니다.

## 보안

`.env`는 `.gitignore`에 포함되어 API 키가 Git에 업로드되지 않습니다.
저장소에는 `.env.example`만 커밋됩니다.

---

## 프로젝트 구조

```
src/
├─ api/           axios 클라이언트 · OpenWeatherMap · Jolpica-F1(공용 재시도/배치)
│                 standings(순위) · raceWeather(Open-Meteo) · firebase · plans
├─ components/    RaceHero · CircuitWeatherCard · WeatherCard · TempChart
│                 PointsProgressChart · PointsSparkline · RaceWindowForecast
│                 CircuitOutline · RaceInfoDialog · AuthMenu · PlanForm
│                 SearchBar · ThemeToggle · UnitToggle · SkeletonCard · OfflineBanner
├─ data/          F1 2026 캘린더 스냅샷 · 서킷 레이아웃(OSM) · 팀 컬러
├─ router/        라우트 정의 · Navigation Guard · 타이틀 동기화
├─ stores/        config(단위) · weather(도시/즐겨찾기) · f1(시즌) · standings(순위)
│                 plan(관전 플랜) · auth(로그인) · theme(다크모드)
├─ utils/         포맷터 · 아이콘 매핑 · TTL 캐시 · 온라인 감지 · Geolocation
└─ views/         WeatherHome · WeatherDetail · F1Calendar · CircuitDetail
                  Standings · RacePlan · About · NotFound
tests/            SSR 스모크 테스트 + 브라우저 API shim
```

---

## 크레딧

- 날씨 데이터 — [OpenWeatherMap](https://openweathermap.org/)
- 레이스 시간대 예보 — [Open-Meteo](https://open-meteo.com/) (CC BY 4.0)
- F1 일정·결과·순위 데이터 — [Jolpica-F1](https://github.com/jolpica/jolpica-f1) (Ergast API 후속)
- 서킷 레이아웃 — [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL 1.0)
- 본 프로젝트는 학습 목적의 비영리 결과물이며 Mercedes-AMG PETRONAS F1 Team과 무관합니다.
