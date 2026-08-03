<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Sunny, Odometer, Watch } from '@element-plus/icons-vue'
import { fetchCurrentWeatherByCoords, fetchForecastByCoords } from '@/api/weather'
import { formatTemp, formatHour, formatWeekday } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { raceStartDate } from '@/data/f1Calendar2026'
import { useConfigStore } from '@/stores/configStore'
import { useF1Store } from '@/stores/f1Store'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import TempChart from '@/components/TempChart.vue'
import RaceConditionPanel from '@/components/RaceConditionPanel.vue'

const route = useRoute()
const router = useRouter()
const config = useConfigStore()
const f1 = useF1Store()

const current = ref(null)
const forecast = ref(null)
const loading = ref(false)
const error = ref('')
const chartHours = ref(8) // 차트에 표시할 예보 구간 (el-input-number로 조절)

const race = computed(() => f1.findRace(route.params.circuitId))

const raceTimeLabel = computed(() =>
  race.value
    ? raceStartDate(race.value).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '',
)

// 선택한 구간만큼 잘라서 차트에 전달
const chartSlice = computed(() => (forecast.value?.hourly ?? []).slice(0, chartHours.value))
const chartLabels = computed(() =>
  chartSlice.value.map((h) => formatHour(h.dt, forecast.value.timezone)),
)
const chartValues = computed(() => chartSlice.value.map((h) => h.temp))

