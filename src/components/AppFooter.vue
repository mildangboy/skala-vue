<script setup>
const year = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__bar" aria-hidden="true" />
    <p class="app-footer__main">SKALA Weather · Vue 3 + Vite + Pinia + Element Plus + Chart.js</p>
    <p class="app-footer__sub">
      SK㈜ AX SKALA Full-stack Engineering · Frontend Framework(Vue.js) 실습 과제 · 날씨 데이터
      OpenWeatherMap · F1 일정 Jolpica-F1
    </p>
    <p class="app-footer__legal">
      © {{ year }} · 본 프로젝트는 학습 목적의 비영리 결과물이며 Mercedes-AMG PETRONAS F1 Team과
      무관합니다.
    </p>
  </footer>
</template>

<style scoped>
.app-footer {
  max-width: 1120px;
  margin: 0 auto;
  padding: 34px 24px 40px;
  text-align: center;
}
.app-footer__bar {
  width: 54px;
  height: 3px;
  margin: 0 auto 18px;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, var(--amg-teal), var(--amg-silver));
}
.app-footer__main {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}
.app-footer__sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.app-footer__legal {
  margin: 10px 0 0;
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.72;
}
</style>
