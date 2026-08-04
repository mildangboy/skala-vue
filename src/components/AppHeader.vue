<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Close, Menu as MenuIcon } from '@element-plus/icons-vue'
import ThemeToggle from './ThemeToggle.vue'
import UnitToggle from './UnitToggle.vue'
import AuthMenu from './AuthMenu.vue'

const route = useRoute()

const links = [
  { to: { name: 'weather-home' }, label: '홈' },
  { to: { name: 'f1-calendar' }, label: 'F1 캘린더' },
  { to: { name: 'race-plan' }, label: '관전 플랜' },
  { to: { name: 'weather-about' }, label: '소개' },
]

const isActive = (name) => route.name === name || route.meta?.parent === name

const drawerOpen = ref(false)

// 데스크톱 폭으로 넓어지면 열려 있던 서랍을 닫아 상태가 어긋나지 않게 한다
const desktopQuery = window.matchMedia?.('(min-width: 761px)') ?? null
const handleWidthChange = (e) => {
  if (e.matches) drawerOpen.value = false
}

onMounted(() => desktopQuery?.addEventListener('change', handleWidthChange))
onBeforeUnmount(() => desktopQuery?.removeEventListener('change', handleWidthChange))

// 메뉴에서 페이지를 이동하면 서랍을 닫는다
watch(
  () => route.fullPath,
  () => (drawerOpen.value = false),
)
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink :to="{ name: 'weather-home' }" class="brand">
        <span class="brand__star" aria-hidden="true" />
        <span class="brand__text">
          <strong>Weather F1</strong>
          <em>날씨와 F1을 한번에</em>
        </span>
      </RouterLink>

      <!-- 데스크톱 네비게이션 -->
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
        <AuthMenu />
      </div>

      <!-- 모바일에서는 토글은 서랍으로 보내고 로그인만 헤더에 남긴다 -->
      <div class="app-header__auth-mobile">
        <AuthMenu />
      </div>

      <!-- 모바일 햄버거 -->
      <button
        type="button"
        class="hamburger"
        :aria-expanded="drawerOpen"
        aria-controls="mobile-menu"
        aria-label="메뉴 열기"
        @click="drawerOpen = true"
      >
        <el-icon><MenuIcon /></el-icon>
      </button>
    </div>

    <!-- 모바일 메뉴 서랍 -->
    <el-drawer
      id="mobile-menu"
      v-model="drawerOpen"
      direction="rtl"
      size="270px"
      :with-header="false"
      class="mobile-menu"
    >
      <div class="mobile-menu__head">
        <span class="mobile-menu__title">메뉴</span>
        <button
          type="button"
          class="mobile-menu__close"
          aria-label="메뉴 닫기"
          @click="drawerOpen = false"
        >
          <el-icon><Close /></el-icon>
        </button>
      </div>

      <nav class="mobile-menu__nav" aria-label="모바일 메뉴">
        <RouterLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="mobile-menu__link"
          :class="{ 'is-active': isActive(link.to.name) }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="mobile-menu__section">
        <span class="mobile-menu__label">온도 단위</span>
        <UnitToggle />
      </div>
      <div class="mobile-menu__section">
        <span class="mobile-menu__label">테마</span>
        <ThemeToggle />
      </div>
    </el-drawer>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: color-mix(in srgb, var(--bg-base) 62%, transparent);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
  border-bottom: 1px solid var(--surface-border);
  /* 헤더 하단에 얇은 반사광을 둬 유리판이 떠 있는 느낌을 준다 */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 1px 12px rgba(0, 0, 0, 0.06);
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
  margin-right: auto;
}
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
}
.nav__link {
  padding: 7px 13px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  white-space: nowrap;
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
.app-header__auth-mobile {
  display: none;
}

/* 햄버거 — 데스크톱에서는 숨김 */
.hamburger {
  display: none;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 19px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}
.hamburger:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

/* 서랍 내부 */
.mobile-menu__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--surface-border);
}
.mobile-menu__title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}
.mobile-menu__close {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 17px;
  cursor: pointer;
}
.mobile-menu__close:hover {
  background: var(--accent-soft);
  color: var(--text-primary);
}
.mobile-menu__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 20px;
}
.mobile-menu__link {
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: none;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.mobile-menu__link:hover {
  background: var(--surface);
  color: var(--text-primary);
}
.mobile-menu__link.is-active {
  background: var(--accent-soft);
  color: var(--accent);
}
.mobile-menu__section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid var(--surface-border);
}
.mobile-menu__label {
  font-size: 13px;
  color: var(--text-muted);
}

@media (max-width: 760px) {
  .app-header__inner {
    padding: 10px 16px;
    gap: 12px;
  }
  .nav,
  .app-header__controls {
    display: none;
  }
  .app-header__auth-mobile {
    display: block;
  }
  .hamburger {
    display: grid;
  }
}
</style>
