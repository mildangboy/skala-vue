<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Sunny, Odometer, Watch, Flag } from '@element-plus/icons-vue'
import { fetchCurrentWeatherByCoords, fetchForecastByCoords } from '@/api/weather'
import { formatTemp, formatHour, formatWeekday } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { raceStartDate } from '@/data/f1Calendar2026'
import { useConfigStore } from '@/stores/configStore'
import { useF1Store } from '@/stores/f1Store'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import TempChart from '@/components/TempChart.vue'
import { raceConditionBreakdown, raceConditionLabel, CONDITION_RULES } from '@/utils/raceCondition'

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

// 날씨 지표로 산출한 레이스 컨디션 (0~5, 0.5 단위)
const breakdown = computed(() => raceConditionBreakdown(current.value, config.unit))
const conditionScore = computed(() => breakdown.value?.score ?? null)
const conditionText = computed(() => raceConditionLabel(conditionScore.value))
const conditionTab = ref('score')
const rules = CONDITION_RULES

// 감점이 적용된 항목만 추려 "이 점수가 나온 이유"로 보여준다
const appliedFactors = computed(() => breakdown.value?.factors.filter((f) => f.delta < 0) ?? [])

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

onMounted(async () => {
  if (!f1.races.length) await f1.loadCalendar()
  load()
})

watch([() => route.params.circuitId, () => config.unit], load)
</script>

<template>
  <div class="circuit-detail">
    <el-button :icon="ArrowLeft" text @click="router.push({ name: 'f1-calendar' })">
      캘린더로
    </el-button>

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
        <!-- 레이스 컨디션 지수 (날씨 지표 기반 자동 산출) -->
        <BaseDashboardCard v-if="breakdown">
          <template #header>
            <span
              ><el-icon><Flag /></el-icon> 레이스 컨디션 지수</span
            >
          </template>

          <el-tabs v-model="conditionTab" class="condition__tabs">
            <!-- 탭 1: 현재 지수 -->
            <el-tab-pane label="현재 지수" name="score">
              <div class="condition">
                <el-rate
                  :model-value="conditionScore"
                  disabled
                  allow-half
                  :max="5"
                  size="large"
                  :colors="['#00a68f', '#00a68f', '#27f4d2']"
                />
                <div class="condition__meta">
                  <strong class="mono-num">{{ conditionScore }} / 5</strong>
                  <span>{{ conditionText }}</span>
                </div>
              </div>

              <!-- 이 점수가 나온 이유 -->
              <div class="condition__why">
                <template v-if="appliedFactors.length">
                  <p class="condition__why-title">감점 요인</p>
                  <ul class="condition__why-list">
                    <li v-for="f in appliedFactors" :key="f.key">
                      <span class="condition__why-label">{{ f.label }}</span>
                      <span class="condition__why-reading">{{ f.reading }}</span>
                      <span class="condition__why-delta mono-num">{{ f.delta.toFixed(1) }}</span>
                    </li>
                  </ul>
                </template>
                <p v-else class="condition__perfect">
                  감점 요인이 없습니다. 모든 지표가 쾌적 구간입니다.
                </p>
              </div>
            </el-tab-pane>

            <!-- 탭 2: 산출 방식 -->
            <el-tab-pane label="산출 방식" name="method">
              <p class="condition__intro">
                기본 <strong>5점</strong>에서 출발해 아래 네 가지 지표가 이상 범위를 벗어난 만큼
                감점합니다. 결과는 0.5점 단위로 반올림합니다.
              </p>

              <!-- 현재 날씨에 실제로 적용된 계산 과정 -->
              <div class="calc">
                <div class="calc__row calc__row--base">
                  <span>기본 점수</span>
                  <strong class="mono-num">5.0</strong>
                </div>
                <div
                  v-for="f in breakdown.factors"
                  :key="f.key"
                  class="calc__row"
                  :class="{ 'is-zero': f.delta === 0 }"
                >
                  <span>{{ f.label }}</span>
                  <em>{{ f.reading }}</em>
                  <strong class="mono-num">{{ f.delta === 0 ? '—' : f.delta.toFixed(2) }}</strong>
                </div>
                <div class="calc__row calc__row--total">
                  <span>최종 점수</span>
                  <em>0.5 단위 반올림</em>
                  <strong class="mono-num">{{ conditionScore }}</strong>
                </div>
              </div>

              <!-- 기준표 -->
              <el-table :data="rules" class="condition__table" size="small">
                <el-table-column prop="label" label="지표" width="110" />
                <el-table-column prop="ideal" label="이상 범위" width="130" />
                <el-table-column prop="penalty" label="감점 규칙" min-width="180" />
                <el-table-column prop="max" label="최대" width="70" align="center">
                  <template #default="{ row }">
                    <span class="mono-num">−{{ row.max }}</span>
                  </template>
                </el-table-column>
              </el-table>

              <ul class="condition__notes">
                <li v-for="r in rules" :key="r.key">
                  <strong>{{ r.label }}</strong> {{ r.note }}
                </li>
              </ul>

              <p class="condition__disclaimer">
                FIA 공식 지표가 아니라, 공개된 날씨 데이터로 관전 여건을 가늠해보기 위해 정한 자체
                기준입니다.
              </p>
            </el-tab-pane>
          </el-tabs>
        </BaseDashboardCard>

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
.condition {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.condition__meta {
  display: flex;
  flex-direction: column;
}
.condition__meta strong {
  font-size: 20px;
  font-weight: 700;
}
.condition__meta span {
  font-size: 13px;
  color: var(--text-secondary);
}
.condition__tabs :deep(.el-tabs__item) {
  font-weight: 600;
  color: var(--text-muted);
}
.condition__tabs :deep(.el-tabs__item.is-active) {
  color: var(--accent);
}
.condition__tabs :deep(.el-tabs__active-bar) {
  background-color: var(--accent);
}
.condition__tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: var(--surface-border);
}

/* 감점 요인 */
.condition__why {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--surface-border);
}
.condition__why-title {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.condition__why-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.condition__why-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.condition__why-label {
  min-width: 78px;
  font-weight: 600;
}
.condition__why-reading {
  flex: 1;
  color: var(--text-muted);
}
.condition__why-delta {
  font-weight: 700;
  color: var(--el-color-danger);
}
.condition__perfect {
  margin: 0;
  font-size: 13px;
  color: var(--accent);
}

/* 산출 방식 */
.condition__intro {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.calc {
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 18px;
}
.calc__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--surface-border);
}
.calc__row:last-child {
  border-bottom: none;
}
.calc__row span {
  min-width: 78px;
  font-weight: 600;
}
.calc__row em {
  flex: 1;
  font-style: normal;
  color: var(--text-muted);
  font-size: 12px;
}
.calc__row strong {
  font-weight: 700;
}
.calc__row.is-zero strong {
  color: var(--text-muted);
}
.calc__row--base {
  background: var(--accent-soft);
}
.calc__row--total {
  background: var(--accent-soft);
  font-size: 14px;
}
.calc__row--total strong {
  color: var(--accent);
  font-size: 16px;
}
.condition__table {
  margin-bottom: 14px;
}
.condition__notes {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.condition__notes li {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
  padding-left: 11px;
  border-left: 2px solid var(--surface-border);
}
.condition__notes strong {
  color: var(--text-secondary);
  margin-right: 4px;
}
.condition__disclaimer {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.8;
}
.chart-range {
  display: flex;
  align-items: center;
  gap: 7px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
.chart-range label {
  font-size: 11px;
  color: var(--text-muted);
}
.chart-range em {
  font-style: normal;
  font-size: 11px;
  color: var(--text-muted);
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
