import client from './client'
import { normalizeCurrentWeather, normalizeForecast } from '@/utils/format'
import { searchLocalCities } from '@/data/cityIndex'

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

/**
 * 검색어 자동완성.
 *
 * 로컬 색인을 접두어로 매칭해 알파벳 순으로 먼저 보여주고, 자리가 남으면
 * Geocoding API 결과를 뒤에 덧붙인다. API 단독으로는 'Dae'에 대구·대전이 나오지 않고
 * 한글 입력도 매칭되지 않기 때문.
 *
 * 로컬 결과가 충분하면 API를 호출하지 않는다 — 알파벳 순서를 흐트러뜨리지 않고
 * 분당 60회 호출 한도도 아낀다.
 */
export const searchCities = async (query) => {
  const q = query?.trim()
  if (!q) return []

  const local = searchLocalCities(q)

  // 로컬에서 6건 이상 잡히면 그대로 보여준다 (API 호출 생략)
  if (local.length >= 6) return local

  let remote
  try {
    const { data } = await client.get('/geo/1.0/direct', {
      params: { q, limit: 5 },
    })
    remote = (data ?? []).map((item) => ({
      name: item.name,
      country: item.country,
      state: item.state ?? '',
      lat: item.lat,
      lon: item.lon,
      label:
        [item.local_names?.ko, item.name].filter(Boolean).join(' · ') +
        `, ${[item.state, item.country].filter(Boolean).join(', ')}`,
      local: false,
    }))
  } catch {
    remote = [] // API가 실패해도 로컬 색인 결과는 그대로 보여준다
  }

  // 도시명+국가로 중복 제거 (로컬 우선)
  const seen = new Set(local.map((c) => `${c.name.toLowerCase()}|${c.country}`))
  const merged = [...local]
  for (const r of remote) {
    const key = `${r.name.toLowerCase()}|${r.country}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(r)
  }
  return merged.slice(0, 8)
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
