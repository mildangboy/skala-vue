import client from './client'
import { normalizeCurrentWeather, normalizeForecast } from '@/utils/format'

// 도시 이름으로 현재 날씨 조회
export const fetchCurrentWeatherByCity = async (city, unit = 'metric') => {
  const { data } = await client.get('/data/2.5/weather', {
    params: { q: city, units: unit },
  })
  return normalizeCurrentWeather(data)
}

// 좌표로 현재 날씨 조회 (F1 서킷 / 내 위치에서 사용)
export const fetchCurrentWeatherByCoords = async (lat, lon, unit = 'metric') => {
  const { data } = await client.get('/data/2.5/weather', {
    params: { lat, lon, units: unit },
  })
  return normalizeCurrentWeather(data)
}

// 5일치 3시간 간격 예보 (도시명)
export const fetchForecastByCity = async (city, unit = 'metric') => {
  const { data } = await client.get('/data/2.5/forecast', {
    params: { q: city, units: unit },
  })
  return normalizeForecast(data)
}

// 5일치 3시간 간격 예보 (좌표)
export const fetchForecastByCoords = async (lat, lon, unit = 'metric') => {
  const { data } = await client.get('/data/2.5/forecast', {
    params: { lat, lon, units: unit },
  })
  return normalizeForecast(data)
}

// Geocoding API: 검색어 자동완성용 도시 목록
export const searchCities = async (query) => {
  if (!query?.trim()) return []
  const { data } = await client.get('/geo/1.0/direct', {
    params: { q: query, limit: 5 },
  })
  return (data ?? []).map((item) => ({
    name: item.name,
    country: item.country,
    state: item.state ?? '',
    lat: item.lat,
    lon: item.lon,
    label: [item.name, item.state, item.country].filter(Boolean).join(', '),
  }))
}

// 역지오코딩: 좌표 -> 지역명 (내 위치 파이프라인에서 사용)
export const reverseGeocode = async (lat, lon) => {
  const { data } = await client.get('/geo/1.0/reverse', {
    params: { lat, lon, limit: 1 },
  })
  const [place] = data ?? []
  return place
    ? {
        name: place.local_names?.ko ?? place.name,
        country: place.country,
        state: place.state ?? '',
      }
    : null
}

/**
 * 주어진 키로 실제 API를 호출해 유효성을 확인한다.
 * 폼의 비동기 validator에서 사용하며, 저장 전에 잘못된 키를 걸러낸다.
 */
export const verifyApiKey = async (key) => {
  const { data } = await client.get('/data/2.5/weather', {
    params: { q: 'London', units: 'metric', appid: key },
  })
  return Boolean(data?.name)
}
