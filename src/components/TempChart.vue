<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js'
import { useThemeStore } from '@/stores/themeStore'

// 필요한 컨트롤러만 등록해 번들 크기를 줄인다 (tree-shaking)
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
)

const props = defineProps({
  labels: { type: Array, default: () => [] },
  values: { type: Array, default: () => [] },
  unitSymbol: { type: String, default: '°C' },
})

const canvasRef = ref(null)
const theme = useThemeStore()
let chart = null

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const buildConfig = () => {
  const accent = cssVar('--amg-teal') || '#27f4d2'
  const grid = theme.isDark ? 'rgba(200,204,206,0.12)' : 'rgba(10,10,10,0.08)'
  const tick = theme.isDark ? '#b9c0c3' : '#4a5356'

  return {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: [
        {
          data: props.values,
          borderColor: accent,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: accent,
          pointBorderColor: theme.isDark ? '#0a0d0f' : '#ffffff',
          pointBorderWidth: 2,
          backgroundColor: (ctx) => {
            const { chart: c } = ctx
            if (!c.chartArea) return 'transparent'
            const g = c.ctx.createLinearGradient(0, c.chartArea.top, 0, c.chartArea.bottom)
            g.addColorStop(0, 'rgba(39, 244, 210, 0.34)')
            g.addColorStop(1, 'rgba(39, 244, 210, 0)')
            return g
          },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
          displayColors: false,
          callbacks: {
            label: (item) => ` ${Math.round(item.parsed.y)}${props.unitSymbol}`,
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
          grid: { color: grid },
          ticks: {
            color: tick,
            font: { size: 11 },
            callback: (v) => `${Math.round(v)}${props.unitSymbol}`,
          },
          border: { display: false },
        },
      },
    },
  }
}

const render = () => {
  if (!canvasRef.value) return
  chart?.destroy()
  chart = new Chart(canvasRef.value, buildConfig())
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
// 데이터나 테마가 바뀌면 차트를 다시 그린다
watch(() => [props.labels, props.values, theme.isDark], render, { deep: true })
</script>

<template>
  <div class="temp-chart">
    <canvas ref="canvasRef" aria-label="기온 추이 차트" role="img" />
  </div>
</template>

<style scoped>
.temp-chart {
  position: relative;
  height: 220px;
  width: 100%;
}
</style>
