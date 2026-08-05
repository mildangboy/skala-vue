<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Sunny, Odometer, Watch, InfoFilled } from '@element-plus/icons-vue'
import { fetchCurrentWeatherByCoords, fetchForecastByCoords } from '@/api/weather'
import { formatTemp, formatHour, formatWeekday, formatDate } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { raceStartDate } from '@/data/f1Calendar2026'
import { timezoneOf } from '@/data/circuitTimezones'
import { mockCurrentWeather, mockForecast } from '@/api/mock'
import { provideDemoSource } from '@/composables/useDemoSource'
import { useConfigStore } from '@/stores/configStore'
import { useF1Store } from '@/stores/f1Store'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import TempChart from '@/components/TempChart.vue'
import RaceConditionPanel from '@/components/RaceConditionPanel.vue'
import RaceWindowForecast from '@/components/RaceWindowForecast.vue'
import RaceInfoDialog from '@/components/RaceInfoDialog.vue'
import LocalTime from '@/components/LocalTime.vue'
import DemoDataNotice from '@/components/DemoDataNotice.vue'

const route = useRoute()
const router = useRouter()
const config = useConfigStore()
const f1 = useF1Store()

const current = ref(null)
const forecast = ref(null)
const loading = ref(false)
const error = ref('')
const chartHours = ref(8) // 차트에 표시할 예보 구간 (el-input-number로 조절)

// 이 화면이 보여주는 데이터의 출처를 하위 카드들이 읽을 수 있게 심어둔다.
// 배지가 놓이는 자리가 카드 헤더 슬롯 안쪽이라 props로는 두세 단계를 거쳐야 한다.
const demoSource = provideDemoSource()

const race = computed(() => f1.findRace(route.params.circuitId))

// 일정을 받아오기 전에는 '없는 서킷'인지 알 수 없다.
// 내장 캘린더에만 없는 서킷(시즌 중 변경된 경기)이 잠깐 "찾을 수 없습니다"로
// 깜빡이지 않도록, 조회가 끝난 뒤에만 판정한다.
const calendarReady = ref(false)

const infoOpen = ref(false)

const startAt = computed(() => (race.value ? raceStartDate(race.value) : null))
// 이미 열린 경기는 '경기 시간대 예보'를 보여줄 이유가 없다
const isPast = computed(() => Boolean(startAt.value) && startAt.value.getTime() < Date.now())

/** 서킷 현지 타임존. 표에 없는 서킷이면 빈 값이고, 그때는 내 시간만 나온다. */
const circuitTz = computed(() => timezoneOf(race.value?.circuitId) ?? '')

// 선택한 구간만큼 잘라서 차트에 전달
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

/**
 * 서킷 날씨 조회.
 *
 * 둘 중 하나만 실패해도 나머지는 살린다(allSettled). 예전에는 Promise.all이라
 * 예보 하나가 넘어지면 이미 받아둔 현재 날씨까지 버려졌다.
 * 둘 다 실패하면 데모로 채우고, 실측이 아니라는 사실을 화면에 밝힌다.
 */
const load = async () => {
  if (!race.value) return
  loading.value = true
  error.value = ''
  const label = race.value.circuit || race.value.circuitId

  const [cur, fc] = await Promise.allSettled([
    fetchCurrentWeatherByCoords(race.value.lat, race.value.lon, config.unit),
    fetchForecastByCoords(race.value.lat, race.value.lon, config.unit),
  ])

  const failure = [cur, fc].find((r) => r.status === 'rejected')
  current.value = cur.status === 'fulfilled' ? cur.value : mockCurrentWeather(label, config.unit)
  forecast.value = fc.status === 'fulfilled' ? fc.value : mockForecast(label, config.unit)

  demoSource.mark(
    'circuit-weather',
    failure ? (failure.reason?.message ?? '실시간 서킷 날씨 조회에 실패했습니다') : '',
  )
  loading.value = false
}

const { refresh, refreshing, lastUpdated, paused } = useAutoRefresh(load)

onMounted(async () => {
  await f1.loadCalendar()
  calendarReady.value = true
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

    <!-- 데모로 물러났을 때만 나타난다 (아니면 아무것도 그리지 않는다) -->
    <DemoDataNotice variant="line" />

    <SkeletonCard v-if="!race && !calendarReady" />
    <el-empty v-else-if="!race" description="해당 서킷을 찾을 수 없습니다">
      <el-button type="primary" round @click="router.push({ name: 'f1-calendar' })">
        캘린더에서 고르기
      </el-button>
    </el-empty>

    <template v-if="race">
      <!-- 히어로: 서킷 정보 + 현재 날씨 -->
      <section class="circuit-hero">
        <div class="circuit-hero__meta">
          <span class="circuit-hero__round">ROUND {{ race.round }} · {{ race.country }}</span>
          <h1>{{ race.name }}</h1>
          <p class="circuit-hero__circuit">{{ race.circuit }} · {{ race.locality }}</p>
          <p class="circuit-hero__time">
            <el-icon><Watch /></el-icon>
            <LocalTime :at="startAt" :time-zone="circuitTz" preset="full" />
          </p>
          <el-button
            class="circuit-hero__info"
            round
            size="small"
            :icon="InfoFilled"
            @click="infoOpen = true"
          >
            그랑프리 정보
          </el-button>
        </div>

        <div v-if="current" class="circuit-hero__now">
          <span class="circuit-hero__emoji">{{ iconEmoji(current.icon) }}</span>
          <div class="circuit-hero__temp temp-display">
            {{ formatTemp(current.temp, config.unit) }}
          </div>
          <div class="circuit-hero__desc">{{ current.description }}</div>
        </div>
        <RaceInfoDialog v-model="infoOpen" :race="race" />
      </section>

      <SkeletonCard v-if="loading" height="180px" :lines="3" />

      <template v-else-if="current">
        <!-- 레이스 컨디션 지수 — 산출 로직과 근거 표시는 패널이 캡슐화 -->
        <RaceConditionPanel :weather="current" :unit="config.unit" />

        <!-- 경기 시작 전후 시간대 날씨 (지난 경기에는 의미가 없어 감춘다) -->
        <RaceWindowForecast v-if="!isPast" :race="race" :start-at="startAt" />

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
          <template #header="{ demo }">
            <span>현재 서킷 컨디션</span>
            <DemoDataNotice v-if="demo" variant="pill" :demo="true" />
          </template>
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

        <!-- 시간별 예보 -->
        <BaseDashboardCard v-if="hourlyItems.length">
          <template #header>
            <span>시간별 예보</span>
            <span class="hourly__hint">서킷 현지 시각 · 3시간 간격 · 좌우로 스크롤</span>
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
.circuit-hero__info {
  margin-top: 14px;
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
.hourly__item.is-day-start {
  border-left: 1px solid var(--surface-border);
}
.hourly__item.is-day-start:first-child {
  border-left: none;
}
.hourly__day {
  font-size: 10px;
  font-weight: 700;
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
