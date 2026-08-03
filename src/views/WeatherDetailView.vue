<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft, Star, StarFilled, Odometer } from '@element-plus/icons-vue'
import { fetchCurrentWeatherByCity, fetchForecastByCity } from '@/api/weather'
import { formatTemp, formatHour, formatWeekday, formatDate, dailyRangeOf } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { useConfigStore } from '@/stores/configStore'
import { useWeatherStore } from '@/stores/weatherStore'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import TempChart from '@/components/TempChart.vue'

const route = useRoute()
const router = useRouter()
const config = useConfigStore()
const weatherStore = useWeatherStore()
const { favorites } = storeToRefs(weatherStore)

const current = ref(null)
const forecast = ref(null)
const loading = ref(false)
const error = ref('')
const chartHours = ref(8) // 차트 표시 구간

const cityParam = computed(() => route.params.city)
const isFav = computed(() => favorites.value.includes(current.value?.city))

// 시간별 스트립 — 날짜가 바뀌는 첫 항목에 날짜 라벨을 붙인다
const hourlyItems = computed(() => {
  const tz = forecast.value?.timezone ?? 0
  let lastDay = null
  return (forecast.value?.hourly ?? []).map((h) => {
    const day = formatDate(h.dt, tz, { month: 'numeric', day: 'numeric' })
    const isNewDay = day !== lastDay
    lastDay = day
    return { ...h, dayLabel: isNewDay ? day : '' }
  })
})

// 오늘 최고·최저는 현재 날씨가 아니라 예보에서 계산한다 (format.js 주석 참고)
const todayRange = computed(() => dailyRangeOf(forecast.value))

