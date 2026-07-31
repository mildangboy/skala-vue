<script setup>
const stack = [
  { name: 'Vue 3', desc: 'Composition API / <script setup> 기반 SFC' },
  { name: 'Vite', desc: '빠른 개발 서버와 프로덕션 빌드' },
  { name: 'Vue Router', desc: '동적 라우트, 지연 로딩, 404 처리' },
  { name: 'Pinia', desc: 'Composition 스타일 스토어(단위/즐겨찾기/검색기록)' },
  { name: 'Axios', desc: 'OpenWeatherMap REST API 연동' },
  { name: 'Element Plus', desc: '폼/피드백/네비게이션 UI 컴포넌트' },
]
</script>

<template>
  <div class="about-view">
    <h1>이 프로젝트에 대하여</h1>
    <p>
      SKALA Full-stack Engineering &middot; Frontend Framework(Vue.js) 과정의 실습 커리큘럼을 바탕으로 제작한 날씨
      대시보드입니다. 정적 Mockup에서 시작해 Composition API 리팩터링, 컴포넌트 분리, 라우팅, 상태 관리, 실제 API
      연동, UI 라이브러리 적용까지 전 과정을 하나의 완성형 애플리케이션으로 통합했습니다.
    </p>

    <el-descriptions title="기술 스택" :column="1" border>
      <el-descriptions-item v-for="item in stack" :key="item.name" :label="item.name">
        {{ item.desc }}
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<style scoped>
.about-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 680px;
}
.about-view h1 {
  margin: 0;
}
.about-view p {
  color: var(--text-muted);
  line-height: 1.7;
}
</style>
