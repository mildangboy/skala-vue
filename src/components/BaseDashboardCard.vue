<script setup>
// Apple Weather 스타일 글래스 카드 프레임 — 앱 전역에서 재사용
defineProps({
  clickable: { type: Boolean, default: false },
  padded: { type: Boolean, default: true },
  tone: { type: String, default: 'default' }, // 'default' | 'accent'
})
const emit = defineEmits(['click'])
</script>

<template>
  <div
    class="glass-card"
    :class="[
      `glass-card--${tone}`,
      { 'glass-card--clickable': clickable, 'glass-card--padded': padded },
    ]"
    @click="clickable && emit('click')"
  >
    <div v-if="$slots.header" class="glass-card__header">
      <slot name="header" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="glass-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-card);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
  box-shadow: var(--surface-shadow);
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}
.glass-card--padded {
  padding: 18px 20px;
}
.glass-card--accent {
  border-color: color-mix(in srgb, var(--accent) 38%, transparent);
  background: linear-gradient(135deg, var(--accent-soft), transparent 55%), var(--surface);
}
.glass-card--clickable {
  cursor: pointer;
}
.glass-card--clickable:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  box-shadow: 0 16px 44px rgba(0, 166, 143, 0.18);
}
.glass-card--clickable:active {
  transform: translateY(-1px);
}
.glass-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.glass-card__footer {
  margin-top: 14px;
}
</style>
