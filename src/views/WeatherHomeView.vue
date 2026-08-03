<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import RaceHero from '@/components/RaceHero.vue'
import WeatherParent from '@/components/WeatherParent.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import ApiKeyGate from '@/components/ApiKeyGate.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useConfigStore } from '@/stores/configStore'
import { useF1Store } from '@/stores/f1Store'
import { useWeatherStore } from '@/stores/weatherStore'
import { useAutoRefresh } from '@/composables/useAutoRefresh'

const config = useConfigStore()
const f1 = useF1Store()
const weather = useWeatherStore()
const { nextRace, countdown, circuitWeather, loading } = storeToRefs(f1)

let timer = null

const nextRaceWeather = computed(() =>
  nextRace.value ? (circuitWeather.value[nextRace.value.circuitId] ?? null) : null,
)

const loadHeroWeather = (force = false) => {
  if (!nextRace.value) return Promise.resolve()
  return f1.loadCircuitWeather([nextRace.value], config.unit, { force })
}

// 히어로(서킷)와 도시 카드를 한 번에 갱신한다
const refreshAll = () =>
  Promise.all([loadHeroWeather(true), weather.loadDashboard(config.unit, { force: true })])

const { refresh, refreshing, lastUpdated, paused } = useAutoRefresh(refreshAll)

onMounted(async () => {
  await f1.loadCalendar()
  loadHeroWeather()
  timer = setInterval(() => f1.tick(), 1000) // 카운트다운 1초 갱신
})

onBeforeUnmount(() => clearInterval(timer))

watch(
  () => config.unit,
  () => loadHeroWeather(),
)
</script>

<template>
  <div class="home">
    <ApiKeyGate @saved="refresh" />

    <SkeletonCard v-if="loading && !nextRace" height="260px" :lines="4" />
    <RaceHero
      v-else
      :race="nextRace"
      :weather="nextRaceWeather"
      :countdown="countdown"
      :unit="config.unit"
    />

    <section class="home__cities">
      <header class="home__section-head">
        <div>
          <h2>내 도시</h2>
          <p>검색해서 추가하고, 별을 눌러 즐겨찾기에 고정하세요.</p>
        </div>
        <RefreshButton
          :refreshing="refreshing"
          :last-updated="lastUpdated"
          :paused="paused"
          @refresh="refresh"
        />
      </header>
      <WeatherParent />
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.home__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.home__section-head h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}
.home__section-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
