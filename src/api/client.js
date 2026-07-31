import axios from 'axios'

/**
 * API 키는 빌드 시 환경 변수(.env, Git 미포함)에서 주입된다.
 * 단일 HTML 데모처럼 빌드 시 키를 넣을 수 없는 경우에 한해
 * 사용자가 직접 입력한 키를 localStorage에서 읽어 사용한다.
 */
const RUNTIME_KEY = 'skala-vue:apiKey'
const BUILD_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY ?? ''
const BASE_URL = import.meta.env.VITE_OPENWEATHER_BASE_URL ?? 'https://api.openweathermap.org'

export const getApiKey = () => {
  if (BUILD_KEY) return BUILD_KEY
  try {
    return localStorage.getItem(RUNTIME_KEY) ?? ''
  } catch {
    return ''
  }
}

export const setApiKey = (key) => {
  try {
    localStorage.setItem(RUNTIME_KEY, key.trim())
  } catch {
    // 저장 실패 시 이번 세션에서만 동작
  }
}

export const hasApiKey = () => Boolean(getApiKey())

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
})

// 모든 요청에 공통 파라미터(API 키, 언어) 자동 주입
client.interceptors.request.use((config) => {
  config.params = {
    appid: getApiKey(),
    lang: 'kr',
    ...config.params,
  }
  return config
})

// 공통 에러 메시지 정리
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message =
      status === 401
        ? 'API 키가 유효하지 않습니다. 키를 다시 확인해주세요.'
        : status === 404
          ? '해당 도시를 찾을 수 없습니다.'
          : status === 429
            ? 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
            : (error?.response?.data?.message ?? '날씨 정보를 불러오는 중 오류가 발생했습니다.')
    return Promise.reject(new Error(message))
  },
)

export default client
