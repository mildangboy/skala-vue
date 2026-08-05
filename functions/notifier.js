/**
 * 알림 대상 선별과 메일 본문 생성.
 *
 * 외부 의존(Firestore, Gmail, 날씨 API) 없이 순수 함수로 두어
 * 로컬에서 그대로 테스트할 수 있게 분리했다.
 */

/** 특정 시간대 기준의 'YYYY-MM-DD' */
export const dateKeyInZone = (date, timeZone = 'Asia/Seoul') => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (t) => parts.find((p) => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** 기준 시각의 '내일' 날짜 키 */
export const tomorrowKey = (now = new Date(), timeZone = 'Asia/Seoul') =>
  dateKeyInZone(new Date(now.getTime() + 24 * 60 * 60 * 1000), timeZone)

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * 어느 날짜를 레이스 당일로 볼지 정한다.
 *
 * 평소에는 '내일'이지만, 호출할 때 date를 주면 그 날짜로 본다.
 * 다음 레이스가 몇 주 뒤일 때 발송 경로가 살아 있는지 확인하려면 이게 필요하다.
 * 함수 자체가 인증 필요 상태라 이 값을 아무나 넣을 수는 없다.
 *
 * @param {string|undefined} raw  'YYYY-MM-DD' 또는 없음
 * @returns {{dayKey?: string, overridden?: boolean, error?: string}}
 */
export const resolveDayKey = (raw, now = new Date(), timeZone = 'Asia/Seoul') => {
  if (raw === undefined || raw === null || raw === '') {
    return { dayKey: tomorrowKey(now, timeZone), overridden: false }
  }
  if (typeof raw !== 'string') {
    return { error: 'date는 문자열이어야 합니다.' }
  }

  const m = DATE_KEY.exec(raw)
  if (!m) return { error: `date는 YYYY-MM-DD 형식이어야 합니다: ${raw}` }

  // 2026-02-30처럼 형식은 맞지만 없는 날짜를 걸러낸다.
  // Date.parse는 이런 값을 앞뒤 달로 넘겨버려서 그냥 통과시키면 엉뚱한 날이 된다.
  const [, y, mo, d] = m
  const probe = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
  const roundTrip = probe.toISOString().slice(0, 10)
  if (roundTrip !== raw) return { error: `달력에 없는 날짜입니다: ${raw}` }

  return { dayKey: raw, overridden: true }
}

/**
 * 내일 열리는 그랑프리를 찾는다.
 * 레이스 날짜는 UTC 기준이지만, 사용자는 자기 시간대의 '내일'을 기대하므로
 * 지정한 시간대로 환산해 비교한다.
 */
export const findRaceOn = (races, dayKey, timeZone = 'Asia/Seoul') =>
  races.find((r) => dateKeyInZone(new Date(`${r.date}T${r.time}`), timeZone) === dayKey) ?? null

/**
 * 발송 대상 선별.
 * - notify가 켜져 있고
 * - 해당 레이스를 구독한 플랜만
 *
 * 주소는 플랜에 저장하지 않는다. 목록이 로그인한 모두에게 공개라
 * 문서에 담으면 남의 주소가 그대로 보이기 때문이다.
 * 대신 소유자(ownerUid)를 돌려주고, 부르는 쪽이 계정에서 주소를 찾는다.
 *
 * 한 사람이 같은 레이스에 여러 플랜을 걸어둬도 한 번만 보낸다.
 */
export const selectRecipients = (plans, race) => {
  if (!race) return []
  const seen = new Set()
  const out = []
  for (const p of plans) {
    if (!p?.notify) continue
    if (!p?.ownerUid) continue
    if (p.circuitId !== race.circuitId) continue
    if (seen.has(p.ownerUid)) continue
    seen.add(p.ownerUid)
    out.push({ ownerUid: p.ownerUid, plan: p })
  }
  return out
}

/**
 * 3시간 간격 예보 목록에서 레이스 시작 시각에 가장 가까운 시점을 고른다.
 *
 * 전날 아침에 보내는 메일이라 '지금 날씨'는 레이스와 무관하다.
 * 관전자가 알고 싶은 건 경기가 시작될 때의 날씨다.
 *
 * @param {Array<{dt:number}>} list  OpenWeatherMap /forecast 의 list
 * @param {string} raceIso  레이스 시작 시각 (ISO)
 * @returns {object|null} 가장 가까운 예보 항목
 */
export const pickForecastAt = (list, raceIso) => {
  if (!Array.isArray(list) || !list.length) return null
  const target = Date.parse(raceIso)
  if (Number.isNaN(target)) return null

  let best = null
  let bestGap = Infinity
  for (const item of list) {
    const at = Number(item?.dt) * 1000
    if (!Number.isFinite(at)) continue
    const gap = Math.abs(at - target)
    if (gap < bestGap) {
      bestGap = gap
      best = item
    }
  }

  // 예보는 5일까지만 제공된다. 레이스가 그보다 멀면 엉뚱한 시점을 집게 되므로
  // 6시간(=예보 간격 3시간의 두 배)을 넘게 벌어지면 쓰지 않는다.
  if (bestGap > 6 * 60 * 60 * 1000) return null
  return best
}

const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )

