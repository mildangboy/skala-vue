<script setup>
const year = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <p>© {{ year }} SKALA Weather · Vue 3 + Vite + Pinia + Element Plus</p>
    <p class="app-footer__credit">SK㈜ AX SKALA Full-stack Engineering · Frontend Framework(Vue.js) 실습 과제</p>
  </footer>
</template>

<style scoped>
.app-footer {
  text-align: center;
  padding: 24px 12px 32px;
  color: var(--text-muted);
  font-size: 13px;
}
.app-footer__credit {
  margin-top: 4px;
  opacity: 0.7;
}
</style>
