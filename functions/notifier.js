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
 * - 이메일이 있고
 * - 해당 레이스를 구독한 플랜만
 * 같은 주소가 여러 플랜을 걸어둔 경우 한 번만 보낸다.
 */
export const selectRecipients = (plans, race) => {
  if (!race) return []
  const seen = new Set()
  const out = []
  for (const p of plans) {
    if (!p?.notify) continue
    if (!p?.email || !p.email.includes('@')) continue
    if (p.circuitId !== race.circuitId) continue
    const key = p.email.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ email: p.email.trim(), plan: p })
  }
  return out
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
          ? `<div style="font-size:40px;font-weight:200;color:#fff;letter-spacing:-.03em">${Math.round(weather.temp)}°C</div>
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
      SKALA Weather · 관전 플랜에서 알림을 끄면 더 이상 발송되지 않습니다.
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
