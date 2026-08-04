import { Firestore } from '@google-cloud/firestore'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { google } from 'googleapis'
import functions from '@google-cloud/functions-framework'

import { F1_CALENDAR_2026 } from './f1Calendar2026.js'
import {
  resolveDayKey,
  findRaceOn,
  selectRecipients,
  pickForecastAt,
  buildSubject,
  buildHtml,
  buildRawMessage,
} from './notifier.js'
import { describeWeather } from './weatherText.js'

/**
 * 레이스 전날 서킷 날씨 알림.
 *
 * Cloud Scheduler가 하루 한 번 호출한다.
 *   1) 내일 열리는 그랑프리가 있는지 확인 (없으면 즉시 종료)
 *   2) Firestore에서 그 서킷을 구독한 플랜을 읽는다
 *   3) OpenWeatherMap에서 서킷 좌표의 날씨를 가져온다
 *   4) Gmail API로 각 수신자에게 발송한다
 *
 * 비밀값은 Secret Manager에서 환경변수로 주입받는다.
 */
const TIME_ZONE = process.env.TIME_ZONE ?? 'Asia/Seoul'

const firestore = new Firestore()

// 알림 주소는 문서가 아니라 계정에서 읽는다.
// 플랜 목록이 로그인한 모두에게 공개라 문서에 주소를 담으면 남에게 보인다.
initializeApp()

/**
 * 소유자 uid로 계정 이메일을 찾는다.
 * 계정이 지워졌거나 조회에 실패하면 null을 돌려주고 그 사람만 건너뛴다.
 */
const emailOf = async (uid) => {
  try {
    const user = await getAuth().getUser(uid)
    return user.email ?? null
  } catch (err) {
    console.warn(`계정 조회 실패 (${uid}): ${err.message}`)
    return null
  }
}

/**
 * 레이스 시작 시각의 예보를 가져온다.
 *
 * 전날 아침에 보내는 메일이므로 '지금 날씨'가 아니라
 * 경기가 시작될 시점의 예보를 담아야 의미가 있다.
 * /forecast는 3시간 간격 5일치를 주므로 그중 가장 가까운 시점을 고른다.
 *
 * 예보 범위를 벗어나면(=레이스가 5일 이상 남음) null을 돌려주고,
 * 부르는 쪽에서 현재 날씨로 물러난다.
 */
const fetchRaceForecast = async (race) => {
  const url = new URL('https://api.openweathermap.org/data/2.5/forecast')
  url.searchParams.set('lat', race.lat)
  url.searchParams.set('lon', race.lon)
  url.searchParams.set('units', 'metric')
  url.searchParams.set('appid', process.env.OPENWEATHER_API_KEY ?? '')

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`예보 조회 실패 (${res.status})`)
  const data = await res.json()

  const hit = pickForecastAt(data.list, `${race.date}T${race.time}`)
  if (!hit) return null

  return {
    temp: hit.main?.temp,
    feelsLike: hit.main?.feels_like,
    humidity: hit.main?.humidity,
    windSpeed: hit.wind?.speed,
    // lang=kr 응답은 '온흐림'처럼 어색해서 코드로 직접 옮긴다
    description: describeWeather(hit.weather?.[0]?.id, hit.weather?.[0]?.description),
    conditionId: hit.weather?.[0]?.id ?? null,
    forecastFor: hit.dt_txt ?? null, // 어느 시점의 예보인지
    isForecast: true,
  }
}

/** 예보가 없을 때 쓰는 현재 날씨 */
const fetchCurrentWeather = async (lat, lon) => {
  const url = new URL('https://api.openweathermap.org/data/2.5/weather')
  url.searchParams.set('lat', lat)
  url.searchParams.set('lon', lon)
  url.searchParams.set('units', 'metric')
  url.searchParams.set('appid', process.env.OPENWEATHER_API_KEY ?? '')

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`날씨 조회 실패 (${res.status})`)
  const data = await res.json()

  return {
    temp: data.main?.temp,
    feelsLike: data.main?.feels_like,
    humidity: data.main?.humidity,
    windSpeed: data.wind?.speed,
    description: describeWeather(data.weather?.[0]?.id, data.weather?.[0]?.description),
    conditionId: data.weather?.[0]?.id ?? null,
    isForecast: false,
  }
}

/** 예보를 우선 쓰고, 범위를 벗어나면 현재 날씨로 물러난다 */
const fetchWeather = async (race) =>
  (await fetchRaceForecast(race)) ?? (await fetchCurrentWeather(race.lat, race.lon))

/** 저장해 둔 리프레시 토큰으로 Gmail 클라이언트를 만든다 */
const gmailClient = () => {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground',
  )
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  return google.gmail({ version: 'v1', auth })
}

const loadPlans = async () => {
  const snap = await firestore.collection('plans').where('notify', '==', true).get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const notifyRaceWeather = async (req, res) => {
  const startedAt = Date.now()
  try {
    const { dayKey, overridden, error } = resolveDayKey(req?.query?.date, new Date(), TIME_ZONE)
    if (error) {
      console.warn(error)
      return res.status(400).json({ error })
    }
    if (overridden) console.log(`날짜 지정 호출: ${dayKey}`)

    const race = findRaceOn(F1_CALENDAR_2026, dayKey, TIME_ZONE)

    if (!race) {
      const msg = `${dayKey}에 예정된 레이스가 없습니다.`
      console.log(msg)
      return res.status(200).json({ sent: 0, reason: msg })
    }

    const plans = await loadPlans()
    const recipients = selectRecipients(plans, race)
    if (!recipients.length) {
      console.log(`${race.name} 구독자가 없습니다.`)
      return res.status(200).json({ sent: 0, race: race.name, reason: '구독자 없음' })
    }

    // 날씨는 한 번만 조회해 모든 수신자에게 재사용한다
    let weather = null
    try {
      weather = await fetchWeather(race)
    } catch (err) {
      console.warn('날씨 조회 실패, 날씨 없이 발송합니다:', err.message)
    }

    const gmail = gmailClient()
    const from = process.env.GMAIL_SENDER ?? 'me'
    const subject = buildSubject(race, weather)

    // 주소를 먼저 모으고, 못 찾은 사람은 제외한다
    const withEmail = (
      await Promise.all(
        recipients.map(async (r) => ({ ...r, email: await emailOf(r.ownerUid) })),
      )
    ).filter((r) => r.email)

    if (!withEmail.length) {
      console.log(`${race.name}: 주소를 찾은 수신자가 없습니다.`)
      return res.status(200).json({ sent: 0, race: race.name, reason: '주소 조회 실패' })
    }

    const results = await Promise.allSettled(
      withEmail.map(({ email, plan }) =>
        gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: buildRawMessage({
              to: email,
              from,
              subject,
              html: buildHtml({ race, weather, plan, condition: null }),
            }),
          },
        }),
      ),
    )

    const skipped = recipients.length - withEmail.length
    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - sent
    results
      .filter((r) => r.status === 'rejected')
      .forEach((r) => console.error('발송 실패:', r.reason?.message))

    console.log(
      `${race.name}: ${sent}건 발송, ${failed}건 실패` +
        (skipped ? `, ${skipped}건 주소 없음` : '') +
        ` (${Date.now() - startedAt}ms)`,
    )
    return res.status(200).json({ race: race.name, sent, failed, skipped })
  } catch (err) {
    console.error('알림 처리 중 오류:', err)
    return res.status(500).json({ error: err.message })
  }
}

functions.http('notifyRaceWeather', notifyRaceWeather)
