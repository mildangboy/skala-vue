<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Grid, List } from '@element-plus/icons-vue'
import CircuitWeatherCard from '@/components/CircuitWeatherCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { useConfigStore } from '@/stores/configStore'
import { useF1Store } from '@/stores/f1Store'
import { formatTemp } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { raceStartDate } from '@/data/f1Calendar2026'

const router = useRouter()
const config = useConfigStore()
const f1 = useF1Store()
const {
  races,
  upcomingRaces,
  pastRaces,
  circuitWeather,
  loading,
  weatherLoading,
  seasonProgress,
  source,
} = storeToRefs(f1)

const activeTab = ref('upcoming') // el-tabs
const viewMode = ref('grid') // 'grid' | 'table'

const visibleRaces = computed(() => {
  if (activeTab.value === 'upcoming') return upcomingRaces.value
  if (activeTab.value === 'past') return pastRaces.value
  return races.value
})

// 표시 중인 라운드의 서킷 날씨만 조회 (API 호출 최소화)
const loadWeatherForVisible = (force = false) => {
  const targets = visibleRaces.value.slice(0, 12)
  return targets.length ? f1.loadCircuitWeather(targets, config.unit, { force }) : Promise.resolve()
}

const { refresh, refreshing, lastUpdated, paused } = useAutoRefresh(() =>
  loadWeatherForVisible(true),
)

onMounted(async () => {
  await f1.loadCalendar()
  loadWeatherForVisible()
})

watch([activeTab, () => config.unit], () => loadWeatherForVisible())

const openCircuit = (circuitId) => router.push({ name: 'circuit-detail', params: { circuitId } })

// el-table 정렬용 파생 데이터
const tableRows = computed(() =>
  visibleRaces.value.map((r) => {
    const w = circuitWeather.value[r.circuitId]
    return {
      ...r,
      dateLabel: raceStartDate(r).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      tempValue: w?.temp ?? null,
      tempLabel: w ? formatTemp(w.temp, config.unit) : '—',
      humidity: w?.humidity ?? null,
      wind: w?.windSpeed ?? null,
      emoji: w ? iconEmoji(w.icon) : '',
      desc: w?.description ?? '',
    }
  }),
)
</script>

<template>
  <div class="calendar-view">
    <header class="calendar-view__head">
      <div>
        <h1>2026 시즌 캘린더</h1>
        <p>
          전 {{ races.length }}개 그랑프리 · 시즌 진행률 {{ seasonProgress }}%
          <el-tag size="small" class="calendar-view__source">
            {{ source === 'live' ? 'LIVE API' : '내장 데이터' }}
          </el-tag>
        </p>
      </div>

      <div class="calendar-view__actions">
        <RefreshButton
          :refreshing="refreshing"
          :last-updated="lastUpdated"
          :paused="paused"
          @refresh="refresh"
        />
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="grid">
            <el-icon><Grid /></el-icon>
          </el-radio-button>
          <el-radio-button value="table">
            <el-icon><List /></el-icon>
          </el-radio-button>
        </el-radio-group>
      </div>
    </header>

    <el-progress
      :percentage="seasonProgress"
      :stroke-width="6"
      :show-text="false"
      class="calendar-view__progress"
    />

    <el-tabs v-model="activeTab" class="calendar-view__tabs">
      <el-tab-pane label="다가오는 레이스" name="upcoming" />
      <el-tab-pane label="종료된 레이스" name="past" />
      <el-tab-pane label="전체" name="all" />
    </el-tabs>

    <div v-if="loading" class="calendar-view__grid">
      <SkeletonCard v-for="n in 6" :key="n" height="150px" :lines="2" />
    </div>

    <template v-else>
      <div v-if="viewMode === 'grid'" class="calendar-view__grid">
        <CircuitWeatherCard
          v-for="race in visibleRaces"
          :key="race.circuitId"
          :race="race"
          :weather="circuitWeather[race.circuitId] ?? null"
          :unit="config.unit"
          :past="raceStartDate(race) <= new Date()"
          @open="openCircuit"
        />
      </div>

      <!-- el-table: 교재 Data 컴포넌트 활용 (정렬 가능) -->
      <el-table
        v-else
        v-loading="weatherLoading"
        :data="tableRows"
        class="calendar-view__table"
        stripe
        @row-click="(row) => openCircuit(row.circuitId)"
      >
        <el-table-column prop="round" label="R" width="60" sortable align="center" />
        <el-table-column prop="name" label="그랑프리" min-width="160" sortable />
        <el-table-column prop="circuit" label="서킷" min-width="190" show-overflow-tooltip />
        <el-table-column prop="dateLabel" label="일자" width="100" />
        <el-table-column prop="tempValue" label="현재 기온" width="120" sortable align="center">
          <template #default="{ row = {} } = {}">
            <span class="calendar-view__temp">{{ row.emoji }} {{ row.tempLabel }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="humidity" label="습도" width="90" sortable align="center">
          <template #default="{ row = {} } = {}">{{
            row.humidity != null ? row.humidity + '%' : '—'
          }}</template>
        </el-table-column>
        <el-table-column label="스프린트" width="90" align="center">
          <template #default="{ row = {} } = {}">
            <el-tag v-if="row.sprint" size="small" type="success" effect="plain">SPRINT</el-tag>
            <span v-else class="calendar-view__dash">—</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!visibleRaces.length" description="해당하는 레이스가 없습니다" />
    </template>
  </div>
</template>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.calendar-view__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.calendar-view__head h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
}
.calendar-view__head p {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.calendar-view__source {
  --el-tag-bg-color: var(--accent-soft);
  --el-tag-border-color: transparent;
  --el-tag-text-color: var(--accent);
  font-weight: 700;
  font-size: 10px;
}
.calendar-view__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.calendar-view__progress :deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, var(--amg-teal-deep), var(--amg-teal));
}
.calendar-view__tabs :deep(.el-tabs__item) {
  color: var(--text-muted);
  font-weight: 600;
}
.calendar-view__tabs :deep(.el-tabs__item.is-active) {
  color: var(--accent);
}
.calendar-view__tabs :deep(.el-tabs__active-bar) {
  background-color: var(--accent);
}
.calendar-view__tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: var(--surface-border);
}
.calendar-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 14px;
}
.calendar-view__table {
  background: var(--surface);
  border-radius: var(--radius-card);
  border: 1px solid var(--surface-border);
  overflow: hidden;
  backdrop-filter: var(--blur-glass);
  cursor: pointer;
}
.calendar-view__table :deep(.el-table__row):hover > td {
  background: var(--table-row-hover);
}
.calendar-view__temp {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.calendar-view__dash {
  color: var(--text-muted);
}
</style>
