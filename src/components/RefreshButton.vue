<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { timeAgo } from '@/utils/format'

/**
 * 수동 새로고침 버튼 + 마지막 갱신 시각 표시.
 * 갱신 자체는 부모가 수행하고, 이 컴포넌트는 트리거와 상태 표시만 담당한다.
 */
const props = defineProps({
  refreshing: { type: Boolean, default: false },
  lastUpdated: { type: Number, default: null },
  paused: { type: Boolean, default: false },
})
const emit = defineEmits(['refresh'])

// '3분 전' 표기가 시간이 흐르면 저절로 바뀌도록 1분마다 다시 계산한다
const now = ref(Date.now())
let ticker = null
onMounted(() => (ticker = setInterval(() => (now.value = Date.now()), 60 * 1000)))
onBeforeUnmount(() => clearInterval(ticker))

const label = computed(() => {
  if (props.refreshing) return '갱신 중…'
  if (!props.lastUpdated) return ''
  return `${timeAgo(props.lastUpdated, now.value)} 갱신`
})
</script>

<template>
  <div class="refresh">
    <span v-if="label" class="refresh__label">{{ label }}</span>
    <button
      type="button"
      class="refresh__btn"
      :class="{ 'is-spinning': refreshing }"
      :disabled="refreshing"
      :title="
        paused ? '탭이 비활성이라 자동 갱신이 멈춰 있습니다' : '지금 새로고침 (10분마다 자동 갱신)'
      "
      aria-label="날씨 새로고침"
      @click="emit('refresh')"
    >
      <el-icon><Refresh /></el-icon>
    </button>
  </div>
</template>

<style scoped>
.refresh {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-transform: none;
  letter-spacing: 0;
}
.refresh__label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
}
.refresh__btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--surface-border);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 15px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}
.refresh__btn:hover:not(:disabled) {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.refresh__btn:disabled {
  cursor: default;
  color: var(--accent);
}
.refresh__btn.is-spinning .el-icon {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