// 레이스 당일 예보를 뽑아 "레이스 데이 전망"으로 노출
const raceDayForecast = computed(() => {
  if (!race.value || !forecast.value?.daily?.length) return null
  const target = new Date(race.value.date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return forecast.value.daily.find((d) => d.day === target) ?? null
})

const load = async () => {
  if (!race.value) return
  loading.value = true
  error.value = ''
  try {
    const [cur, fc] = await Promise.all([
      fetchCurrentWeatherByCoords(race.value.lat, race.value.lon, config.unit),
      fetchForecastByCoords(race.value.lat, race.value.lon, config.unit),
    ])
    current.value = cur
    forecast.value = fc
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const { refresh, refreshing, lastUpdated, paused } = useAutoRefresh(load)

onMounted(async () => {
  if (!f1.races.length) await f1.loadCalendar()
  load()
})

watch([() => route.params.circuitId, () => config.unit], load)
</script>

<template>
  <div class="circuit-detail">
    <div class="detail-toolbar">
      <el-button :icon="ArrowLeft" text @click="router.push({ name: 'f1-calendar' })">
        캘린더로
      </el-button>
      <RefreshButton
        :refreshing="refreshing"
        :last-updated="lastUpdated"
        :paused="paused"
        @refresh="refresh"
      />
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <el-empty v-if="!race && !loading" description="해당 서킷을 찾을 수 없습니다" />

    <template v-if="race">
      <!-- 히어로: 서킷 정보 + 현재 날씨 -->
      <section class="circuit-hero">
        <div class="circuit-hero__meta">
          <span class="circuit-hero__round">ROUND {{ race.round }} · {{ race.country }}</span>
          <h1>{{ race.name }}</h1>
          <p class="circuit-hero__circuit">{{ race.circuit }} · {{ race.locality }}</p>
          <p class="circuit-hero__time">
            <el-icon><Watch /></el-icon>{{ raceTimeLabel }}
          </p>
        </div>

        <div v-if="current" class="circuit-hero__now">
          <span class="circuit-hero__emoji">{{ iconEmoji(current.icon) }}</span>
          <div class="circuit-hero__temp temp-display">
            {{ formatTemp(current.temp, config.unit) }}
          </div>
          <div class="circuit-hero__desc">{{ current.description }}</div>
        </div>
      </section>

      <SkeletonCard v-if="loading" height="180px" :lines="3" />

      <template v-else-if="current">
        <!-- 레이스 컨디션 지수 — 산출 로직과 근거 표시는 패널이 캡슐화 -->
        <RaceConditionPanel :weather="current" :unit="config.unit" />

        <!-- 레이스 데이 전망 -->
        <BaseDashboardCard v-if="raceDayForecast" tone="accent">
          <template #header><span>레이스 데이 전망</span></template>
          <div class="race-day">
            <span class="race-day__emoji">{{ iconEmoji(raceDayForecast.icon) }}</span>
            <div>
              <div class="race-day__temp mono-num">
                {{ formatTemp(raceDayForecast.max, config.unit) }} /
                {{ formatTemp(raceDayForecast.min, config.unit) }}
              </div>
              <div class="race-day__desc">{{ raceDayForecast.description }}</div>
            </div>
          </div>
        </BaseDashboardCard>

        <!-- 현재 지표 -->
        <BaseDashboardCard>
          <template #header><span>현재 서킷 컨디션</span></template>
          <div class="metrics">
            <div class="metrics__item">
              <span>체감</span><strong>{{ formatTemp(current.feelsLike, config.unit) }}</strong>
            </div>
            <div class="metrics__item">
              <span>습도</span><strong>{{ current.humidity }}%</strong>
            </div>
            <div class="metrics__item">
              <span>바람</span><strong>{{ current.windSpeed }} m/s</strong>
            </div>
            <div class="metrics__item">
              <span>기압</span><strong>{{ current.pressure }} hPa</strong>
            </div>
          </div>
        </BaseDashboardCard>

        <!-- Chart.js 기온 추이 -->
        <BaseDashboardCard v-if="chartValues.length">
          <template #header>
            <span
              ><el-icon><Odometer /></el-icon> 24시간 기온 추이</span
            >
          </template>
          <TempChart :labels="chartLabels" :values="chartValues" :unit-symbol="config.unitSymbol" />
        </BaseDashboardCard>

        <!-- 일별 예보 -->
        <BaseDashboardCard v-if="forecast?.daily?.length">
          <template #header>
            <span
              ><el-icon><Sunny /></el-icon> 5일 예보</span
            >
          </template>
          <ul class="daily">
            <li v-for="d in forecast.daily" :key="d.day" class="daily__row">
              <span class="daily__day">{{ formatWeekday(d.dt, forecast.timezone) }}</span>
              <span class="daily__emoji">{{ iconEmoji(d.icon) }}</span>
              <span class="daily__desc">{{ d.description }}</span>
              <span class="daily__range mono-num">
                {{ formatTemp(d.max, config.unit) }} / {{ formatTemp(d.min, config.unit) }}
              </span>
            </li>
          </ul>
        </BaseDashboardCard>
      </template>
    </template>
  </div>
</template>

<style scoped>
.circuit-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.circuit-hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  padding: 26px 28px;
  border-radius: var(--radius-card);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  background: linear-gradient(135deg, rgba(39, 244, 210, 0.14), transparent 55%), var(--surface);
  backdrop-filter: var(--blur-glass);
}
.circuit-hero__round {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.circuit-hero__meta h1 {
  margin: 8px 0 4px;
  font-size: clamp(22px, 3.4vw, 32px);
}
.circuit-hero__circuit {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}
.circuit-hero__time {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.circuit-hero__now {
  text-align: right;
}
.circuit-hero__emoji {
  font-size: 40px;
}
.circuit-hero__temp {
  font-size: clamp(40px, 6vw, 56px);
  line-height: 1;
  color: var(--hero-text);
}
.circuit-hero__desc {
  color: var(--hero-sub);
  text-transform: capitalize;
  font-size: 14px;
  margin-top: 2px;
}
.race-day {
  display: flex;
  align-items: center;
  gap: 14px;
}
.race-day__emoji {
  font-size: 40px;
}
.race-day__temp {
  font-size: 24px;
  font-weight: 600;
}
.race-day__desc {
  color: var(--text-muted);
  text-transform: capitalize;
  font-size: 13px;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 14px;
}
.metrics__item span {
  display: block;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 3px;
}
.metrics__item strong {
  font-size: 19px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.daily {
  list-style: none;
  margin: 0;
  padding: 0;
}
.daily__row {
  display: grid;
  grid-template-columns: 48px 34px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px solid var(--surface-border);
  font-size: 14px;
}
.daily__row:last-child {
  border-bottom: none;
}
.daily__day {
  font-weight: 600;
}
.daily__emoji {
  font-size: 20px;
}
.daily__desc {
  color: var(--text-muted);
  text-transform: capitalize;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.daily__range {
  font-weight: 600;
}

@media (max-width: 640px) {
  .circuit-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
  }
  .circuit-hero__now {
    text-align: left;
  }
}
</style>
