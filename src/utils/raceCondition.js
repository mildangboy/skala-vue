/**
 * 날씨 지표로 레이스 관전/주행 컨디션을 0~100점으로 산출한다.
 * 감점 방식: 이상적인 조건(건조 · 온화 · 미풍 · 시야 확보)에서 출발해 악조건마다 점수를 깎는다.
 *
 * 산출 규칙을 데이터로 정의해 두고 점수 계산과 화면의 "산출 방식" 설명이
 * 같은 정의를 참조하도록 했다. 규칙이 바뀌어도 설명이 따로 놀지 않는다.
 */

const BASE_SCORE = 100

// 하늘 상태별 감점 (OpenWeatherMap 아이콘 코드 앞 2자리 기준)
const SKY_PENALTY = {
  11: { label: '뇌우', penalty: 50 },
  13: { label: '눈', penalty: 35 },
  '09': { label: '소나기', penalty: 30 },
  10: { label: '비', penalty: 28 },
  50: { label: '안개', penalty: 15 },
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const toCelsius = (temp, unit) => (unit === 'imperial' ? ((temp ?? 0) - 32) / 1.8 : (temp ?? 0))

/** 화면 기준표에 그대로 사용되는 규칙 정의 */
export const CONDITION_RULES = [
  {
    key: 'sky',
    label: '노면 · 시야',
    ideal: '맑음 / 구름',
    penalty: '안개 −15 · 비 −28 · 소나기 −30 · 눈 −35 · 뇌우 −50',
    max: 50,
    note: '노면 상태와 시야는 주행과 관전 모두에 가장 큰 변수라 감점 폭을 제일 크게 뒀습니다.',
  },
  {
    key: 'temp',
    label: '기온',
    ideal: '18 ~ 26°C',
    penalty: '1°C 벗어날 때마다 추위 −2.9 / 더위 −3.4',
    max: 50,
    note: '폭염은 타이어 관리와 관중 안전에 함께 영향을 줘 더위 쪽 기울기를 더 가파르게 잡았습니다.',
  },
  {
    key: 'wind',
    label: '바람',
    ideal: '8m/s 이하',
    penalty: '초과 1m/s당 −3.3',
    max: 20,
    note: '다운포스와 관전 체감에 영향을 주는 구간부터 반영합니다.',
  },
  {
    key: 'humidity',
    label: '습도',
    ideal: '85% 이하',
    penalty: '초과 1%p당 −0.7',
    max: 10,
    note: '체감 불쾌지수에 대한 소폭 보정입니다.',
  },
]

/** 등급 구간 — 화면에서 그대로 렌더링한다 */
export const CONDITION_GRADES = [
  { min: 90, grade: 'S', label: '최상', desc: '완벽한 레이스 데이' },
  { min: 75, grade: 'A', label: '양호', desc: '관전하기 좋은 조건' },
  { min: 60, grade: 'B', label: '보통', desc: '무난하지만 변수 있음' },
  { min: 40, grade: 'C', label: '주의', desc: '우천·악천후 가능성' },
  { min: 0, grade: 'D', label: '험난', desc: '세이프티카 각오' },
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

  const round1 = (n) => Math.round(n * 10) / 10
  const factors = []

  // 1) 노면 · 시야
  const sky = SKY_PENALTY[iconPrefix]
  factors.push({
    key: 'sky',
    label: '노면 · 시야',
    reading: sky ? sky.label : '건조',
    delta: sky ? -sky.penalty : 0,
  })

  // 2) 기온 — 쾌적 구간(18~26°C)에서 벗어난 정도에 비례
  const tempLabel = `${Math.round(tempC)}°C`
  if (tempC < 18) {
    factors.push({
      key: 'temp',
      label: '기온',
      reading: `${tempLabel} · 쾌적 구간보다 ${Math.round(18 - tempC)}°C 낮음`,
      delta: -round1(clamp((18 - tempC) * 2.9, 0, 40)),
    })
  } else if (tempC > 26) {
    factors.push({
      key: 'temp',
      label: '기온',
      reading: `${tempLabel} · 쾌적 구간보다 ${Math.round(tempC - 26)}°C 높음`,
      delta: -round1(clamp((tempC - 26) * 3.4, 0, 50)),
    })
  } else {
    factors.push({ key: 'temp', label: '기온', reading: `${tempLabel} · 쾌적`, delta: 0 })
  }

  // 3) 바람
  factors.push({
    key: 'wind',
    label: '바람',
    reading: `${wind}m/s`,
    delta: wind > 8 ? -round1(clamp((wind - 8) * 3.3, 0, 20)) : 0,
  })

  // 4) 습도
  factors.push({
    key: 'humidity',
    label: '습도',
    reading: `${humidity}%`,
    delta: humidity > 85 ? -round1(clamp((humidity - 85) * 0.7, 0, 10)) : 0,
  })

  const totalDelta = round1(factors.reduce((sum, f) => sum + f.delta, 0))
  const score = clamp(Math.round(BASE_SCORE + totalDelta), 0, 100)

  return { base: BASE_SCORE, factors, totalDelta, score }
}

export const raceConditionScore = (weather, unit = 'metric') =>
  raceConditionBreakdown(weather, unit)?.score ?? null

export const conditionGrade = (score) =>
  score === null || score === undefined
    ? null
    : (CONDITION_GRADES.find((g) => score >= g.min) ?? CONDITION_GRADES.at(-1))

export const raceConditionLabel = (score) => {
  const g = conditionGrade(score)
  return g ? `${g.label} — ${g.desc}` : ''
}

/** 점수 구간별 색상 (진행 바 / 숫자 강조에 사용) */
export const conditionColor = (score) => {
  if (score === null) return 'var(--text-muted)'
  if (score >= 90) return '#27f4d2'
  if (score >= 75) return '#00c9ab'
  if (score >= 60) return '#e6a23c'
  if (score >= 40) return '#f08b3c'
  return '#e24b4a'
}
