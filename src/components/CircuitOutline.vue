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

/* ── 좌표 읽기 ──────────────────────────────────────────────
   저장된 경로는 크기를 줄이려고 상대 좌표(l)를 쓴다. 절대 좌표로 되돌린다. */
const toPoints = (d) => {
  const closed = d.endsWith('z') || d.endsWith('Z')
  const [head, rest = ''] = d.replace(/[zZ]$/, '').split(/[lL]/)
  const start = head.replace(/^M/, '').split(',').map(Number)
  const pts = [start]
  let [cx, cy] = start
  for (const pair of rest.trim().split(/\s+/)) {
    if (!pair) continue
    const [dx, dy] = pair.split(',').map(Number)
    cx += dx
    cy += dy
    pts.push([cx, cy])
  }
  return { pts, closed }
}

/**
 * 꺾은선을 부드러운 곡선으로 바꾼다 (Catmull-Rom → 3차 베지에).
 *
 * 서킷 좌표는 지도에서 딴 꼭짓점이라 그대로 이으면 각져 보인다.
 * 각 점을 지나면서 앞뒤 점의 방향으로 제어점을 잡으면
 * 원래 모양을 유지한 채 코너만 둥글어진다.
 */
const smooth = (pts, closed, tension = 0.5) => {
  if (pts.length < 3) return ''
  const at = (i) =>
    closed ? pts[(i + pts.length) % pts.length] : pts[Math.min(Math.max(i, 0), pts.length - 1)]

  const last = closed ? pts.length : pts.length - 1
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  return d + (closed ? 'Z' : '')
}

const path = computed(() => {
  const raw = shapeOf(props.circuitId)
  if (!raw) return ''
  const { pts, closed } = toPoints(raw)
  return smooth(pts, closed)
})

/**
 * 트랙을 도는 빛줄기.
 *
 * 길이가 다른 선 여러 겹을 같은 속도로 돌린다.
 * 머리 쪽은 짧고 진하게, 뒤로 갈수록 길고 옅게 깔면
 * 하나의 선이 흐려지며 끌리는 것처럼 보인다.
 *
 * 값은 전체 길이를 1로 본 비율이다 — path에 pathLength="1"을 주면
 * 서킷마다 다른 실제 길이와 무관하게 같은 비율로 그려진다.
 * (길이를 재서 CSS 변수로 넘기면 keyframe에서 보간되지 않아 애니메이션이 멈춘다)
 */
const DURATION = 5 // 초. keyframes의 길이와 맞춰야 한다.
const COMET = [
  { len: 0.18, width: 1.5, opacity: 0.12 },
  { len: 0.1, width: 1.8, opacity: 0.28 },
  { len: 0.045, width: 2, opacity: 0.6 },
  { len: 0.014, width: 2.4, opacity: 1 },
]
const HEAD = Math.max(...COMET.map((c) => c.len))

/**
 * 겹마다 시작 위치를 어긋나게 한다.
 *
 * dasharray는 경로 시작점부터 그리므로 그냥 겹치면 모든 선의 *뒤끝*이 맞고
 * 앞끝은 긴 선일수록 멀리 나간다. 그러면 흐린 긴 선이 앞서고 밝은 짧은 선이
 * 뒤따라가, 진행 방향이 반대로 보인다.
 *
 * 앞끝을 맞춰야 밝은 머리가 앞장선다. 각 선을 (가장 긴 길이 − 자기 길이)만큼
 * 앞으로 밀면 되는데, 애니메이션이 한 바퀴에 DURATION초이므로
 * 그 비율만큼 음수 delay를 주면 같은 효과가 난다.
 */
const cometStyle = (len) => ({
  animationDelay: `${-(HEAD - len) * DURATION}s`,
})
</script>

<template>
  <!-- 곡선 제어점이 0~100 상자를 최대 8.2까지 벗어나므로 여백을 10 준다 -->
  <svg
    v-if="path"
    class="circuit-outline"
    viewBox="-10 -10 120 120"
    role="img"
    :aria-label="label ? `${label} 서킷 레이아웃` : '서킷 레이아웃'"
  >
    <!-- 트랙 -->
    <path class="circuit-outline__track" :d="path" />

    <!-- 트랙을 도는 빛줄기 (겹칠수록 꼬리가 흐려진다) -->
    <path
      v-for="(c, i) in COMET"
      :key="i"
      class="circuit-outline__comet"
      :d="path"
      pathLength="1"
      :stroke-dasharray="`${c.len} ${1 - c.len}`"
      :stroke-width="c.width"
      :opacity="c.opacity"
      :style="cometStyle(c.len)"
    />
  </svg>
</template>

<style scoped>
.circuit-outline {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.circuit-outline__track,
.circuit-outline__comet {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.circuit-outline__track {
  stroke: var(--accent);
  stroke-width: 1.6px;
  opacity: 0.26;
}
.circuit-outline__comet {
  stroke: var(--accent);
}

@media (prefers-reduced-motion: no-preference) {
  .circuit-outline__comet {
    animation: circuit-run 5s linear infinite;
  }
}
/* pathLength=1이라 offset -1이 정확히 한 바퀴다 */
@keyframes circuit-run {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -1;
  }
}

/* 움직임을 줄이는 설정에서는 트랙만 또렷하게 보여준다 */
@media (prefers-reduced-motion: reduce) {
  .circuit-outline__track {
    opacity: 0.85;
    stroke-width: 2px;
  }
  .circuit-outline__comet {
    display: none;
  }
}
</style>
