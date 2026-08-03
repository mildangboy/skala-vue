import { onBeforeUnmount, onMounted, ref } from 'vue'

/** 기본 자동 갱신 주기 — 10분 */
export const REFRESH_INTERVAL = 10 * 60 * 1000

/**
 * 주기적으로 콜백을 실행하는 컴포저블.
 *
 * 설계 의도
 * - 탭이 백그라운드로 가면 타이머를 멈춘다. 보이지도 않는 화면 때문에
 *   API 호출 한도를 소모할 이유가 없다.
 * - 탭으로 돌아왔을 때 마지막 갱신이 주기를 넘겼다면 즉시 한 번 당겨온다.
 *   그래야 오래 방치했다가 돌아왔을 때 낡은 값을 보지 않는다.
 * - 갱신 중 중복 실행을 막고, 언마운트 시 타이머와 리스너를 정리한다.
 *
 * @param {() => Promise<void>} callback 갱신 작업
 * @param {object} options
 * @param {number} options.interval  주기(ms)
 * @param {boolean} options.immediate 마운트 직후 1회 실행 여부
 */
export const useAutoRefresh = (
  callback,
  { interval = REFRESH_INTERVAL, immediate = false } = {},
) => {
  const refreshing = ref(false)
  const lastUpdated = ref(null)
  const paused = ref(false)

  let timer = null

  const run = async () => {
    if (refreshing.value) return // 중복 실행 방지
    refreshing.value = true
    try {
      await callback()
      lastUpdated.value = Date.now()
    } finally {
      refreshing.value = false
    }
  }

  const start = () => {
    stop()
    timer = setInterval(run, interval)
    paused.value = false
  }

  const stop = () => {
    if (timer) clearInterval(timer)
    timer = null
  }

  const handleVisibility = () => {
    if (document.hidden) {
      stop()
      paused.value = true
      return
    }
    // 복귀 시점에 주기를 넘겼으면 바로 갱신
    const elapsed = lastUpdated.value ? Date.now() - lastUpdated.value : Infinity
    if (elapsed >= interval) run()
    start()
  }

  onMounted(() => {
    if (immediate) run()
    else lastUpdated.value = Date.now() // 화면 진입 시 이미 조회한 것으로 간주
    start()
    document.addEventListener('visibilitychange', handleVisibility)
  })

  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', handleVisibility)
  })

  return { refresh: run, refreshing, lastUpdated, paused }
}
