import { describeWeather } from './weatherText.js'

// 공용 포맷/유틸 함수 모음 (모던 JS: 화살표 함수, 템플릿 리터럴, 삼항 연산자 활용)
export const capitalize = (text = '') => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '')

export const formatTemp = (value, unit = 'metric') => {
  if (value === null || value === undefined) return '--'
  const symbol = unit === 'metric' ? '°C' : '°F'
  return `${Math.round(value)}${symbol}`
}

export const unitSymbolOf = (unit) => (unit === 'metric' ? '°C' : '°F')
export const speedUnitOf = (unit) => (unit === 'metric' ? 'm/s' : 'mph')

export const formatDate = (unixSeconds, timezoneOffsetSeconds = 0, options = {}) => {
  const date = new Date((unixSeconds + timezoneOffsetSeconds) * 1000)
  return date.toLocaleString('ko-KR', { timeZone: 'UTC', ...options })
}

export const formatWeekday = (unixSeconds, timezoneOffsetSeconds = 0) =>
  formatDate(unixSeconds, timezoneOffsetSeconds, { weekday: 'short' })

export const formatHour = (unixSeconds, timezoneOffsetSeconds = 0) =>
  formatDate(unixSeconds, timezoneOffsetSeconds, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

// 응답 데이터 중 필요한 값만 뽑아 화면 친화적 구조로 변환 (구조 분해 할당 + optional chaining + nullish coalescing)
// 설명 문구는 API의 기계번역 대신 날씨 코드로 직접 매핑한다 (weatherText.js 참고)
export const normalizeCurrentWeather = (raw) => {
  const { name, sys, main, weather, wind, dt, timezone, coord } = raw ?? {}
  const [primary] = weather ?? []
  return {
    city: name ?? '알 수 없음',
    country: sys?.country ?? '',
    temp: main?.temp ?? null,
    feelsLike: main?.feels_like ?? null,
    tempMin: main?.temp_min ?? null,
    tempMax: main?.temp_max ?? null,
    humidity: main?.humidity ?? null,
    pressure: main?.pressure ?? null,
    conditionId: primary?.id ?? null,
    description: describeWeather(primary?.id, primary?.description),
    icon: primary?.icon ?? '01d',
    windSpeed: wind?.speed ?? null,
    dt: dt ?? Math.floor(Date.now() / 1000),
    timezone: timezone ?? 0,
    coord: coord ?? null,
  }
}

export const normalizeForecast = (raw) => {
  const list = raw?.list ?? []
  const timezone = raw?.city?.timezone ?? 0
  // 3시간 간격 데이터를 일자별 대표값(정오 근접)으로 그룹핑
  const byDay = list.reduce((acc, item) => {
    const dayKey = formatDate(item.dt, timezone, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    if (!acc[dayKey]) acc[dayKey] = []
    acc[dayKey].push(item)
    return acc
  }, {})

  const daily = Object.entries(byDay).map(([day, items]) => {
    const noonItem =
      items.find((i) => formatHour(i.dt, timezone).startsWith('12')) ??
      items[Math.floor(items.length / 2)]
    const temps = items.map((i) => i.main?.temp).filter((t) => typeof t === 'number')
    return {
      day,
      icon: noonItem?.weather?.[0]?.icon ?? '01d',
      conditionId: noonItem?.weather?.[0]?.id ?? null,
      description: describeWeather(noonItem?.weather?.[0]?.id, noonItem?.weather?.[0]?.description),
      min: Math.min(...temps),
      max: Math.max(...temps),
      dt: noonItem?.dt,
    }
  })

  // 5일 예보는 3시간 간격 40건이 온다. 이전에는 8건만 남겨 하루도 채우지 못했다.
  // 전량을 넘기고 화면에서 필요한 만큼 잘라 쓰도록 한다.
  const hourly = list.map((item) => ({
    dt: item.dt,
    temp: item.main?.temp ?? null,
    icon: item.weather?.[0]?.icon ?? '01d',
    conditionId: item.weather?.[0]?.id ?? null,
    pop: item.pop ?? null, // 강수 확률 (0~1)
  }))

  return { timezone, daily, hourly }
}

/** 상대 시각 표기 (예: '방금 전', '3분 전') — 마지막 갱신 시각 표시용 */
export const timeAgo = (timestamp, now = Date.now()) => {
  if (!timestamp) return ''
  const diffSec = Math.floor((now - timestamp) / 1000)
  if (diffSec < 30) return '방금 전'
  if (diffSec < 60) return `${diffSec}초 전`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}분 전`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`
  return `${Math.floor(hour / 24)}일 전`
}
