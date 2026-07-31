<script setup>
import { RouterLink, useRoute } from 'vue-router'
import ThemeToggle from './ThemeToggle.vue'
import UnitToggle from './UnitToggle.vue'

const route = useRoute()

const links = [
  { to: { name: 'weather-home' }, label: '홈' },
  { to: { name: 'f1-calendar' }, label: 'F1 캘린더' },
  { to: { name: 'race-plan' }, label: '관전 플랜' },
  { to: { name: 'weather-about' }, label: '소개' },
]

const isActive = (name) => route.name === name || route.meta?.parent === name
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink :to="{ name: 'weather-home' }" class="brand">
        <span class="brand__star" aria-hidden="true" />
        <span class="brand__text">
          <strong>SKALA</strong>
          <em>WEATHER</em>
        </span>
      </RouterLink>

      <nav class="nav" aria-label="주요 메뉴">
        <RouterLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="nav__link"
          :class="{ 'is-active': isActive(link.to.name) }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="app-header__controls">
        <UnitToggle />
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: color-mix(in srgb, var(--bg-base) 72%, transparent);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
  border-bottom: 1px solid var(--surface-border);
}
.app-header__inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  flex-shrink: 0;
}
/* Mercedes 3-pointed star를 CSS로 추상 표현 */
.brand__star {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  position: relative;
  background: radial-gradient(circle, var(--accent-soft), transparent 70%);
}
.brand__star::before,
.brand__star::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2px;
  height: 10px;
  background: var(--accent);
  transform-origin: top center;
}
.brand__star::before {
  transform: translate(-50%, 0) rotate(0deg);
}
.brand__star::after {
  transform: translate(-50%, 0) rotate(120deg);
  box-shadow: 0 0 0 0 transparent;
}
.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}
.brand__text strong {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--text-primary);
}
.brand__text em {
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: var(--accent);
}
.nav {
  display: flex;
  gap: 4px;
  flex: 1;
}
.nav__link {
  padding: 7px 13px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.nav__link:hover {
  color: var(--text-primary);
  background: var(--surface);
}
.nav__link.is-active {
  color: var(--accent);
  background: var(--accent-soft);
}
.app-header__controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .app-header__inner {
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 16px;
  }
  .nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
  }
}
</style>
