<script setup>
// Apple Weather 스타일 글래스 카드 프레임 — 앱 전역에서 재사용
defineProps({
  clickable: { type: Boolean, default: false },
  padded: { type: Boolean, default: true },
  // 'default' 유리 카드 | 'accent' 강조 | 'bare' 프레임 없이 슬롯 구조만 사용
  tone: { type: String, default: 'default' },
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
/* 구조(헤더 슬롯 + 본문 슬롯)는 그대로 쓰되 카드 프레임은 그리지 않는다.
   카드 안에 카드가 겹쳐 배경이 탁해지는 것을 피하기 위한 변형. */
.glass-card--bare {
  background: none;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
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
