<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { useThemeStore } from '@/stores/themeStore'
import { colorOf } from '@/data/teamColors'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

/**
 * 시즌 포인트 누적 추이.
 *
 * 선이 열 개라 범례만으로는 어느 선이 누구인지 짚기 어렵다. 특히 파랑 계열
 * 팀이 넷이라 색만으로는 갈리지 않는다. 그래서 선 끝에 이름을 직접 붙인다.
 *
 * 팀메이트끼리는 팀 색이 같으므로, 순위가 앞선 쪽을 실선, 뒤쪽을 파선으로 둔다.
 */
const props = defineProps({
  // [{ id, shortName, constructorId, cumulative: (number|null)[] }]
  series: { type: Array, default: () => [] },
  rounds: { type: Array, default: () => [] },
  height: { type: Number, default: 320 },
})

const canvasRef = ref(null)
const theme = useThemeStore()
let chart = null

/** 같은 팀에서 몇 번째인지 — 팀메이트를 파선으로 가르는 데 쓴다 */
const withDash = computed(() => {
  const seen = new Map()
  return props.series.map((s) => {
    const n = seen.get(s.constructorId) ?? 0
    seen.set(s.constructorId, n + 1)
    return { ...s, dash: n === 0 ? [] : [6, 4] }
  })
})

/**
 * 선 끝에 이름을 그리는 플러그인.
 * Chart.js에 없는 기능이라 직접 그린다.
 */
const endLabels = {
  id: 'endLabels',
  afterDatasetsDraw(c) {
    const { ctx, chartArea } = c
    if (!chartArea) return
    const tick = theme.isDark ? '#e6ebec' : '#22292b'

    /*
     * 선 끝 이름이 겹치지 않게 벌린다.
     *
     * 아래쪽에 하위권 팀들이 몰려 있어서, 위에서부터 아래로만 밀면 마지막 몇 개가
     * 차트 밖으로 새어 나간다. 그래서 아래로 민 다음 바닥에 부딪히면
     * 거꾸로 위로 되민다. 두 번 훑으면 주어진 높이 안에 고르게 들어간다.
     */
    const placed = []
    c.data.datasets.forEach((ds, i) => {
      const meta = c.getDatasetMeta(i)
      const last = [...meta.data].reverse().find((p) => p && !Number.isNaN(p.y))
      if (!last) return
      placed.push({ y: last.y, x: last.x, text: ds.label, color: ds.borderColor })
    })
    placed.sort((a, b) => a.y - b.y)

    const MIN = 13
    const top = chartArea.top + 6
    const bottom = chartArea.bottom - 6

    for (let i = 0; i < placed.length; i += 1) {
      const floor = i === 0 ? top : placed[i - 1].y + MIN
      placed[i].y = Math.max(placed[i].y, floor)
    }
    for (let i = placed.length - 1; i >= 0; i -= 1) {
      const ceil = i === placed.length - 1 ? bottom : placed[i + 1].y - MIN
      placed[i].y = Math.min(placed[i].y, ceil)
    }

    ctx.save()
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    for (const p of placed) {
      ctx.fillStyle = p.color
      ctx.fillText('—', p.x + 3, p.y)
      ctx.fillStyle = tick
      ctx.fillText(p.text, p.x + 16, p.y)
    }
    ctx.restore()
  },
}

const buildConfig = () => {
  const grid = theme.isDark ? 'rgba(200,204,206,0.12)' : 'rgba(10,10,10,0.08)'
  const tick = theme.isDark ? '#b9c0c3' : '#4a5356'

  return {
    type: 'line',
    plugins: [endLabels],
    data: {
      labels: props.rounds.map((r) => `R${r}`),
      datasets: withDash.value.map((s) => {
        const color = colorOf(s.constructorId)
        return {
          label: s.shortName,
          data: s.cumulative,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          borderDash: s.dash,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          // 빠진 라운드에서 선을 잇지 않는다
          spanGaps: false,
        }
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // 선 끝 이름이 들어갈 자리
      layout: { padding: { right: 92 } },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.isDark ? 'rgba(22,24,26,0.95)' : 'rgba(255,255,255,0.96)',
          titleColor: tick,
          bodyColor: theme.isDark ? '#f2f5f6' : '#0e1416',
          borderColor: grid,
          borderWidth: 1,
          padding: 10,
          // 열 개를 다 띄우면 화면을 덮는다. 그 라운드 상위 5개만.
          itemSort: (a, b) => b.parsed.y - a.parsed.y,
          filter: (item) => item.dataIndex >= 0 && item.parsed.y != null,
          callbacks: {
            label: (item) => ` ${item.dataset.label} ${item.parsed.y}pt`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tick, font: { size: 11 } },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: grid },
          ticks: { color: tick, font: { size: 11 }, callback: (v) => `${v}pt` },
          border: { display: false },
        },
      },
    },
  }
}

const render = () => {
  if (!canvasRef.value) return
  chart?.destroy()
  chart = props.series.length ? new Chart(canvasRef.value, buildConfig()) : null
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => [props.series, props.rounds, theme.isDark], render, { deep: true })
</script>

<template>
  <div class="points-chart" :style="{ height: `${height}px` }">
    <canvas ref="canvasRef" role="img" aria-label="시즌 포인트 누적 추이 차트" />
  </div>
</template>

<style scoped>
.points-chart {
  position: relative;
  width: 100%;
}
</style>
