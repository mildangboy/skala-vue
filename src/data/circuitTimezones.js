/**
 * 서킷 ID → IANA 타임존 이름.
 *
 * 왜 '오프셋'이 아니라 타임존 '이름'인가.
 *
 * 오프셋(UTC+2 같은 값)은 그 순간에만 참이라 서머타임을 모른다. 앱은 이미
 * OpenWeather 응답에서 오프셋을 받고 있어서 그걸 그대로 쓸 수도 있었지만,
 * 그 값은 '지금'의 오프셋이다. 두 주 뒤 경기 시각을 그걸로 찍으면 그 사이에
 * 서머타임이 바뀌는 서킷에서 한 시간이 어긋난다 — 유럽 라운드는 3월 말과
 * 10월 말에 실제로 그 경계에 걸린다. 이름을 두면 Intl이 '그 날짜 기준'
 * 오프셋을 계산해 주므로 몇 달 뒤 경기도 정확하다.
 *
 * 왜 좌표로 조회하지 않는가.
 *
 * 좌표→타임존은 외부 API가 필요하다. 요청이 늘고, 오프라인에서 끊기고,
 * 새 의존이 하나 더 생긴다. 서킷의 타임존은 좌표만큼이나 잘 변하지 않는
 * 값이라 여기 적어두는 편이 값싸고 튼튼하다.
 *
 * 여기 없는 서킷을 만나면 어떻게 되는가 — 아무 일도 일어나지 않는다.
 *
 * timezoneOf가 null을 주고, 화면은 지금까지처럼 보는 사람 표준시만 보여준다.
 * 이 표는 5.1의 내장 캘린더와 성격이 같다. '무엇이 유효한지 아는 것'이 아니라
 * '알면 하나 더 보여주는 것'이다. 시즌 중에 개최지가 바뀌어 모르는 서킷이
 * 나타나도 화면이 깨지지 않고 현지 시각 줄만 조용히 빠진다.
 *
 * 검증 방법.
 *
 * 22개 라운드의 UTC 시각을 각 타임존으로 환산해 현지 시작 시각을 대조했다.
 * 20개가 현지 14~15시(통상 결승 시각), 마리나베이 20시·로사일 19시(나이트),
 * 야스마리나 17시(트와일라잇), 베이거스 토요일 20시(현지 토요일 밤 경기)로
 * 전부 실제 개최 시각과 맞는다. 타임존을 잘못 적으면 이 시각이 새벽처럼
 * 엉뚱하게 나오므로, 이 대조가 곧 검산이다. 새 서킷을 넣을 때도 같은 방법으로
 * 확인하면 된다.
 */

export const CIRCUIT_TIMEZONES = {
  // 2026 시즌 22개 그랑프리
  albert_park: 'Australia/Melbourne',
  shanghai: 'Asia/Shanghai',
  suzuka: 'Asia/Tokyo',
  miami: 'America/New_York',
  villeneuve: 'America/Toronto',
  monaco: 'Europe/Monaco',
  catalunya: 'Europe/Madrid',
  red_bull_ring: 'Europe/Vienna',
  silverstone: 'Europe/London',
  spa: 'Europe/Brussels',
  hungaroring: 'Europe/Budapest',
  zandvoort: 'Europe/Amsterdam',
  monza: 'Europe/Rome',
  madring: 'Europe/Madrid',
  baku: 'Asia/Baku',
  marina_bay: 'Asia/Singapore',
  americas: 'America/Chicago',
  rodriguez: 'America/Mexico_City',
  interlagos: 'America/Sao_Paulo',
  vegas: 'America/Los_Angeles',
  losail: 'Asia/Qatar',
  yas_marina: 'Asia/Dubai',

  // 시즌 중 개최지가 바뀌어 라이브 일정에만 나타나는 서킷.
  // 2026 바레인 GP는 전쟁 여파로 세팡에서 열린다 (api/f1.js의 KO_NAME_EXTRA와 같은 이유).
  sepang: 'Asia/Kuala_Lumpur',

  // 최근까지 F1이 열렸고 언제든 다시 일정에 오를 수 있는 서킷.
  // 없어도 동작에는 지장이 없지만, 있으면 그날 현지 시각이 바로 나온다.
  bahrain: 'Asia/Bahrain',
  jeddah: 'Asia/Riyadh',
  imola: 'Europe/Rome',
}

/** 모르는 서킷이면 null. 호출부는 이때 보는 사람 표준시만 보여준다. */
export const timezoneOf = (circuitId) => CIRCUIT_TIMEZONES[circuitId] ?? null
