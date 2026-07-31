import axios from 'axios'

// 환경 변수(.env)에서 API 키/베이스 URL을 읽는다. 절대 소스코드에 키를 하드코딩하지 않는다.
// (.env 파일은 .gitignore에 포함되어 Git에 업로드되지 않는다)
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY ?? ''
const BASE_URL = import.meta.env.VITE_OPENWEATHER_BASE_URL ?? 'https://api.openweathermap.org'

export const hasApiKey = () => Boolean(API_KEY)

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
})

// 모든 요청에 공통 파라미터(API 키, 언어) 자동 주입
client.interceptors.request.use((config) => {
  config.params = {
    appid: API_KEY,
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
        ? 'API 키가 유효하지 않습니다. .env의 VITE_OPENWEATHER_API_KEY를 확인해주세요.'
        : status === 404
          ? '해당 도시를 찾을 수 없습니다.'
          : (error?.response?.data?.message ?? '날씨 정보를 불러오는 중 오류가 발생했습니다.')
    return Promise.reject(new Error(message))
  },
)

export default client
