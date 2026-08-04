<script setup>
import { computed } from 'vue'
import { shapeOf } from '@/data/circuitShapes'

/**
 * 서킷 레이아웃 도형.
 *
 * 좌표는 0~100 정사각형에 맞춰져 있고 가로세로 비율은 유지돼 있다.
 * 도형이 없는 서킷(아직 OSM에 없는 신설 트랙)에서는 아무것도 그리지 않는다.
 */
const props = defineProps({
  circuitId: { type: String, default: '' },
  label: { type: String, default: '' },
})

const path = computed(() => shapeOf(props.circuitId))
</script>

<template>
  <svg
    v-if="path"
    class="circuit-outline"
    viewBox="-7 -7 114 114"
    role="img"
    :aria-label="label ? `${label} 서킷 레이아웃` : '서킷 레이아웃'"
  >
    <!-- 뒤에 옅게 한 겹 깔아 트랙이 떠 보이게 한다 -->
    <path class="circuit-outline__glow" :d="path" />
    <path class="circuit-outline__line" :d="path" />
  </svg>
</template>

<style scoped>
.circuit-outline {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.circuit-outline__glow,
.circuit-outline__line {
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.circuit-outline__glow {
  stroke: var(--accent);
  stroke-width: 7px;
  opacity: 0.16;
}
.circuit-outline__line {
  stroke: var(--accent);
  stroke-width: 2px;
}

/* 처음 나타날 때 트랙을 한 바퀴 그린다 */
@media (prefers-reduced-motion: no-preference) {
  .circuit-outline__line {
    stroke-dasharray: 600;
    stroke-dashoffset: 600;
    animation: circuit-draw 1.8s ease-out forwards;
  }
}
@keyframes circuit-draw {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
