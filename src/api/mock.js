/**
 * Mock API — 실시간 API가 답하지 않을 때 화면을 채우는 데모 데이터.
 *
 * 왜 두는가.
 *
 * 이 앱은 외부 API 다섯 곳에 기대고 있다(OpenWeather · Jolpica · Open-Meteo …).
 * 무료 티어라 분당 한도에 걸리기도 하고, 키가 아직 활성화되지 않았거나,
 * 채점하는 사람이 자기 키 없이 링크만 열어볼 수도 있다. 그럴 때 지금까지는
 * 빈 화면이나 에러 문구만 남았다. 무엇을 만든 물건인지 보여주지도 못한 채.
 *
 * 그래서 마지막 방어선을 하나 더 둔다. 순서는 이렇다.
 *
 *   실시간 API  →  (실패)  →  만료된 캐시  →  (없음)  →  여기 데모 데이터
 *
 * 캐시가 앞에 오는 이유는, 낡았어도 '이 사용자의 실제 데이터'가
 * 지어낸 값보다는 낫기 때문이다. 데모는 정말 아무것도 없을 때만 나온다.
 *
 * 지어낸 값이라는 사실은 반드시 화면에 밝힌다 (components/DemoDataNotice.vue).
 * 사용자가 데모를 실측으로 오해하면 없느니만 못하다.
 *
 * 왜 난수를 쓰지 않는가.
 *
 * Math.random을 쓰면 새로고침할 때마다 기온이 널뛰어 고장처럼 보이고,
 * SSR 스모크 테스트도 실행할 때마다 결과가 달라져 비교할 수 없다.
 * 도시 이름에서 뽑은 해시로 값을 정해, 같은 도시는 언제나 같은 데모를 준다.
 */
import { describeWeather } from '@/utils/weatherText'

/** 문자열 → 0 이상의 정수. 같은 입력이면 언제나 같은 값. */
const hash = (text = '') => {
  let h = 0
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** seed를 min~max 범위의 값으로 편다 */
const spread = (seed, min, max) => min + (seed % (max - min + 1))

// 데모에 쓰는 날씨 조합 — 레이스 컨디션 지수가 등급별로 골고루 나오도록 골랐다
const SKIES = [
  { icon: '01d', conditionId: 800 },
  { icon: '02d', conditionId: 801 },
  { icon: '04d', conditionId: 804 },
  { icon: '10d', conditionId: 500 },
]

const skyOf = (seed) => SKIES[seed % SKIES.length]

const toF = (c) => Math.round(((c * 9) / 5 + 32) * 10) / 10

/**
 * 현재 날씨 데모.
 * api/weather.js의 normalizeCurrentWeather와 같은 모양이어야 화면이 그대로 받는다.
 */
export const mockCurrentWeather = (city = 'Demo', unit = 'metric') => {
  const seed = hash(city)
  const sky = skyOf(seed)
  const tempC = spread(seed, 8, 31)
  const temp = unit === 'imperial' ? toF(tempC) : tempC

  return {
    city,
    country: '',
    temp,
    feelsLike: unit === 'imperial' ? toF(tempC - 1) : tempC - 1,
    obsMin: unit === 'imperial' ? toF(tempC - 3) : tempC - 3,
    obsMax: unit === 'imperial' ? toF(tempC + 3) : tempC + 3,
    humidity: spread(seed >> 3, 35, 88),
    pressure: spread(seed >> 5, 1000, 1024),
    conditionId: sky.conditionId,
    description: describeWeather(sky.conditionId),
    icon: sky.icon,
    windSpeed: spread(seed >> 7, 1, 9),
    dt: Math.floor(Date.now() / 1000),
    timezone: 0,
    coord: null,
    demo: true,
  }
}

/**
 * 5일 예보 데모 (3시간 간격 40건).
 * normalizeForecast와 같은 모양 — daily/hourly를 화면이 그대로 잘라 쓴다.
 */
export const mockForecast = (city = 'Demo', unit = 'metric') => {
  const seed = hash(city)
  const baseC = spread(seed, 8, 28)
  const start = Math.floor(Date.now() / 1000)

  const hourly = Array.from({ length: 40 }, (_, i) => {
    const sky = skyOf(seed + i)
    // 하루 주기로 오르내리게 해서 기온 차트가 밋밋하지 않도록 한다
    const swing = Math.round(Math.sin((i / 8) * Math.PI * 2) * 4)
    const c = baseC + swing
    return {
      dt: start + i * 3 * 3600,
      temp: unit === 'imperial' ? toF(c) : c,
      icon: sky.icon,
      conditionId: sky.conditionId,
      pop: ((seed + i) % 10) / 10,
    }
  })

  const daily = Array.from({ length: 5 }, (_, d) => {
    const slice = hourly.slice(d * 8, d * 8 + 8)
    const temps = slice.map((h) => h.temp)
    const noon = slice[4] ?? slice[0]
    return {
      day: new Date((noon?.dt ?? start) * 1000).toLocaleString('ko-KR', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      icon: noon?.icon ?? '01d',
      conditionId: noon?.conditionId ?? 800,
      description: describeWeather(noon?.conditionId ?? 800),
      min: Math.min(...temps),
      max: Math.max(...temps),
      dt: noon?.dt ?? start,
    }
  })

  return { timezone: 0, daily, hourly, demo: true }
}

/**
 * 레이스 시간대 예보 데모.
 * api/raceWeather.js의 fetchRaceWindow가 돌려주는 모양을 따른다.
 */
export const mockRaceWindow = ({ startAt, before = 1, after = 3, seedKey = 'race' } = {}) => {
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime())) return null
  const seed = hash(seedKey)
  const baseC = spread(seed, 14, 30)

  const hours = []
  for (let i = -before; i <= after; i += 1) {
    const sky = skyOf(seed + i + before)
    hours.push({
      at: new Date(startAt.getTime() + i * 3600000),
      offset: i,
      temp: baseC + i,
      feelsLike: baseC + i - 1,
      pop: spread(seed + i + before, 0, 60),
      precip: sky.icon === '10d' ? 0.4 : 0,
      wind: spread(seed >> 2, 3, 18),
      code: sky.icon === '10d' ? 61 : 1,
    })
  }
  return { status: 'ok', hours, daysAway: 0, demo: true }
}

