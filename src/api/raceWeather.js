import axios from 'axios'

/**
 * 레이스 시간대 예보 (Open-Meteo).
 *
 * 왜 OpenWeather를 두고 다른 API를 쓰는가:
 *
 * 앱의 나머지 날씨는 OpenWeather로 받는다. 그런데 무료 예보가 5일치·3시간 간격이라
 * 이 기능에는 맞지 않는다. 레이스는 보통 2주 간격이라 대부분의 기간 동안
 * 다음 경기가 예보 범위 밖이고, 두 시간짜리 경기를 3시간 칸으로 보면
 * 경기 중에 비가 오는지 아닌지가 한 칸에 뭉개진다.
 *
 * Open-Meteo는 16일치를 1시간 간격으로 주고 키도 필요 없다.
 * 그래서 '레이스 시간대'라는 이 용도에만 쓰고, 나머지는 그대로 둔다.
 *
 * 출처: Open-Meteo (https://open-meteo.com) — CC BY 4.0
 */
const BASE = 'https://api.open-meteo.com/v1/forecast'

/** Open-Meteo가 앞으로 몇 일까지 주는지 */
export const FORECAST_DAYS = 16

/**
 * WMO 날씨 코드 → 우리말 설명과 아이콘.
 * OpenWeather의 코드 체계와 달라서 따로 둔다.
 */
const WMO = {
  0: ['맑음', '☀️'],
  1: ['대체로 맑음', '🌤️'],
  2: ['구름 조금', '⛅'],
  3: ['흐림', '☁️'],
  45: ['안개', '🌫️'],
  48: ['서리 안개', '🌫️'],
  51: ['약한 이슬비', '🌦️'],
  53: ['이슬비', '🌦️'],
  55: ['강한 이슬비', '🌧️'],
  56: ['어는 이슬비', '🌧️'],
  57: ['강한 어는 이슬비', '🌧️'],
  61: ['약한 비', '🌦️'],
  63: ['비', '🌧️'],
  65: ['강한 비', '🌧️'],
  66: ['어는 비', '🌧️'],
  67: ['강한 어는 비', '🌧️'],
  71: ['약한 눈', '🌨️'],
  73: ['눈', '🌨️'],
  75: ['강한 눈', '❄️'],
  77: ['싸락눈', '🌨️'],
  80: ['약한 소나기', '🌦️'],
  81: ['소나기', '🌧️'],
  82: ['강한 소나기', '⛈️'],
  85: ['소낙눈', '🌨️'],
  86: ['강한 소낙눈', '❄️'],
  95: ['천둥번개', '⛈️'],
  96: ['우박 동반 뇌우', '⛈️'],
  99: ['강한 우박 뇌우', '⛈️'],
}

export const describeWmo = (code) => {
  const [text, icon] = WMO[code] ?? ['정보 없음', '❓']
  return { text, icon }
}

/** 비/눈이 내리는 코드인지 */
export const isWet = (code) => code >= 51 && code !== 77

const toIsoHour = (d) => {
  // Open-Meteo의 시간 문자열은 "2026-08-23T13:00" 형식(초 없음)이다
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:00`
}

/**
 * 경기 시간대 예보를 뽑는다.
 *
 * @param {object} opts
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @param {Date}   opts.startAt 경기 시작 시각
 * @param {number} opts.before  시작 몇 시간 전부터 (기본 1)
 * @param {number} opts.after   시작 몇 시간 뒤까지 (기본 3 — F1 결승은 최장 3시간)
 * @param {'metric'|'imperial'} opts.unit
 *
 * @returns {Promise<{status:'ok'|'out-of-range', hours?: Array, daysAway:number}>}
 *   status가 'out-of-range'면 아직 예보가 닿지 않는 시점이다.
 */
export const fetchRaceWindow = async ({
  lat,
  lon,
  startAt,
  before = 1,
  after = 3,
  unit = 'metric',
}) => {
  const daysAway = (startAt.getTime() - Date.now()) / 86400000

  // 예보 범위를 넘으면 요청 자체를 보내지 않는다. 어차피 빈 답이 온다.
  if (daysAway > FORECAST_DAYS) return { status: 'out-of-range', daysAway }

  const { data } = await axios.get(BASE, {
    params: {
      latitude: lat,
      longitude: lon,
      hourly:
        'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,weather_code',
      forecast_days: FORECAST_DAYS,
      timezone: 'UTC',
      ...(unit === 'imperial'
        ? { temperature_unit: 'fahrenheit', wind_speed_unit: 'mph' }
        : { wind_speed_unit: 'kmh' }),
    },
    timeout: 8000,
  })

  const h = data?.hourly
  if (!h?.time?.length) return { status: 'out-of-range', daysAway }

  const wanted = []
  for (let i = -before; i <= after; i += 1) {
    wanted.push(new Date(startAt.getTime() + i * 3600000))
  }

  const hours = wanted
    .map((at, i) => {
      const idx = h.time.indexOf(toIsoHour(at))
      if (idx < 0) return null
      return {
        at,
        offset: i - before, // 0이 경기 시작
        temp: h.temperature_2m[idx],
        feelsLike: h.apparent_temperature?.[idx],
        pop: h.precipitation_probability[idx], // %
        precip: h.precipitation[idx], // mm
        wind: h.wind_speed_10m[idx],
        code: h.weather_code[idx],
      }
    })
    .filter(Boolean)

  if (!hours.length) return { status: 'out-of-range', daysAway }
  return { status: 'ok', hours, daysAway }
}

/**
 * 경기 시간대 요약 한 줄.
 *
 * 최대 강수확률로 판단한다. 평균을 쓰면 두 시간 중 한 시간만 쏟아지는 경우가
 * 묻히는데, 레이스에서는 그 한 시간이 결과를 뒤집는다.
 */
export const summarize = (hours = []) => {
  const racing = hours.filter((h) => h.offset >= 0)
  const scope = racing.length ? racing : hours
  if (!scope.length) return null

  const maxPop = Math.max(...scope.map((h) => h.pop ?? 0))
  const totalMm = scope.reduce((s, h) => s + (h.precip ?? 0), 0)
  const wet = scope.some((h) => isWet(h.code))

  let verdict
  if (maxPop >= 70 || totalMm >= 2) verdict = { level: 'high', text: '우천 레이스 가능성이 높습니다' }
  else if (maxPop >= 40 || wet) verdict = { level: 'mid', text: '비가 올 수도 있습니다' }
  else if (maxPop >= 15) verdict = { level: 'low', text: '비 가능성은 낮습니다' }
  else verdict = { level: 'dry', text: '드라이 레이스가 예상됩니다' }

  return { ...verdict, maxPop, totalMm: Math.round(totalMm * 10) / 10 }
}