/** 메일 제목 */
export const buildSubject = (race, weather) =>
  `[내일 레이스] ${race.name} · ${weather ? `${Math.round(weather.temp)}°C ${weather.description}` : '날씨 정보 없음'}`

/** 메일 본문(HTML) */
export const buildHtml = ({ race, weather, plan, condition }) => {
  const raceTime = new Date(`${race.date}T${race.time}`).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const row = (label, value) =>
    `<tr><td style="padding:6px 0;color:#8d9295;font-size:13px">${escapeHtml(label)}</td>
         <td style="padding:6px 0;text-align:right;font-weight:600;font-size:14px">${escapeHtml(value)}</td></tr>`

  return `<!DOCTYPE html>
<html lang="ko"><body style="margin:0;background:#06080a;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#12181b;border:1px solid rgba(200,204,206,.14);border-radius:18px;overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid rgba(200,204,206,.12)">
      <div style="font-size:11px;letter-spacing:.14em;color:#27f4d2;font-weight:700">NEXT RACE · ROUND ${escapeHtml(race.round)}</div>
      <h1 style="margin:8px 0 4px;font-size:22px;color:#f2f5f6">${escapeHtml(race.name)}</h1>
      <div style="font-size:13px;color:#b9c0c3">${escapeHtml(race.circuit)} · ${escapeHtml(race.locality)}, ${escapeHtml(race.country)}</div>
    </div>

    <div style="padding:20px 24px">
      ${
        weather
          ? `<div style="font-size:11px;letter-spacing:.1em;color:#8d9295;font-weight:700">
               ${weather.isForecast === false ? '현재 날씨' : '레이스 시작 시각 예보'}
             </div>
             <div style="font-size:40px;font-weight:200;color:#fff;letter-spacing:-.03em;margin-top:4px">${Math.round(weather.temp)}°C</div>
             <div style="color:#b9c0c3;font-size:14px;margin-top:2px">${escapeHtml(weather.description)}</div>
             <table style="width:100%;margin-top:16px;border-collapse:collapse;color:#f2f5f6">
               ${row('체감', `${Math.round(weather.feelsLike)}°C`)}
               ${row('습도', `${weather.humidity}%`)}
               ${row('바람', `${weather.windSpeed}m/s`)}
               ${condition != null ? row('레이스 컨디션', `${condition} / 100`) : ''}
             </table>`
          : `<div style="color:#e6a23c;font-size:14px">날씨 정보를 가져오지 못했습니다.</div>`
      }
      <div style="margin-top:18px;padding:12px 14px;border-radius:12px;background:rgba(39,244,210,.08);color:#b9c0c3;font-size:13px">
        레이스 시각 <strong style="color:#f2f5f6">${escapeHtml(raceTime)}</strong> (한국 시간)
        ${plan?.people ? `<br/>관전 인원 ${escapeHtml(plan.people)}명` : ''}
        ${plan?.memo ? `<br/>메모: ${escapeHtml(plan.memo)}` : ''}
      </div>
    </div>

    <div style="padding:14px 24px;border-top:1px solid rgba(200,204,206,.12);color:#8d9295;font-size:11px">
      Weather F1 · 관전 플랜에서 알림을 끄면 더 이상 발송되지 않습니다.
    </div>
  </div>
</body></html>`
}

/** Gmail API가 요구하는 RFC 2822 원문을 base64url로 인코딩 */
export const buildRawMessage = ({ to, from, subject, html }) => {
  const encodedSubject = `=?utf-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64'),
  ].join('\r\n')

  return Buffer.from(message, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
