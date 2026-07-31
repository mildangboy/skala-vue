<script setup>
defineProps({
  offline: { type: Boolean, default: false },
  stale: { type: Boolean, default: false },
})
</script>

<template>
  <Transition name="slide">
    <div
      v-if="offline || stale"
      class="offline-banner"
      :class="{ 'is-offline': offline }"
      role="status"
    >
      <span class="offline-banner__dot" />
      <template v-if="offline">
        오프라인 상태입니다 — 마지막으로 저장된 날씨를 표시하고 있어요.
      </template>
      <template v-else>최신 데이터를 가져오지 못해 캐시된 정보를 표시합니다.</template>
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 16px;
  border-radius: var(--radius-pill);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  color: var(--text-secondary);
  font-size: 13px;
}
.offline-banner.is-offline {
  background: rgba(230, 162, 60, 0.14);
  border-color: rgba(230, 162, 60, 0.4);
}
.offline-banner__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
.offline-banner.is-offline .offline-banner__dot {
  background: #e6a23c;
}
.slide-enter-active,
.slide-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
