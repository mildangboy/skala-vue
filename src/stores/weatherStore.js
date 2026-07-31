import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchCurrentWeatherByCity, fetchCurrentWeatherByCoords } from '@/api/weather'
import { getCurrentPosition } from '@/utils/geolocation'
import { withCache } from '@/utils/cache'

const FAVORITES_KEY = 'skala-vue:favorites'
const HISTORY_KEY = 'skala-vue:history'
const DEFAULT_CITIES = ['Seoul', 'London', 'Monza', 'Suzuka']

const readList = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export const useWeatherStore = defineStore('weather', () => {
  const favorites = ref(readList(FAVORITES_KEY))
  const history = ref(readList(HISTORY_KEY))
  const cards = ref([])
  const myLocation = ref(null) // Geolocation 기반 현재 위치 날씨
  const loading = ref(false)
  const locating = ref(false)
  const error = ref('')
  const usingCache = ref(false) // 오프라인 등으로 캐시 데이터를 보여주는 중인지

  watch(favorites, (v) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(v)), { deep: true })
  watch(history, (v) => localStorage.setItem(HISTORY_KEY, JSON.stringify(v)), { deep: true })

  const isFavorite = computed(() => (city) => favorites.value.includes(city))

  const pushHistory = (city) => {
    history.value = [city, ...history.value.filter((c) => c !== city)].slice(0, 8)
  }

  const clearHistory = () => (history.value = [])

  const toggleFavorite = (city) => {
    favorites.value = favorites.value.includes(city)
      ? favorites.value.filter((c) => c !== city)
      : [...favorites.value, city]
  }

  const removeCard = (city) => {
    cards.value = cards.value.filter((c) => c.city !== city)
    favorites.value = favorites.value.filter((c) => c !== city)
  }

  const loadDashboard = async (unit) => {
    loading.value = true
    error.value = ''
    usingCache.value = false
    const cities = favorites.value.length ? favorites.value : DEFAULT_CITIES
    try {
      const results = await Promise.allSettled(
        cities.map((city) =>
          withCache(`city:${city}:${unit}`, () => fetchCurrentWeatherByCity(city, unit)),
        ),
      )
      cards.value = results.map((r, idx) =>
        r.status === 'fulfilled' ? r.value.data : { city: cities[idx], failed: true },
      )
      usingCache.value = results.some((r) => r.status === 'fulfilled' && r.value.stale)
      if (results.every((r) => r.status === 'rejected')) {
        error.value = results[0]?.reason?.message ?? '날씨 정보를 불러오지 못했습니다.'
      }
    } finally {
      loading.value = false
    }
  }

  const searchAndAdd = async (city, unit) => {
    loading.value = true
    error.value = ''
    try {
      const result = await fetchCurrentWeatherByCity(city, unit)
      pushHistory(result.city)
      cards.value = [result, ...cards.value.filter((c) => c.city !== result.city)]
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /** Geolocation 권한을 받아 현재 위치 날씨를 조회 */
  const loadMyLocation = async (unit) => {
    locating.value = true
    try {
      const { lat, lon } = await getCurrentPosition()
      myLocation.value = await fetchCurrentWeatherByCoords(lat, lon, unit)
      return myLocation.value
    } finally {
      locating.value = false
    }
  }

  return {
    favorites,
    history,
    cards,
    myLocation,
    loading,
    locating,
    error,
    usingCache,
    isFavorite,
    toggleFavorite,
    removeCard,
    pushHistory,
    clearHistory,
    loadDashboard,
    searchAndAdd,
    loadMyLocation,
  }
})
