import {
  dateKeyInZone,
  tomorrowKey,
  findRaceOn,
  selectRecipients,
  buildSubject,
  buildHtml,
  buildRawMessage,
} from '../notifier.js'

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
