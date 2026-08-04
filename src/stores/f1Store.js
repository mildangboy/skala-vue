import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchSeasonCalendar } from '@/api/f1'
import { fetchCurrentWeatherByCoords } from '@/api/weather'
import { F1_CALENDAR_2026, raceStartDate } from '@/data/f1Calendar2026'
import { withCache } from '@/utils/cache'

export const useF1Store = defineStore('f1', () => {
  const races = ref(F1_CALENDAR_2026)
  const source = ref('bundled') // 'live' | 'bundled'
  const loading = ref(false)
  const circuitWeather = ref({}) // circuitId -> 정규화된 날씨 데이터
  const weatherLoading = ref(false)
  const now = ref(new Date())

  // 아직 열리지 않은 다음 그랑프리 (시즌 종료 시 마지막 레이스 유지)
  const nextRace = computed(
    () => races.value.find((r) => raceStartDate(r) > now.value) ?? races.value.at(-1) ?? null,
  )

  const pastRaces = computed(() => races.value.filter((r) => raceStartDate(r) <= now.value))
  const upcomingRaces = computed(() => races.value.filter((r) => raceStartDate(r) > now.value))

  const seasonProgress = computed(() =>
    races.value.length ? Math.round((pastRaces.value.length / races.value.length) * 100) : 0,
  )

  const findRace = (circuitId) => races.value.find((r) => r.circuitId === circuitId) ?? null

  /** 다음 레이스까지 남은 시간 (일/시/분/초) */
  const countdown = computed(() => {
    if (!nextRace.value) return null
    const diff = raceStartDate(nextRace.value) - now.value
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, live: true }
    const seconds = Math.floor(diff / 1000)
    return {
      days: Math.floor(seconds / 86400),
      hours: Math.floor((seconds % 86400) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      seconds: seconds % 60,
      live: false,
    }
  })

  const tick = () => (now.value = new Date())

  /**
   * 시즌 일정을 받아온다.
   *
   * races는 처음부터 내장 캘린더로 채워져 있다. 빈 화면을 보여주지 않으려는 것인데,
   * 그래서 '비어 있으면 받아온다'는 식의 조건은 영원히 거짓이 된다.
   * 이미 받아왔는지는 개수가 아니라 source로 판단해야 한다.
   *
   * 라이브 일정은 하루 안에 바뀌지 않으므로 한 번 받으면 다시 부르지 않는다.
   */
  const loadCalendar = async ({ force = false } = {}) => {
    if (source.value === 'live' && !force) return
    loading.value = true
    try {
      const { races: list, source: src } = await fetchSeasonCalendar()
      races.value = list
      source.value = src
    } finally {
      loading.value = false
    }
  }

  /** 지정한 서킷들의 현재 날씨를 좌표 기반으로 병렬 조회 (캐시 적용) */
  const loadCircuitWeather = async (targets, unit = 'metric', { force = false } = {}) => {
    if (!targets?.length) return
    weatherLoading.value = true
    try {
      const results = await Promise.allSettled(
        targets.map((race) =>
          withCache(
            `circuit:${race.circuitId}:${unit}`,
            () => fetchCurrentWeatherByCoords(race.lat, race.lon, unit),
            { ttl: 10 * 60 * 1000, force },
          ),
        ),
      )
      const next = { ...circuitWeather.value }
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') next[targets[idx].circuitId] = res.value.data
      })
      circuitWeather.value = next
    } finally {
      weatherLoading.value = false
    }
  }

  return {
    races,
    source,
    loading,
    circuitWeather,
    weatherLoading,
    nextRace,
    pastRaces,
    upcomingRaces,
    seasonProgress,
    countdown,
    findRace,
    tick,
    loadCalendar,
    loadCircuitWeather,
  }
})
