/**
 * 날씨 지표로 레이스 관전/주행 컨디션을 0~5점으로 산출한다.
 * 감점 방식: 이상적인 조건(건조 · 온화 · 미풍)에서 출발해 악조건마다 점수를 깎는다.
 *
 * 산출 규칙을 데이터로 정의해 두고, 점수 계산과 화면의 "산출 방식" 설명이
 * 같은 정의를 참조하도록 했다. 규칙이 바뀌어도 설명이 따로 놀지 않는다.
 */

const BASE_SCORE = 5

// 강수/뇌우/눈 계열 아이콘 코드 접두사
const WET_PREFIX = ['09', '10', '11', '13']

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const round5 = (n) => Math.round(n * 2) / 2 // 0.5 단위

const toCelsius = (temp, unit) => (unit === 'imperial' ? ((temp ?? 0) - 32) / 1.8 : (temp ?? 0))

/** 화면의 기준표에 그대로 사용되는 규칙 정의 */
export const CONDITION_RULES = [
  {
    key: 'sky',
    label: '노면 · 하늘',
    ideal: '맑음 또는 흐림',
    penalty: '비/눈 −1.5 · 뇌우 −2.5',
    max: 2.5,
    note: '노면 상태는 주행과 관전 모두에 가장 큰 변수라 감점 폭을 제일 크게 뒀습니다.',
  },
  {
    key: 'temp',
    label: '기온',
    ideal: '18 ~ 26°C',
    penalty: '추위 최대 −2 · 더위 최대 −2.5',
    max: 2.5,
    note: '폭염은 타이어 관리와 관중 안전에 함께 영향을 줘 더위 쪽 감점을 더 크게 잡았습니다.',
  },
  {
    key: 'wind',
    label: '바람',
    ideal: '8m/s 이하',
    penalty: '초과분에 비례해 최대 −1',
    max: 1,
    note: '다운포스와 관전 체감에 영향을 주는 구간부터 반영합니다.',
  },
  {
    key: 'humidity',
    label: '습도',
    ideal: '85% 이하',
    penalty: '초과 시 −0.5',
    max: 0.5,
    note: '체감 불쾌지수에 대한 소폭 보정입니다.',
  },
]

/**
 * 각 요소별로 실제 적용된 감점과 사유를 반환한다.
 * 화면에서 "왜 이 점수인지"를 그대로 보여주기 위한 용도.
 */
export const raceConditionBreakdown = (weather, unit = 'metric') => {
  if (!weather) return null

  const tempC = toCelsius(weather.temp, unit)
  const wind = weather.windSpeed ?? 0
  const humidity = weather.humidity ?? 0
  const iconPrefix = String(weather.icon ?? '').slice(0, 2)

  const factors = []

  // 1) 노면 · 하늘
  if (iconPrefix === '11') {
    factors.push({ key: 'sky', label: '노면 · 하늘', reading: '뇌우', delta: -2.5 })
  } else if (WET_PREFIX.includes(iconPrefix)) {
    factors.push({
      key: 'sky',
      label: '노면 · 하늘',
      reading: iconPrefix === '13' ? '눈' : '비',
      delta: -1.5,
    })
  } else {
    factors.push({ key: 'sky', label: '노면 · 하늘', reading: '건조', delta: 0 })
  }

  // 2) 기온
  const tempLabel = `${Math.round(tempC)}°C`
  if (tempC < 18) {
    factors.push({
      key: 'temp',
      label: '기온',
      reading: `${tempLabel} (쾌적 구간 미만)`,
      delta: -clamp((18 - tempC) / 7, 0, 2),
    })
  } else if (tempC > 26) {
    factors.push({
      key: 'temp',
      label: '기온',
      reading: `${tempLabel} (쾌적 구간 초과)`,
      delta: -clamp((tempC - 26) / 6, 0, 2.5),
    })
  } else {
    factors.push({ key: 'temp', label: '기온', reading: `${tempLabel} (쾌적)`, delta: 0 })
  }

  // 3) 바람
  factors.push({
    key: 'wind',
    label: '바람',
    reading: `${wind}m/s`,
    delta: wind > 8 ? -clamp((wind - 8) / 6, 0, 1) : 0,
  })

  // 4) 습도
  factors.push({
    key: 'humidity',
    label: '습도',
    reading: `${humidity}%`,
    delta: humidity > 85 ? -0.5 : 0,
  })

  const totalDelta = factors.reduce((sum, f) => sum + f.delta, 0)
  const score = clamp(round5(BASE_SCORE + totalDelta), 0, 5)

  return { base: BASE_SCORE, factors, totalDelta, score }
}

export const raceConditionScore = (weather, unit = 'metric') =>
  raceConditionBreakdown(weather, unit)?.score ?? null

export const raceConditionLabel = (score) => {
  if (score === null) return ''
  if (score >= 4.5) return '최상 — 완벽한 레이스 데이'
  if (score >= 3.5) return '양호 — 관전하기 좋음'
  if (score >= 2.5) return '보통 — 변수 있음'
  if (score >= 1.5) return '주의 — 우천/악천후 가능'
  return '험난 — 세이프티카 각오'
}
