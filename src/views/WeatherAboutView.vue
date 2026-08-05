<script setup>
import { ref } from 'vue'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'

const dialogVisible = ref(false)

const stack = [
  {
    name: 'Vue 3',
    desc: 'Composition API · <script setup> · Props/Emits · Slot(기본·이름·스코프드) · Provide/Inject',
  },
  { name: 'Vite', desc: '개발 서버 · 프로덕션 번들 · 환경 변수 · GitHub Pages SPA 폴백 플러그인' },
  {
    name: 'Vue Router',
    desc: '동적 라우트 · 지연 로딩 · 전역/라우트별 가드 · 쿼리 스트링 동기화 · 404',
  },
  {
    name: 'Pinia',
    desc: 'setup store 7개 — config · theme · weather · f1 · standings · plan · auth',
  },
  {
    name: 'Axios',
    desc: '인터셉터 기반. 외부 API 5곳 — OpenWeather · Jolpica-F1 · Open-Meteo · Identity Toolkit · Firestore',
  },
  { name: 'Element Plus', desc: 'Basic · Form · Data · Navigation · Feedback 등 29종 컴포넌트' },
  { name: 'Chart.js', desc: '기온 추이 · 포인트 누적 추이 · 라운드별 스파크라인 (테마 연동)' },
  {
    name: '백엔드',
    desc: 'Cloud Functions gen2 · Cloud Scheduler · Gmail API — 레이스 전날 알림 메일',
  },
  {
    name: '품질',
    desc: 'oxlint · ESLint · Prettier · SSR 스모크 테스트 · GitHub Actions 자동 배포',
  },
]

const features = [
  {
    title: 'F1 2026 시즌 연동',
    desc: '22개 그랑프리 일정과 서킷 좌표 기반 실시간 날씨. 다음 레이스까지 카운트다운.',
  },
  {
    title: '챔피언십 순위',
    desc: '드라이버 · 컨스트럭터 순위표와 포인트 누적 추이 차트. 끝난 라운드는 영구 캐시해 두 번째부터는 즉시 표시.',
  },
  {
    title: '레이스 컨디션 지수',
    desc: '기온 · 습도 · 바람 · 강수로 주행 조건을 점수화하고, 어떤 항목에서 몇 점이 깎였는지 근거를 함께 표시.',
  },
  {
    title: '레이스 시간대 예보',
    desc: '경기 시작 전후를 1시간 간격으로. 무료 티어 한계를 넘기려 이 기능만 Open-Meteo를 써서 16일 앞까지 본다.',
  },
  {
    title: '서킷 현지 시각',
    desc: '모든 경기 시각을 서킷 현지 기준과 내 표준시로 함께 표시. 서머타임까지 반영해 날짜가 갈리는 라운드도 정확히.',
  },
  {
    title: '서킷 레이아웃',
    desc: 'OpenStreetMap 좌표로 빌드 타임에 만든 SVG. 실측 길이를 FIA 공시값과 대조해 검증.',
  },
  {
    title: '관전 플랜',
    desc: '구글 로그인 후 Firestore에 등록. 목록은 함께 보되 수정 · 삭제는 작성자만. 연락처는 저장하지 않는다.',
  },
  {
    title: '알림 메일',
    desc: '레이스 전날 오전 9시, 경기 시작 시각에 가장 가까운 예보를 메일로 발송 (Cloud Functions + Scheduler).',
  },
  {
    title: 'Mock 데모 폴백',
    desc: '실시간 API가 답하지 않으면 데모 데이터로 화면을 채우고, 실측이 아니라는 사실을 함께 밝힌다.',
  },
  {
    title: '오프라인 대응',
    desc: 'TTL 캐시 + 온라인 상태 감지. Geolocation으로 내 위치 날씨도 조회.',
  },
  {
    title: '테마와 단위',
    desc: '라이트 / 다크 / 시스템 3단계 테마와 섭씨 / 화씨 전역 전환. OS 설정 변경도 실시간 반영.',
  },
  {
    title: '접근성',
    desc: '색만으로 뜻을 전하지 않고 문구를 함께 적는다. aria-label · role 지정, prefers-reduced-motion 대응.',
  },
]
</script>

<template>
  <div class="about">
    <section class="about__hero">
      <span class="about__badge">ABOUT</span>
      <h1>Weather F1</h1>
      <p>
        SK㈜ AX SKALA <em>Full-stack Engineering · Frontend Framework(Vue.js)</em> 과정의 전 챕터
        실습 내용을 하나의 완성형 애플리케이션으로 통합한 프로젝트입니다. 정적 Mockup → Composition
        API → 컴포넌트 분리 → 라우팅 → 상태 관리 → API 연동 → UI 라이브러리 → 빌드·배포로 이어지는
        커리큘럼을 모두 반영하고, 여기에 챔피언십 순위·관전 플랜·알림 메일·서킷 레이아웃·데이터
        시각화·오프라인 대응 등 자기주도 확장을 더했습니다.
      </p>
      <el-button type="primary" round @click="dialogVisible = true">디자인 컨셉 보기</el-button>
    </section>

    <BaseDashboardCard>
      <template #header><span>확장 기능</span></template>
      <div class="about__features">
        <div v-for="f in features" :key="f.title" class="about__feature">
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
        </div>
      </div>
    </BaseDashboardCard>

    <BaseDashboardCard>
      <template #header><span>기술 스택</span></template>
      <el-descriptions :column="1" border>
        <el-descriptions-item v-for="item in stack" :key="item.name" :label="item.name">
          {{ item.desc }}
        </el-descriptions-item>
      </el-descriptions>
    </BaseDashboardCard>

    <!-- el-dialog: 교재 Feedback 컴포넌트 활용 -->
    <el-dialog
      v-model="dialogVisible"
      title="디자인 컨셉"
      width="480px"
      align-center
      append-to-body
    >
      <div class="concept">
        <p>
          <strong>레이아웃</strong>은 Apple 날씨 앱의 언어를 따릅니다. 얇고 큰 온도 타이포그래피,
          반투명 글래스 카드, 가로 스크롤 시간별 스트립, 여백 중심의 정보 위계.
        </p>
        <p><strong>색상</strong>은 Mercedes-AMG PETRONAS F1 팀 팔레트를 사용합니다.</p>
        <div class="concept__swatches">
          <div><span style="background: #27f4d2" />Petronas Teal</div>
          <div><span style="background: #00a68f" />Teal Deep</div>
          <div><span style="background: #0a0a0a" />AMG Black</div>
          <div><span style="background: #c8ccce" />Silver</div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="dialogVisible = false">닫기</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.about__hero {
  padding: 30px 28px;
  border-radius: var(--radius-card);
  border: 1px solid var(--surface-border);
  background: linear-gradient(140deg, rgba(39, 244, 210, 0.14), transparent 58%), var(--surface);
  backdrop-filter: var(--blur-glass);
}
.about__badge {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: var(--accent);
}
.about__hero h1 {
  margin: 10px 0 8px;
  font-size: 30px;
}
.about__hero p {
  margin: 0 0 18px;
  max-width: 660px;
  line-height: 1.75;
  color: var(--text-secondary);
  font-size: 14px;
}
.about__hero em {
  font-style: normal;
  color: var(--accent);
  font-weight: 600;
}
.about__features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}
.about__feature h3 {
  margin: 0 0 5px;
  font-size: 14px;
  font-weight: 700;
}
.about__feature p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
}
.concept p {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.concept__swatches {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 14px;
}
.concept__swatches div {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.concept__swatches span {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
}
</style>
