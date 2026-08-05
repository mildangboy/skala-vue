import axios from 'axios'

/** Jolpica-F1: Ergast API의 공식 후속 프로젝트 (인증 불필요) */
export const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'

/**
 * Jolpica 조회 (재시도 포함).
 *
 * 짧은 시간에 요청이 몰리면 429로 막는다. 여러 건을 한꺼번에 부르면
 * 가끔 한둘이 튕겨 그 항목만 조용히 빠지므로, 실패하면 잠깐 쉬고 다시 부른다.
 * 없는 데이터(404)나 잘못된 요청은 다시 불러도 같으니 바로 포기한다.
 */
export const jolpicaGet = async (path, { params = {}, tries = 3 } = {}) => {
  for (let i = 0; i < tries; i += 1) {
    try {
      const { data } = await axios.get(`${JOLPICA_BASE}${path}`, {
        params: { limit: 100, ...params },
        timeout: 7000,
      })
      return data
    } catch (err) {
      const status = err?.response?.status
      if (status && status !== 429 && status < 500) throw err
      if (i === tries - 1) throw err
      await new Promise((r) => setTimeout(r, 400 * (i + 1)))
    }
  }
  // 도달하지 않지만, 반환 타입을 분명히 해둔다
  throw new Error('jolpicaGet: 재시도 소진')
}

/**
 * 여러 요청을 한 번에 다 보내지 않고 size개씩 끊어 보낸다.
 *
 * 시즌 전체 라운드를 한꺼번에 부르면 429가 쏟아진다. 그렇다고 하나씩 보내면
 * 라운드당 0.8초라 열 몇 개에 10초가 넘는다. 몇 개씩 겹쳐 보내는 게 타협점이다.
 *
 * 실패한 항목은 버리지 않고 null로 남겨 호출부가 빈 자리를 알아볼 수 있게 한다.
 */
export const inBatches = async (items, worker, size = 3) => {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size)
    const settled = await Promise.allSettled(chunk.map(worker))
    out.push(...settled.map((s) => (s.status === 'fulfilled' ? s.value : null)))
  }
  return out
}
