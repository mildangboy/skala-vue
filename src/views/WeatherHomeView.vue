<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import RaceHero from '@/components/RaceHero.vue'
import WeatherParent from '@/components/WeatherParent.vue'
import ApiKeyGate from '@/components/ApiKeyGate.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import { useConfigStore } from '@/stores/configStore'
import { useF1Store } from '@/stores/f1Store'

const config = useConfigStore()
const f1 = useF1Store()
const { nextRace, countdown, circuitWeather, loading } = storeToRefs(f1)

let timer = null

const nextRaceWeather = computed(() =>
  nextRace.value ? (circuitWeather.value[nextRace.value.circuitId] ?? null) : null,
)

const loadHeroWeather = () => {
  if (nextRace.value) f1.loadCircuitWeather([nextRace.value], config.unit)
}

onMounted(async () => {
  await f1.loadCalendar()
  loadHeroWeather()
  // 카운트다운 1초 갱신
  timer = setInterval(() => f1.tick(), 1000)
})

onBeforeUnmount(() => clearInterval(timer))

watch(() => config.unit, loadHeroWeather)

// API 키 입력 직후 전체 데이터를 다시 불러온다
const reloadAll = () => {
  loadHeroWeather()
  window.dispatchEvent(new CustomEvent('skala:reload-weather'))
}
</script>

<template>
  <div class="home">
    <ApiKeyGate @saved="reloadAll" />

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
        <h2>내 도시</h2>
        <p>검색해서 추가하고, 별을 눌러 즐겨찾기에 고정하세요.</p>
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
