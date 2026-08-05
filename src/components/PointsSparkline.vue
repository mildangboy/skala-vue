<script setup>
import { computed } from 'vue'

/**
 * 최근 몇 경기의 획득 포인트를 작은 막대로 보여준다.
 *
 * 표 안에 들어가는 그림이라 축도 눈금도 없다. 알아야 할 건 "요즘 잘하나"뿐이라
 * 막대의 높낮이만 남기고 나머지는 뺐다.
 *
 * 높이는 이 줄 안에서가 아니라 표 전체에서 가장 높은 값을 기준으로 잡는다.
 * 줄마다 제 최대값으로 맞추면 0~4점을 오간 드라이버와 20점대를 오간 드라이버의
 * 막대가 똑같아 보여서, 줄끼리 비교가 되지 않는다.
 */
const props = defineProps({
  values: { type: Array, default: () => [] },
  max: { type: Number, default: 25 },
  color: { type: String, default: 'currentColor' },
})

const W = 54
const H = 18
const GAP = 2

const bars = computed(() => {
  const vals = props.values
  if (!vals.length) return []
  const w = (W - GAP * (vals.length - 1)) / vals.length
  const top = Math.max(props.max, 1)

  return vals.map((v, i) => {
    const x = i * (w + GAP)
    if (v == null) return { x, w, y: H - 1, h: 1, muted: true }
    // 0점도 흔적은 남긴다. 아예 안 그리면 데이터가 없는 것과 구분이 안 된다.
    const h = Math.max((Math.min(v, top) / top) * H, 1.5)
    return { x, w, y: H - h, h, muted: false, value: v }
  })
})

const label = computed(() => {
  const known = props.values.filter((v) => v != null)
  if (!known.length) return '최근 기록 없음'
  return `최근 ${known.length}경기 획득 포인트: ${known.join(', ')}`
})
</script>

<template>
  <svg
    class="sparkline"
    :viewBox="`0 0 ${W} ${H}`"
    :width="W"
    :height="H"
    role="img"
    :aria-label="label"
  >
    <rect
      v-for="(b, i) in bars"
      :key="i"
      :x="b.x"
      :y="b.y"
      :width="b.w"
      :height="b.h"
      :fill="b.muted ? 'currentColor' : color"
      :opacity="b.muted ? 0.18 : b.value === 0 ? 0.3 : 0.9"
      rx="1"
    />
  </svg>
</template>

<style scoped>
.sparkline {
  display: block;
  color: var(--text-muted);
  overflow: visible;
}
</style>
