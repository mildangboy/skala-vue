<script setup>
import { useConfigStore } from '@/stores/configStore'
import { storeToRefs } from 'pinia'

const config = useConfigStore()
const { isMetric } = storeToRefs(config)
</script>

<template>
  <div class="unit-toggle">
    <span :class="{ active: isMetric }">°C</span>
    <el-switch
      :model-value="!isMetric"
      style="--el-switch-on-color: var(--brand-500); --el-switch-off-color: var(--brand-500)"
      @change="config.toggleUnit"
    />
    <span :class="{ active: !isMetric }">°F</span>
  </div>
</template>

<style scoped>
.unit-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
}
.unit-toggle .active {
  color: var(--brand-600);
  font-weight: 700;
}
</style>
