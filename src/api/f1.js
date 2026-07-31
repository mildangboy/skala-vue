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
