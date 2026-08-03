<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import GlassFilters from '@/components/GlassFilters.vue'
import { useThemeStore } from '@/stores/themeStore'

// 앱 시작 시 테마 스토어를 초기화해 저장된 설정을 즉시 적용
useThemeStore()
</script>

<template>
  <div class="app-shell">
    <!-- 굴절 필터 정의 + 지원 여부 감지 (화면에 보이지 않음) -->
    <GlassFilters />

    <AppHeader />

    <main class="app-main">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-main {
  flex: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 30px 24px 10px;
}
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .app-main {
    padding: 20px 16px 8px;
  }
}
</style>
