import { Firestore } from '@google-cloud/firestore'
import { google } from 'googleapis'
import functions from '@google-cloud/functions-framework'

import { F1_CALENDAR_2026 } from './f1Calendar2026.js'
import {
  tomorrowKey,
  findRaceOn,
  selectRecipients,
  buildSubject,
  buildHtml,
  buildRawMessage,
} from './notifier.js'

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

/** OpenWeatherMap 현재 날씨 (좌표 기준) */
const fetchWeather = async (lat, lon) => {
  const url = new URL('https://api.openweathermap.org/data/2.5/weather')
  url.searchParams.set('lat', lat)
  url.searchParams.set('lon', lon)
  url.searchParams.set('units', 'metric')
  url.searchParams.set('lang', 'kr')
  url.searchParams.set('appid', process.env.OPENWEATHER_API_KEY ?? '')

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`날씨 조회 실패 (${res.status})`)
  const data = await res.json()

  return {
    temp: data.main?.temp,
    feelsLike: data.main?.feels_like,
    humidity: data.main?.humidity,
    windSpeed: data.wind?.speed,
    description: data.weather?.[0]?.description ?? '',
    conditionId: data.weather?.[0]?.id ?? null,
  }
}

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
    const dayKey = tomorrowKey(new Date(), TIME_ZONE)
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
      weather = await fetchWeather(race.lat, race.lon)
    } catch (err) {
      console.warn('날씨 조회 실패, 날씨 없이 발송합니다:', err.message)
    }

    const gmail = gmailClient()
    const from = process.env.GMAIL_SENDER ?? 'me'
    const subject = buildSubject(race, weather)

    const results = await Promise.allSettled(
      recipients.map(({ email, plan }) =>
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

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - sent
    results
      .filter((r) => r.status === 'rejected')
      .forEach((r) => console.error('발송 실패:', r.reason?.message))

    console.log(`${race.name}: ${sent}건 발송, ${failed}건 실패 (${Date.now() - startedAt}ms)`)
    return res.status(200).json({ race: race.name, sent, failed })
  } catch (err) {
    console.error('알림 처리 중 오류:', err)
    return res.status(500).json({ error: err.message })
  }
}

functions.http('notifyRaceWeather', notifyRaceWeather)
