/**
 * 날씨 지표로 레이스 관전/주행 컨디션을 0~5점으로 산출한다.
 * 감점 방식: 이상적인 조건(건조 · 온화 · 미풍)에서 출발해 악조건마다 점수를 깎는다.
 */

// 강수/뇌우/눈 계열 아이콘 코드 접두사
const WET_PREFIX = ['09', '10', '11', '13']

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

export const raceConditionScore = (weather, unit = 'metric') => {
  if (!weather) return null

  // 화씨로 들어온 경우 섭씨로 환산해 동일 기준으로 평가
  const tempC = unit === 'imperial' ? ((weather.temp ?? 0) - 32) / 1.8 : (weather.temp ?? 0)
  const wind = weather.windSpeed ?? 0
  const humidity = weather.humidity ?? 0
  const iconPrefix = String(weather.icon ?? '').slice(0, 2)

  let score = 5

  // 노면 상태 — 비/눈/뇌우는 관전과 주행 모두에 가장 큰 변수
  if (WET_PREFIX.includes(iconPrefix)) score -= iconPrefix === '11' ? 2.5 : 1.5

  // 기온 — 18~26°C를 쾌적 구간으로 보고 벗어난 만큼 감점.
  // 폭염(35°C+)은 타이어 관리와 관중 안전 모두에 영향이 커 감점 폭을 크게 둔다.
  if (tempC < 18) score -= clamp((18 - tempC) / 7, 0, 2)
  else if (tempC > 26) score -= clamp((tempC - 26) / 6, 0, 2.5)

  // 바람 — 8m/s 초과부터 체감 저하
  if (wind > 8) score -= clamp((wind - 8) / 6, 0, 1)

  // 습도 — 85% 초과 시 체감 불쾌
  if (humidity > 85) score -= 0.5

  return clamp(Math.round(score * 2) / 2, 0, 5) // 0.5 단위로 반올림
}

export const raceConditionLabel = (score) => {
  if (score === null) return ''
  if (score >= 4.5) return '최상 — 완벽한 레이스 데이'
  if (score >= 3.5) return '양호 — 관전하기 좋음'
  if (score >= 2.5) return '보통 — 변수 있음'
  if (score >= 1.5) return '주의 — 우천/악천후 가능'
  return '험난 — 세이프티카 각오'
}
