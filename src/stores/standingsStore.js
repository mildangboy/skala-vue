import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchPointsProgress, fetchStandings } from '@/api/standings'
import { mockPointsProgress, mockStandings } from '@/api/mock'

/**
 * 챔피언십 순위 스토어.
 *
 * 순위표와 포인트 추이를 따로 관리한다. 순위표는 요청 한 번이면 나오지만
 * 추이는 라운드 수만큼 불러야 해서 처음엔 4초쯤 걸린다. 둘을 묶어두면
 * 표까지 4초를 기다리게 되므로, 표를 먼저 띄우고 추이는 뒤에서 채운다.
 *
 * 드라이버/컨스트럭터는 화면에서 탭으로 갈리므로 열어본 쪽만 받아온다.
 */
export const useStandingsStore = defineStore('standings', () => {
  // demo: 데모 데이터로 물러난 사유. 빈 문자열이면 실시간 응답이다.
  const empty = () => ({ round: 0, rows: [], loading: false, error: '', demo: '' })
  const emptyProgress = () => ({
    rounds: [],
    series: [],
    loading: false,
    error: '',
    missing: 0,
    demo: '',
  })

  const table = reactive({ driver: empty(), constructor: empty() })
  const progress = reactive({ driver: emptyProgress(), constructor: emptyProgress() })

  // 마지막으로 성공한 조회 시각 (새로고침 버튼이 쓴다)
  const lastUpdated = ref(null)

  const loadTable = async (type, { force = false } = {}) => {
    const slot = table[type]
    if (slot.loading) return
    // 이미 받아왔으면 다시 부르지 않는다. 순위는 레이스가 끝날 때만 바뀐다.
    if (slot.rows.length && !force) return

    slot.loading = true
    slot.error = ''
    try {
      const { round, rows } = await fetchStandings(type)
      slot.round = round
      slot.rows = rows
      slot.demo = ''
      lastUpdated.value = new Date()
    } catch (err) {
      // Jolpica는 짧은 시간에 요청이 몰리면 429로 막는다. 표가 통째로 비면
      // 화면이 무엇을 보여주려던 것인지도 알 수 없으므로 데모로 채운다.
      const demo = mockStandings(type)
      slot.round = demo.round
      slot.rows = demo.rows
      slot.demo = err?.message ?? '실시간 순위 조회에 실패했습니다'
      slot.error = ''
    } finally {
      slot.loading = false
    }
  }

  const loadProgress = async (type, { force = false } = {}) => {
    const slot = progress[type]
    const round = table[type].round
    if (!round || slot.loading) return
    if (slot.series.length && !force) return

    slot.loading = true
    slot.error = ''
    try {
      const { rounds, series, missing } = await fetchPointsProgress(type, round)
      slot.rounds = rounds
      slot.series = series
      slot.missing = missing ?? 0
      slot.demo = ''
    } catch (err) {
      const demo = mockPointsProgress(type)
      slot.rounds = demo.rounds
      slot.series = demo.series
      slot.missing = 0
      slot.demo = err?.message ?? '실시간 포인트 추이 조회에 실패했습니다'
      slot.error = ''
    } finally {
      slot.loading = false
    }
  }

  /** 표를 먼저 세우고, 이어서 추이를 채운다 */
  const load = async (type, opts) => {
    await loadTable(type, opts)
    loadProgress(type, opts)
  }

  const refresh = async (type) => {
    await loadTable(type, { force: true })
    await loadProgress(type, { force: true })
  }

  /** 시즌이 몇 라운드까지 진행됐는지 (둘 중 아는 쪽) */
  const currentRound = computed(() => table.driver.round || table.constructor.round || 0)

  /** 표와 추이 중 하나라도 데모면 그 사유 (화면이 안내에 쓴다) */
  const demoReasonOf = (type) => table[type].demo || progress[type].demo || ''

  return {
    table,
    progress,
    lastUpdated,
    currentRound,
    demoReasonOf,
    load,
    loadTable,
    loadProgress,
    refresh,
  }
})
