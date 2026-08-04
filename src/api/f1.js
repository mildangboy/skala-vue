import axios from 'axios'
import { F1_CALENDAR_2026, F1_SEASON } from '@/data/f1Calendar2026'

// Jolpica-F1: Ergast API의 공식 후속 프로젝트 (인증 불필요)
const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'

// 영문 GP 명칭 -> 한글 명칭 매핑 (내장 캘린더 기준)
const KO_NAME_BY_ID = Object.fromEntries(F1_CALENDAR_2026.map((r) => [r.circuitId, r.name]))

const mapJolpicaRace = (race) => ({
  round: Number(race.round),
  name: KO_NAME_BY_ID[race.Circuit?.circuitId] ?? race.raceName,
  nameEn: race.raceName,
  circuit: race.Circuit?.circuitName ?? '',
  circuitId: race.Circuit?.circuitId ?? '',
  locality: race.Circuit?.Location?.locality ?? '',
  country: race.Circuit?.Location?.country ?? '',
  lat: Number(race.Circuit?.Location?.lat),
  lon: Number(race.Circuit?.Location?.long),
  date: race.date,
  time: race.time ?? '00:00:00Z',
  sprint: Boolean(race.Sprint),
  sessions: {
    fp1: race.FirstPractice,
    fp2: race.SecondPractice,
    fp3: race.ThirdPractice,
    sprintQualifying: race.SprintQualifying,
    sprint: race.Sprint,
    qualifying: race.Qualifying,
  },
})

/**
 * 시즌 일정 조회. 라이브 API 실패 시 내장 스냅샷으로 폴백하므로
 * 네트워크 상태와 무관하게 항상 일정이 표시된다.
 */
/**
 * 한 서킷의 역대 레이스 결과.
 *
 * 우승자와 그 레이스의 최고 랩(fastest lap)을 뽑는다.
 * 최고 랩에는 평균 속도가 함께 오는데, 서킷 최고속도는 API에 없으므로
 * 이 값을 '그 랩의 평균 속도'로 그대로 보여준다(실측이라 손으로 넣은 값보다 믿을 만하다).
 *
 * 결과가 20명분이라 응답이 크다. 필요한 것만 골라 담아 화면으로 넘긴다.
 *
 * @param {string} circuitId
 * @param {number} count 최근 몇 시즌을 볼지
 */
export const fetchCircuitHistory = async (circuitId, count = 5) => {
  if (!circuitId) return []

  // 아직 열리지 않은 시즌은 결과가 없으므로 지난 시즌부터 센다
  const latest = F1_SEASON - 1
  const seasons = Array.from({ length: count }, (_, i) => latest - i)

  // Jolpica는 짧은 시간에 몰린 요청을 막는다. 다섯 시즌을 한꺼번에 부르면
  // 가끔 한둘이 튕겨 그 해만 조용히 빠지므로, 실패하면 잠깐 쉬고 다시 부른다.
  const getWithRetry = async (url, tries = 3) => {
    for (let i = 0; i < tries; i += 1) {
      try {
        return await axios.get(url, { params: { limit: 100 }, timeout: 7000 })
      } catch (err) {
        const status = err?.response?.status
        // 없는 데이터(404)나 잘못된 요청은 다시 불러도 같다
        if (status && status !== 429 && status < 500) throw err
        if (i === tries - 1) throw err
        await new Promise((r) => setTimeout(r, 400 * (i + 1)))
      }
    }
  }

  const settled = await Promise.allSettled(
    seasons.map(async (season) => {
      const { data } = await getWithRetry(
        `${JOLPICA_BASE}/${season}/circuits/${circuitId}/results.json`,
      )
      const race = data?.MRData?.RaceTable?.Races?.[0]
      if (!race) return null

      const results = race.Results ?? []
      const winner = results.find((r) => r.position === '1')
      // rank가 '1'인 항목이 그 레이스의 최고 랩
      const fastest = results.find((r) => r.FastestLap?.rank === '1')

      return {
        season: Number(season),
        date: race.date,
        winner: winner && {
          name: `${winner.Driver.givenName} ${winner.Driver.familyName}`,
          code: winner.Driver.code ?? '',
          team: winner.Constructor.name,
          time: winner.Time?.time ?? '',
        },
        fastestLap: fastest && {
          name: `${fastest.Driver.givenName} ${fastest.Driver.familyName}`,
          team: fastest.Constructor.name,
          time: fastest.FastestLap.Time?.time ?? '',
          lap: Number(fastest.FastestLap.lap) || null,
          // "207.708 kph" 형태로 온다
          speedKph: Number(fastest.FastestLap.AverageSpeed?.speed) || null,
        },
      }
    }),
  )

  // 한 시즌 조회가 실패해도 나머지는 보여준다
  return settled
    .filter((s) => s.status === 'fulfilled' && s.value)
    .map((s) => s.value)
    .sort((a, b) => b.season - a.season)
}

export const fetchSeasonCalendar = async (season = F1_SEASON) => {
  try {
    const { data } = await axios.get(`${JOLPICA_BASE}/${season}/races.json`, {
      params: { limit: 30 },
      timeout: 7000,
    })
    const races = data?.MRData?.RaceTable?.Races ?? []
    if (!races.length) throw new Error('empty')
    return { races: races.map(mapJolpicaRace), source: 'live' }
  } catch {
    return { races: F1_CALENDAR_2026, source: 'bundled' }
  }
}
