<script setup>
import { storeToRefs } from 'pinia'
import { useConfigStore } from '@/stores/configStore'

const config = useConfigStore()
const { isMetric } = storeToRefs(config)
</script>

<template>
  <div class="unit-toggle" role="group" aria-label="온도 단위 선택">
    <button
      type="button"
      :class="{ 'is-active': isMetric }"
      :aria-pressed="isMetric"
      @click="config.setUnit('metric')"
    >
      °C
    </button>
    <button
      type="button"
      :class="{ 'is-active': !isMetric }"
      :aria-pressed="!isMetric"
      @click="config.setUnit('imperial')"
    >
      °F
    </button>
  </div>
</template>

<style scoped>
.unit-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  border: 1px solid var(--surface-border);
}
.unit-toggle button {
  min-width: 34px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: var(--radius-pill);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.unit-toggle button.is-active {
  background: var(--accent);
  color: #04120f;
}
</style>
