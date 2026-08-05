import { F1_SEASON } from '@/data/f1Calendar2026'
import { withCache } from '@/utils/cache'
import { inBatches, jolpicaGet } from './jolpica'

/**
 * 챔피언십 순위.
 *
 * 현재 순위는 요청 두 번이면 끝나지만, 포인트 추이는 라운드마다 한 번씩 불러야 한다.
 * 그래서 둘을 나눠 두고, 화면이 표를 먼저 띄운 뒤 추이를 뒤에서 채우게 한다.
 */

const TYPES = {
  driver: {
    path: 'driverStandings',
    listKey: 'DriverStandings',
    // 드라이버는 시즌 중 팀을 옮길 수 있어 그 라운드의 소속을 그대로 담는다
    map: (row) => ({
      id: row.Driver.driverId,
      name: `${row.Driver.givenName} ${row.Driver.familyName}`,
      shortName: row.Driver.familyName,
      code: row.Driver.code ?? '',
      number: row.Driver.permanentNumber ?? '',
      nationality: row.Driver.nationality ?? '',
      constructorId: row.Constructors?.at(-1)?.constructorId ?? '',
      constructorName: row.Constructors?.at(-1)?.name ?? '',
      position: Number(row.position),
      points: Number(row.points),
      wins: Number(row.wins),
    }),
  },
  constructor: {
    path: 'constructorStandings',
    listKey: 'ConstructorStandings',
    map: (row) => ({
      id: row.Constructor.constructorId,
      name: row.Constructor.name,
      // 차트 선 끝에 붙는 이름이라 짧아야 한다.
      // "Alpine F1 Team"처럼 긴 이름은 옆 선의 이름과 겹치거나 잘린다.
      shortName: row.Constructor.name.replace(/\s+F1 Team$/, ''),
      constructorId: row.Constructor.constructorId,
      constructorName: row.Constructor.name,
      nationality: row.Constructor.nationality ?? '',
      position: Number(row.position),
      points: Number(row.points),
      wins: Number(row.wins),
    }),
  },
}

const readList = (data, type) => {
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]
  if (!list) return { round: 0, rows: [] }
  return {
    round: Number(list.round) || 0,
    rows: (list[TYPES[type].listKey] ?? []).map(TYPES[type].map),
  }
}

/**
 * 현재 순위. round는 이 순위가 몇 라운드까지 반영된 것인지를 뜻한다.
 *
 * @param {'driver'|'constructor'} type
 */
export const fetchStandings = async (type, season = F1_SEASON) => {
  const data = await jolpicaGet(`/${season}/${TYPES[type].path}.json`)
  return readList(data, type)
}

/**
 * 한 라운드 시점의 순위.
 *
 * 끝난 라운드의 순위는 다시 바뀌지 않으므로 사실상 영구 캐시한다.
 * 다만 가장 최근 라운드는 경기 후 페널티로 뒤집히는 일이 있어 한 시간만 잡는다.
 */
const YEAR = 365 * 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

const fetchRound = async (type, round, latestRound, season) => {
  const { data } = await withCache(
    `standings:${season}:${type}:${round}`,
    async () => readList(await jolpicaGet(`/${season}/${round}/${TYPES[type].path}.json`), type),
    { ttl: round === latestRound ? HOUR : YEAR },
  )
  return data
}

/**
 * 1라운드부터 마지막 라운드까지의 누적 포인트 추이.
 *
 * 응답은 라운드 시점의 '누적' 포인트다. 라운드에서 딴 포인트는 앞 라운드와의
 * 차이로 구할 수 있어서, 스파크라인을 위해 따로 더 받아올 필요가 없다.
 *
 * 아직 안 나온 라운드가 있어도 나머지는 그린다. 그 자리는 null로 두어
 * 차트가 선을 잇지 않고 끊게 한다(없는 값을 0으로 두면 순위가 떨어진 것처럼 보인다).
 *
 * @returns {{rounds: number[], series: Array<{id, name, shortName, constructorId, cumulative: (number|null)[]}>}}
 */
export const fetchPointsProgress = async (type, latestRound, season = F1_SEASON) => {
  if (!latestRound) return { rounds: [], series: [] }

  const rounds = Array.from({ length: latestRound }, (_, i) => i + 1)
  const perRound = await inBatches(rounds, (r) => fetchRound(type, r, latestRound, season))

  // 마지막 라운드 기준으로 참가자 목록과 표시 정보를 잡는다.
  // 중간에 합류했거나 빠진 참가자도 있어서, 전 라운드를 훑어 빠짐없이 모은다.
  const meta = new Map()
  for (const snap of perRound) {
    for (const row of snap?.rows ?? []) {
      meta.set(row.id, {
        id: row.id,
        name: row.name,
        shortName: row.shortName,
        constructorId: row.constructorId,
        constructorName: row.constructorName,
      })
    }
  }

  const series = [...meta.values()].map((m) => ({
    ...m,
    cumulative: perRound.map((snap) => {
      if (!snap) return null // 그 라운드를 못 받아왔다
      const hit = snap.rows.find((r) => r.id === m.id)
      // 참가 중인데 순위에 없으면 0점, 아직 합류 전이면 null
      return hit ? hit.points : snap.rows.length ? 0 : null
    }),
  }))

  return { rounds, series, missing: perRound.filter((s) => !s).length }
}

/**
 * 누적 포인트에서 라운드별 획득 포인트를 뽑는다.
 * 스파크라인이 쓰는 값이다.
 */
export const perRoundPoints = (cumulative = []) =>
  cumulative.map((v, i) => {
    if (v == null) return null
    // 앞쪽에서 가장 가까운 값과의 차이 (중간에 빠진 라운드가 있어도 버티도록)
    let prev = 0
    for (let j = i - 1; j >= 0; j -= 1) {
      if (cumulative[j] != null) {
        prev = cumulative[j]
        break
      }
    }
    return v - prev
  })
