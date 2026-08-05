import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchCurrentWeatherByCity,
  fetchCurrentWeatherByCoords,
  fetchForecastByCoords,
  reverseGeocode,
} from '@/api/weather'
import { getCurrentPosition } from '@/utils/geolocation'
import { withCache } from '@/utils/cache'
import { mockCurrentWeather } from '@/api/mock'
import { resolveCityName, hasHangul } from '@/data/cityIndex'

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
  const locateStep = ref('') // 파이프라인 진행 단계 표시용
  const error = ref('')
  const usingCache = ref(false) // 오프라인 등으로 캐시 데이터를 보여주는 중인지
  const demoReason = ref('') // 데모 데이터로 물러난 사유 (빈 문자열이면 실시간)

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

  const loadDashboard = async (unit, { force = false } = {}) => {
    loading.value = true
    error.value = ''
    usingCache.value = false
    const cities = favorites.value.length ? favorites.value : DEFAULT_CITIES
    try {
      const results = await Promise.allSettled(
        cities.map((city) =>
          withCache(`city:${city}:${unit}`, () => fetchCurrentWeatherByCity(city, unit), { force }),
        ),
      )
      /**
       * 실패한 도시는 데모 데이터로 채운다.
       *
       * withCache가 이미 '실시간 → 만료된 캐시'까지 시도한 뒤라, 여기까지 온 건
       * 보여줄 실제 값이 정말 하나도 없다는 뜻이다. 예전에는 그 자리에 에러 카드를
       * 놓았는데, 키가 아직 활성화되지 않은 사람이 처음 열면 화면 전체가 에러였다.
       * 무엇을 만든 물건인지조차 보이지 않는다.
       *
       * 데모라는 사실은 화면에 밝히므로(demoReason → DemoDataNotice) 실측으로
       * 오해될 여지는 없다.
       */
      const failures = results.filter((r) => r.status === 'rejected')
      cards.value = results.map((r, idx) =>
        r.status === 'fulfilled' ? r.value.data : mockCurrentWeather(cities[idx], unit),
      )
      usingCache.value = results.some((r) => r.status === 'fulfilled' && r.value.stale)
      demoReason.value = failures.length
        ? (failures[0].reason?.message ?? '실시간 날씨 조회에 실패했습니다')
        : ''
    } finally {
      loading.value = false
    }
  }

  /**
   * 도시 검색 후 카드 추가.
   * OpenWeatherMap은 한글 도시명을 인식하지 못하므로, 색인에 있는 이름이면
   * 영문명으로 바꿔 조회한다. 색인에 없는 한글 입력은 실패할 수밖에 없어
   * 영문으로 다시 시도하도록 안내한다.
   */
  const searchAndAdd = async (input, unit) => {
    loading.value = true
    error.value = ''
    const { query, resolved } = resolveCityName(input)
    try {
      const result = await fetchCurrentWeatherByCity(query, unit)
      pushHistory(result.city)
      cards.value = [result, ...cards.value.filter((c) => c.city !== result.city)]
      return result
    } catch (err) {
      const needsEnglish = !resolved && hasHangul(query)
      error.value = needsEnglish
        ? `'${query}'을(를) 찾지 못했습니다. 영문 이름으로 검색하거나 자동완성 목록에서 선택해주세요.`
        : err.message
      throw new Error(error.value, { cause: err })
    } finally {
      loading.value = false
    }
  }

  /**
   * 내 위치 날씨 — 각 단계가 이전 결과에 의존하는 순차 비동기 파이프라인.
   *   좌표 확보 → 역지오코딩(지역명) → 현재 날씨 → 예보
   * 앞 단계가 실패하면 뒤 단계는 실행되지 않으며, 어느 단계에서 끊겼는지
   * locateStep에 남겨 사용자에게 진행 상황을 보여준다.
   */
  const loadMyLocation = async (unit) => {
    locating.value = true
    locateStep.value = '위치 확인 중…'
    try {
      // 1) 브라우저 권한 → 좌표
      const { lat, lon } = await getCurrentPosition()

      // 2) 좌표 → 지역명 (실패해도 치명적이지 않으므로 개별 처리)
      locateStep.value = '지역 확인 중…'
      const place = await reverseGeocode(lat, lon).catch(() => null)

      // 3) 좌표 → 현재 날씨
      locateStep.value = '날씨 조회 중…'
      const current = await fetchCurrentWeatherByCoords(lat, lon, unit)

      // 4) 좌표 → 예보 (앞 단계가 성공한 경우에만 도달)
      locateStep.value = '예보 조회 중…'
      const forecast = await fetchForecastByCoords(lat, lon, unit).catch(() => null)

      myLocation.value = {
        ...current,
        city: place?.name ?? current.city,
        country: place?.country ?? current.country,
        forecast,
        coords: { lat, lon },
      }
      return myLocation.value
    } finally {
      locating.value = false
      locateStep.value = ''
    }
  }

  return {
    favorites,
    history,
    cards,
    myLocation,
    loading,
    locating,
    locateStep,
    error,
    usingCache,
    demoReason,
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
