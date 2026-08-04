import {
  dateKeyInZone,
  tomorrowKey,
  resolveDayKey,
  pickForecastAt,
  findRaceOn,
  selectRecipients,
  buildSubject,
  buildHtml,
  buildRawMessage,
} from '../notifier.js'
import { describeWeather } from '../weatherText.js'

let fail = 0
const check = (name, ok, extra = '') => {
  if (!ok) fail++
  console.log(' ', name.padEnd(38), ok ? 'OK' : `실패 ✗ ${extra}`)
}

// 2026 네덜란드 GP: 2026-08-23T13:00:00Z = KST 8월 23일 22:00
const races = [
  {
    round: 11,
    name: '헝가리 그랑프리',
    circuitId: 'hungaroring',
    circuit: 'Hungaroring',
    locality: 'Budapest',
    country: 'Hungary',
    date: '2026-07-26',
    time: '13:00:00Z',
  },
  {
    round: 12,
    name: '네덜란드 그랑프리',
    circuitId: 'zandvoort',
    circuit: 'Circuit Park Zandvoort',
    locality: 'Zandvoort',
    country: 'Netherlands',
    date: '2026-08-23',
    time: '13:00:00Z',
  },
  {
    round: 20,
    name: '라스베이거스 그랑프리',
    circuitId: 'vegas',
    circuit: 'Las Vegas Strip',
    locality: 'Las Vegas',
    country: 'USA',
    date: '2026-11-22',
    time: '04:00:00Z',
  },
]

console.log('=== 날짜/시간대 처리 ===')
check('KST 날짜 키', dateKeyInZone(new Date('2026-08-23T13:00:00Z')) === '2026-08-23')
// UTC 23일 22:00 → KST로는 24일 07:00 (날짜 경계 넘김)
check('UTC 늦은 시각의 KST 날짜', dateKeyInZone(new Date('2026-08-23T22:00:00Z')) === '2026-08-24')
// 라스베이거스: UTC 11/22 04:00 → KST 11/22 13:00
check('라스베이거스 KST 환산', dateKeyInZone(new Date('2026-11-22T04:00:00Z')) === '2026-11-22')

console.log('\n=== 내일 레이스 탐색 ===')
const eve = new Date('2026-08-22T10:00:00Z') // KST 8/22 19:00 → 내일은 8/23
check('전날 실행 시 내일 키', tomorrowKey(eve) === '2026-08-23', tomorrowKey(eve))
const race = findRaceOn(races, tomorrowKey(eve))
check('네덜란드 GP 선택됨', race?.circuitId === 'zandvoort')
const noRaceDay = findRaceOn(races, tomorrowKey(new Date('2026-08-10T10:00:00Z')))
check('레이스 없는 날은 null', noRaceDay === null)

console.log('\n=== 날짜 지정 호출 ===')
const noon = new Date('2026-08-22T03:00:00Z') // KST 8/22 정오
const auto = resolveDayKey(undefined, noon)
check('date 없으면 내일', auto.dayKey === '2026-08-23' && auto.overridden === false, auto.dayKey)
check('빈 문자열도 내일', resolveDayKey('', noon).dayKey === '2026-08-23')
const given = resolveDayKey('2026-08-23', noon)
check('date를 주면 그 날짜', given.dayKey === '2026-08-23' && given.overridden === true)
check('먼 날짜도 그대로', resolveDayKey('2026-12-06', noon).dayKey === '2026-12-06')
check('형식이 틀리면 거절', Boolean(resolveDayKey('2026/08/23', noon).error))
check('일부만 주면 거절', Boolean(resolveDayKey('2026-08', noon).error))
check('숫자가 아니면 거절', Boolean(resolveDayKey('내일', noon).error))
check('문자열이 아니면 거절', Boolean(resolveDayKey(20260823, noon).error))
// 형식만 맞고 실제로 없는 날 — Date.parse는 3월 2일로 넘겨버린다
check('2월 30일 거절', Boolean(resolveDayKey('2026-02-30', noon).error))
check('13월 거절', Boolean(resolveDayKey('2026-13-01', noon).error))
check('윤년 아닌 2월 29일 거절', Boolean(resolveDayKey('2026-02-29', noon).error))
check('윤년 2월 29일 허용', resolveDayKey('2028-02-29', noon).dayKey === '2028-02-29')
// 지정한 날짜로 실제 레이스를 찾을 수 있어야 한다
check(
  '지정 날짜로 레이스 탐색',
  findRaceOn(races, resolveDayKey('2026-08-23', noon).dayKey)?.circuitId === 'zandvoort',
)

