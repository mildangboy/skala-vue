<script setup>
import { RouterLink, useRoute } from 'vue-router'
import UnitToggle from './UnitToggle.vue'

const route = useRoute()
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="app-header__brand">
      <span class="app-header__logo">🌤️</span>
      <span>SKALA Weather</span>
    </RouterLink>

    <nav class="app-header__nav">
      <RouterLink to="/" :class="{ active: route.path === '/' }">홈</RouterLink>
      <RouterLink to="/about" :class="{ active: route.path === '/about' }">소개</RouterLink>
    </nav>

    <UnitToggle />
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 28px;
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.55);
  border-bottom: 1px solid var(--surface-border);
}
.app-header__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 18px;
  color: var(--brand-700);
  text-decoration: none;
}
.app-header__logo {
  font-size: 22px;
}
.app-header__nav {
  display: flex;
  gap: 18px;
  flex: 1;
}
.app-header__nav a {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 2px solid transparent;
}
.app-header__nav a.active {
  color: var(--brand-600);
  border-color: var(--brand-500);
}
</style>
