<script setup>
import { ref } from 'vue'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'

const dialogVisible = ref(false)

const stack = [
  { name: 'Vue 3', desc: 'Composition API · <script setup> · SFC' },
  { name: 'Vite', desc: '개발 서버 / 프로덕션 번들 / 환경 변수' },
  { name: 'Vue Router', desc: '동적 라우트 · 지연 로딩 · Navigation Guard · 404' },
  { name: 'Pinia', desc: 'config / weather / f1 / theme 4개 스토어' },
  { name: 'Axios', desc: '인터셉터 기반 OpenWeatherMap 연동' },
  { name: 'Element Plus', desc: 'Form · Data · Navigation · Feedback 전 카테고리' },
  { name: 'Chart.js', desc: '기온 추이 라인 차트 (테마 연동)' },
]

const features = [
  {
    title: 'F1 2026 시즌 연동',
    desc: '22개 그랑프리 일정과 서킷 좌표 기반 실시간 날씨. 다음 레이스까지 실시간 카운트다운.',
  },
  { title: '내 위치 날씨', desc: 'Geolocation API로 현재 위치를 좌표로 조회.' },
  {
    title: '오프라인 대응',
    desc: 'TTL 캐시 + 온라인 상태 감지. 네트워크가 끊겨도 마지막 데이터를 표시.',
  },
  { title: '다크 모드', desc: '라이트 / 다크 / 시스템 연동 3단계. OS 설정 변경을 실시간 반영.' },
  { title: '단위 전환', desc: '섭씨 / 화씨 전역 전환. 모든 화면이 즉시 재조회.' },
  { title: '접근성', desc: 'aria-label, aria-pressed, role 지정 및 prefers-reduced-motion 대응.' },
]
</script>

<template>
  <div class="about">
    <section class="about__hero">
      <span class="about__badge">ABOUT</span>
      <h1>SKALA Weather</h1>
      <p>
        SK㈜ AX SKALA <em>Full-stack Engineering · Frontend Framework(Vue.js)</em> 과정의 전 챕터
        실습 내용을 하나의 완성형 애플리케이션으로 통합한 프로젝트입니다. 정적 Mockup → Composition
        API → 컴포넌트 분리 → 라우팅 → 상태 관리 → API 연동 → UI 라이브러리로 이어지는 커리큘럼을
        모두 반영하고, 여기에 F1 시즌 연동·데이터 시각화·오프라인 대응 등 자기주도 확장 기능을
        더했습니다.
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
    <el-dialog v-model="dialogVisible" title="디자인 컨셉" width="480px" align-center>
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
