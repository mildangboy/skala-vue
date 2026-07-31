<script setup>
// 대시보드 전역에서 재사용되는 카드 프레임 (glassmorphism 스타일)
defineProps({
  clickable: { type: Boolean, default: false },
  padded: { type: Boolean, default: true },
})
const emit = defineEmits(['click'])
</script>

<template>
  <div
    class="base-card"
    :class="{ 'base-card--clickable': clickable, 'base-card--padded': padded }"
    @click="clickable && emit('click')"
  >
    <div v-if="$slots.header" class="base-card__header">
      <slot name="header" />
    </div>
    <div class="base-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="base-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.base-card {
  background: var(--surface-glass);
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 30px rgba(15, 44, 89, 0.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.base-card--padded {
  padding: 20px 22px;
}
.base-card--clickable {
  cursor: pointer;
}
.base-card--clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 34px rgba(15, 44, 89, 0.16);
}
.base-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 600;
}
.base-card__footer {
  margin-top: 14px;
}
</style>