console.log('\n=== 레이스 시각 예보 선택 ===')
// 3시간 간격 예보를 흉내 낸다. 레이스는 2026-08-23T13:00:00Z
const at = (iso) => ({ dt: Date.parse(iso) / 1000, dt_txt: iso.replace('T', ' ').replace('Z', '') })
const forecast = [
  at('2026-08-23T06:00:00Z'),
  at('2026-08-23T09:00:00Z'),
  at('2026-08-23T12:00:00Z'), // 레이스 1시간 전 — 가장 가까움
  at('2026-08-23T15:00:00Z'),
]
const picked = pickForecastAt(forecast, '2026-08-23T13:00:00Z')
check('레이스에 가장 가까운 시점', picked?.dt_txt === '2026-08-23 12:00:00', picked?.dt_txt)
check(
  '순서가 뒤섞여도 동일',
  pickForecastAt([...forecast].reverse(), '2026-08-23T13:00:00Z')?.dt_txt === '2026-08-23 12:00:00',
)
check('정확히 일치하는 시점 우선', pickForecastAt(forecast, '2026-08-23T15:00:00Z')?.dt_txt === '2026-08-23 15:00:00')
// 예보 범위 밖 — 5일 넘게 남은 레이스
check('너무 먼 레이스는 null', pickForecastAt(forecast, '2026-09-06T13:00:00Z') === null)
check('6시간 이내면 사용', pickForecastAt(forecast, '2026-08-23T20:00:00Z')?.dt_txt === '2026-08-23 15:00:00')
check('6시간 넘으면 null', pickForecastAt(forecast, '2026-08-23T22:00:00Z') === null)
check('빈 목록은 null', pickForecastAt([], '2026-08-23T13:00:00Z') === null)
check('목록이 아니면 null', pickForecastAt(null, '2026-08-23T13:00:00Z') === null)
check('잘못된 시각은 null', pickForecastAt(forecast, '없는날짜') === null)
check('dt가 깨진 항목은 건너뜀', pickForecastAt([{ dt: 'x' }, ...forecast], '2026-08-23T13:00:00Z')?.dt_txt === '2026-08-23 12:00:00')

console.log('\n=== 날씨 표현 한국어 ===')
check('온흐림 → 흐림', describeWeather(804) === '흐림', describeWeather(804))
check('튼구름 → 구름 많음', describeWeather(803) === '구름 많음', describeWeather(803))
check('실비 → 이슬비', describeWeather(301) === '이슬비', describeWeather(301))
check('맑음', describeWeather(800) === '맑음')
check('표에 없으면 대분류로', describeWeather(599) === '비', describeWeather(599))
check('범위 밖이면 API 원문', describeWeather(9999, '원문') === '원문')

console.log('\n=== 발송 대상 선별 ===')
const plans = [
  { email: 'me@example.com', notify: true, circuitId: 'zandvoort', people: 3, memo: '우비' },
  { email: 'ME@example.com', notify: true, circuitId: 'zandvoort' }, // 중복(대소문자)
  { email: 'off@example.com', notify: false, circuitId: 'zandvoort' }, // 알림 꺼짐
  { email: 'other@example.com', notify: true, circuitId: 'monza' }, // 다른 서킷
  { email: '', notify: true, circuitId: 'zandvoort' }, // 이메일 없음
  { email: 'bad-email', notify: true, circuitId: 'zandvoort' }, // 형식 이상
]
const rcpts = selectRecipients(plans, race)
check('대상 1명만 선별', rcpts.length === 1, JSON.stringify(rcpts.map((r) => r.email)))
check('올바른 주소 선택', rcpts[0]?.email === 'me@example.com')
check('레이스 없으면 빈 배열', selectRecipients(plans, null).length === 0)

console.log('\n=== 메일 본문 ===')
const weather = { temp: 19.4, feelsLike: 18.2, humidity: 78, windSpeed: 5.1, description: '흐림' }
const subject = buildSubject(race, weather)
check(
  '제목에 레이스명·기온',
  subject.includes('네덜란드 그랑프리') && subject.includes('19°C'),
  subject,
)
const html = buildHtml({ race, weather, plan: plans[0], condition: 82 })
check('본문에 서킷명', html.includes('Circuit Park Zandvoort'))
check('본문에 컨디션 점수', html.includes('82 / 100'))
check('본문에 KST 레이스 시각', html.includes('10:00') || html.includes('22:00'), '시간 표기 확인')
check(
  '날씨 없을 때 안내',
  buildHtml({ race, weather: null, plan: {} }).includes('가져오지 못했습니다'),
)

// XSS 방어 — 메모는 사용자 입력이다
const evil = buildHtml({
  race,
  weather,
  plan: { memo: '<script>alert(1)</script>' },
  condition: 50,
})
check('사용자 입력 이스케이프', !evil.includes('<script>alert') && evil.includes('&lt;script&gt;'))

console.log('\n=== Gmail 원문 인코딩 ===')
const raw = buildRawMessage({ to: 'me@example.com', from: 'me@gmail.com', subject, html })
check('base64url만 사용', /^[A-Za-z0-9_-]+$/.test(raw))
const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
check('헤더 포함', decoded.includes('To: me@example.com') && decoded.includes('MIME-Version: 1.0'))
check('한글 제목 인코딩', decoded.includes('=?utf-8?B?'))

console.log('\n' + (fail ? `${fail}건 실패 ✗` : 'PASS — 알림 로직 전 항목 통과'))
process.exit(fail ? 1 : 0)