// 데모 순위에 쓰는 2026 라인업 (constructorId는 teamColors.js의 키와 맞춘다)
const DEMO_DRIVERS = [
  ['Max', 'Verstappen', 'VER', 'red_bull', 'Red Bull'],
  ['Lando', 'Norris', 'NOR', 'mclaren', 'McLaren'],
  ['Charles', 'Leclerc', 'LEC', 'ferrari', 'Ferrari'],
  ['George', 'Russell', 'RUS', 'mercedes', 'Mercedes'],
  ['Oscar', 'Piastri', 'PIA', 'mclaren', 'McLaren'],
  ['Lewis', 'Hamilton', 'HAM', 'ferrari', 'Ferrari'],
  ['Fernando', 'Alonso', 'ALO', 'aston_martin', 'Aston Martin'],
  ['Pierre', 'Gasly', 'GAS', 'alpine', 'Alpine'],
  ['Alexander', 'Albon', 'ALB', 'williams', 'Williams'],
  ['Nico', 'Hulkenberg', 'HUL', 'audi', 'Audi'],
]

const DEMO_TEAMS = [
  ['mclaren', 'McLaren'],
  ['red_bull', 'Red Bull'],
  ['ferrari', 'Ferrari'],
  ['mercedes', 'Mercedes'],
  ['aston_martin', 'Aston Martin'],
  ['alpine', 'Alpine'],
  ['williams', 'Williams'],
  ['audi', 'Audi'],
]

const DEMO_ROUND = 12

/** 순위표 데모 — api/standings.js의 readList와 같은 모양 */
export const mockStandings = (type = 'driver') => {
  const rows =
    type === 'constructor'
      ? DEMO_TEAMS.map(([id, name], i) => ({
          id,
          name,
          shortName: name,
          constructorId: id,
          constructorName: name,
          nationality: '',
          position: i + 1,
          points: 420 - i * 46,
          wins: Math.max(0, 6 - i),
        }))
      : DEMO_DRIVERS.map(([given, family, code, cid, cname], i) => ({
          id: `${given}_${family}`.toLowerCase(),
          name: `${given} ${family}`,
          shortName: family,
          code,
          number: '',
          nationality: '',
          constructorId: cid,
          constructorName: cname,
          position: i + 1,
          points: 260 - i * 24,
          wins: Math.max(0, 5 - i),
        }))

  return { round: DEMO_ROUND, rows, demo: true }
}

/** 포인트 추이 데모 — api/standings.js의 fetchPointsProgress와 같은 모양 */
export const mockPointsProgress = (type = 'driver') => {
  const { rows } = mockStandings(type)
  const rounds = Array.from({ length: DEMO_ROUND }, (_, i) => i + 1)
  const series = rows.map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    constructorId: row.constructorId,
    constructorName: row.constructorName,
    // 최종 점수까지 라운드마다 고르게 쌓이도록 나눈다
    cumulative: rounds.map((r) => Math.round((row.points * r) / DEMO_ROUND)),
  }))
  return { rounds, series, missing: 0, demo: true }
}

/**
 * 실시간 조회를 먼저 시도하고, 실패하면 데모로 물러난다.
 *
 * makeDemo가 null을 주면(데모를 만들 수 없는 요청이면) 원래 에러를 그대로 올린다.
 * 조용히 빈 값으로 바꾸면 호출부가 실패를 알아채지 못하기 때문이다.
 *
 * @returns {Promise<{data: any, demo: boolean, reason: string}>}
 */
export const withDemoFallback = async (fetcher, makeDemo) => {
  try {
    return { data: await fetcher(), demo: false, reason: '' }
  } catch (err) {
    const data = makeDemo?.()
    if (data === null || data === undefined) throw err
    return { data, demo: true, reason: err?.message ?? '실시간 조회 실패' }
  }
}
