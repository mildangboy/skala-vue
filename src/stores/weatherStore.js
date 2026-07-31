import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchCurrentWeatherByCity } from '@/api/weather'

const FAVORITES_KEY = 'skala-vue:favorites'
const HISTORY_KEY = 'skala-vue:history'

const readList = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const useWeatherStore = defineStore('weather', () => {
  const favorites = ref(readList(FAVORITES_KEY)) // 즐겨찾기 도시 이름 목록
  const history = ref(readList(HISTORY_KEY)) // 최근 검색어 (최대 8개)
  const cards = ref([]) // 홈 대시보드에 표시할 카드별 날씨 데이터
  const loading = ref(false)
  const error = ref('')

  const isFavorite = computed(() => (city) => favorites.value.includes(city))

  watch(favorites, (value) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(value)), { deep: true })
  watch(history, (value) => localStorage.setItem(HISTORY_KEY, JSON.stringify(value)), { deep: true })

  const pushHistory = (city) => {
    history.value = [city, ...history.value.filter((c) => c !== city)].slice(0, 8)
  }

  const toggleFavorite = (city) => {
    favorites.value = favorites.value.includes(city)
      ? favorites.value.filter((c) => c !== city)
      : [...favorites.value, city]
  }

  // 즐겨찾기(없으면 기본 도시) 날씨를 한 번에 불러와 대시보드 카드 구성
  const loadDashboard = async (unit, defaults = ['Seoul', 'Busan', 'Tokyo', 'New York']) => {
    loading.value = true
    error.value = ''
    const cities = favorites.value.length ? favorites.value : defaults
    try {
      const results = await Promise.allSettled(cities.map((city) => fetchCurrentWeatherByCity(city, unit)))
      cards.value = results
        .map((r, idx) => (r.status === 'fulfilled' ? r.value : { city: cities[idx], failed: true }))
        .filter(Boolean)
    } catch (err) {
      error.value = err.message
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

  return { favorites, history, cards, loading, error, isFavorite, toggleFavorite, loadDashboard, searchAndAdd }
})