const chartSlice = computed(() => (forecast.value?.hourly ?? []).slice(0, chartHours.value))
const chartLabels = computed(() =>
  chartSlice.value.map((h) => formatHour(h.dt, forecast.value.timezone)),
)
const chartValues = computed(() => chartSlice.value.map((h) => h.temp))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [cur, fc] = await Promise.all([
      fetchCurrentWeatherByCity(cityParam.value, config.unit),
      fetchForecastByCity(cityParam.value, config.unit),
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

onMounted(load)
watch([cityParam, () => config.unit], load)
</script>

<template>
  <div class="detail">
    <div class="detail-toolbar">
      <el-button :icon="ArrowLeft" text @click="router.push({ name: 'weather-home' })">
        홈으로
      </el-button>
      <RefreshButton
        :refreshing="refreshing"
        :last-updated="lastUpdated"
        :paused="paused"
        @refresh="refresh"
      />
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <SkeletonCard v-if="loading" height="220px" :lines="3" />

    <template v-else-if="current">
      <!-- Apple Weather 스타일 히어로 -->
      <section class="detail__hero">
        <div class="detail__hero-top">
          <h1>
            {{ current.city }}<small v-if="current.country">, {{ current.country }}</small>
          </h1>
          <el-button
            :icon="isFav ? StarFilled : Star"
            circle
            :class="{ 'is-fav': isFav }"
            :aria-label="isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'"
            @click="weatherStore.toggleFavorite(current.city)"
          />
        </div>
        <div class="detail__temp temp-display">{{ formatTemp(current.temp, config.unit) }}</div>
        <p class="detail__desc">{{ iconEmoji(current.icon) }} {{ current.description }}</p>
        <p class="detail__range mono-num">
          <template v-if="todayRange">
            오늘 예보 최고 {{ formatTemp(todayRange.max, config.unit) }} · 최저
            {{ formatTemp(todayRange.min, config.unit) }} ·
          </template>
          체감 {{ formatTemp(current.feelsLike, config.unit) }}
        </p>
      </section>

      <!-- 시간별 예보 스트립 -->
      <BaseDashboardCard v-if="forecast?.hourly?.length">
        <template #header>
          <span>시간별 예보</span>
          <span class="hourly__hint">3시간 간격 · 좌우로 스크롤</span>
        </template>
        <div class="hourly">
          <div
            v-for="h in hourlyItems"
            :key="h.dt"
            class="hourly__item"
            :class="{ 'is-day-start': h.dayLabel }"
          >
            <span class="hourly__day">{{ h.dayLabel || '\u00a0' }}</span>
            <span class="hourly__time">{{ formatHour(h.dt, forecast.timezone) }}</span>
            <span class="hourly__emoji">{{ iconEmoji(h.icon) }}</span>
            <span class="hourly__temp mono-num">{{ formatTemp(h.temp, config.unit) }}</span>
            <span class="hourly__pop mono-num">
              {{ h.pop != null && h.pop > 0 ? Math.round(h.pop * 100) + '%' : '\u00a0' }}
            </span>
          </div>
        </div>
      </BaseDashboardCard>

      <!-- Chart.js 기온 추이 -->
      <BaseDashboardCard v-if="chartValues.length">
        <template #header>
          <span
            ><el-icon><Odometer /></el-icon> 기온 추이</span
          >
          <span class="chart-range">
            <label for="city-hours">표시 구간</label>
            <el-input-number
              id="city-hours"
              v-model="chartHours"
              :min="3"
              :max="Math.max(3, forecast?.hourly?.length ?? 3)"
              :step="1"
              size="small"
              controls-position="right"
            />
            <em>× 3시간</em>
          </span>
        </template>
        <TempChart :labels="chartLabels" :values="chartValues" :unit-symbol="config.unitSymbol" />
      </BaseDashboardCard>

      <!-- 상세 지표 -->
      <BaseDashboardCard>
        <template #header><span>상세 정보</span></template>
        <div class="metrics">
          <div class="metrics__item">
            <span>습도</span><strong>{{ current.humidity }}%</strong>
          </div>
          <div class="metrics__item">
            <span>기압</span><strong>{{ current.pressure }} hPa</strong>
          </div>
          <div class="metrics__item">
            <span>바람</span><strong>{{ current.windSpeed }} m/s</strong>
          </div>
          <div class="metrics__item">
            <span>체감</span><strong>{{ formatTemp(current.feelsLike, config.unit) }}</strong>
          </div>
        </div>
      </BaseDashboardCard>

      <!-- 일별 예보 -->
      <BaseDashboardCard v-if="forecast?.daily?.length">
        <template #header><span>5일 예보</span></template>
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
  </div>
</template>

<style scoped>
.detail {
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
.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.detail__hero {
  padding: 30px 28px;
  text-align: center;
  border-radius: var(--radius-card);
  border: 1px solid var(--surface-border);
  background: linear-gradient(160deg, rgba(39, 244, 210, 0.12), transparent 58%), var(--surface);
  backdrop-filter: var(--blur-glass);
}
.detail__hero-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.detail__hero-top h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
}
.detail__hero-top h1 small {
  color: var(--text-muted);
  font-weight: 400;
  font-size: 16px;
  margin-left: 5px;
}
.detail__hero-top .is-fav {
  color: var(--accent);
  border-color: var(--accent);
}
.detail__temp {
  font-size: clamp(64px, 13vw, 104px);
  line-height: 1;
  margin: 10px 0 2px;
  color: var(--hero-text);
}
.detail__desc {
  margin: 0;
  font-size: 17px;
  color: var(--hero-sub);
  text-transform: capitalize;
}
.detail__range {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
.hourly {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-snap-type: x proximity;
}
.hourly__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 58px;
  padding: 8px 6px;
  border-radius: 12px;
  scroll-snap-align: start;
  transition: background 0.2s ease;
}
.hourly__item:hover {
  background: var(--accent-soft);
}
/* 날짜가 바뀌는 지점에 구분선 */
.hourly__item.is-day-start {
  border-left: 1px solid var(--surface-border);
}
.hourly__item.is-day-start:first-child {
  border-left: none;
}
.hourly__day {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--accent);
  white-space: nowrap;
}
.hourly__time {
  font-size: 12px;
  color: var(--text-muted);
}
.hourly__emoji {
  font-size: 22px;
}
.hourly__temp {
  font-size: 15px;
  font-weight: 600;
}
.hourly__pop {
  font-size: 10px;
  color: #4aa8ff;
  font-weight: 600;
}
.hourly__hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
  text-transform: none;
  letter-spacing: 0;
}
.chart-range {
  display: flex;
  align-items: center;
  gap: 7px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
.chart-range label,
.chart-range em {
  font-size: 11px;
  color: var(--text-muted);
  font-style: normal;
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
</style>
