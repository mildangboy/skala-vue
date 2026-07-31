/**
 * localStorage 기반 TTL 캐시.
 * 네트워크가 끊겼거나 API 호출이 실패해도 마지막 정상 응답을 보여주기 위해 사용한다.
 */
const PREFIX = 'skala-vue:cache:'
const DEFAULT_TTL = 10 * 60 * 1000 // 10분

export const cacheSet = (key, value) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ value, at: Date.now() }))
  } catch {
    // 저장 공간 초과 등은 무시 (캐시는 부가 기능)
  }
}

/**
 * TTL 이내면 { value, stale: false }, 만료됐어도 값이 있으면 stale: true로 반환.
 * 반환 객체는 structuredClone으로 복제해 호출부가 캐시 원본을 변형할 수 없게 한다.
 */
export const cacheGet = (key, ttl = DEFAULT_TTL) => {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { value, at } = JSON.parse(raw)
    return { value: structuredClone(value), stale: Date.now() - at > ttl, at }
  } catch {
    return null
  }
}

export const cacheClear = () => {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
}

/**
 * 캐시 우선(stale-while-revalidate) 헬퍼.
 * 신선한 캐시가 있으면 즉시 반환하고, 없으면 fetcher 실행 후 캐싱한다.
 * fetcher가 실패하면 만료된 캐시라도 있으면 그것을 반환한다.
 */
export const withCache = async (key, fetcher, { ttl = DEFAULT_TTL } = {}) => {
  const cached = cacheGet(key, ttl)
  if (cached && !cached.stale) return { data: cached.value, fromCache: true, stale: false }

  try {
    const data = await fetcher()
    cacheSet(key, data)
    return { data, fromCache: false, stale: false }
  } catch (err) {
    if (cached) return { data: cached.value, fromCache: true, stale: true }
    throw err
  }
}
