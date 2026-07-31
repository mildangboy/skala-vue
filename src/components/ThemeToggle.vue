<script setup>
import { Moon, Sunny, Monitor } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/themeStore'

const theme = useThemeStore()
const { mode } = storeToRefs(theme)

const options = [
  { value: 'light', label: '라이트', icon: Sunny },
  { value: 'system', label: '시스템', icon: Monitor },
  { value: 'dark', label: '다크', icon: Moon },
]
</script>

<template>
  <div class="theme-toggle" role="group" aria-label="테마 선택">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="theme-toggle__btn"
      :class="{ 'is-active': mode === opt.value }"
      :title="opt.label"
      :aria-pressed="mode === opt.value"
      @click="theme.setMode(opt.value)"
    >
      <el-icon><component :is="opt.icon" /></el-icon>
    </button>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  border: 1px solid var(--surface-border);
}
.theme-toggle__btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: var(--radius-pill);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.theme-toggle__btn:hover {
  color: var(--text-primary);
}
.theme-toggle__btn.is-active {
  background: var(--accent);
  color: #04120f;
}
</style>
