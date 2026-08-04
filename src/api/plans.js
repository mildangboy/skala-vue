import axios from 'axios'
import { getIdToken } from './firebase'

/**
 * 관전 플랜 CRUD — Google Cloud Firestore REST API.
 *
 * 예약 알림을 Cloud Function이 보내려면 서버가 읽을 수 있는 저장소가 필요해서
 * 연습용 JSONPlaceholder에서 Firestore로 옮겼다. REST 엔드포인트를 Axios로
 * 직접 호출하므로 교재의 POST/PUT/DELETE 실습 구조는 그대로 유지된다.
 *
 * 설정이 없으면(로컬에서 .env를 채우지 않은 경우) 호출하지 않고 안내를 던진다.
 */
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? ''
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY ?? ''
const COLLECTION = 'plans'

export const hasFirestoreConfig = () => Boolean(PROJECT_ID && API_KEY)

const client = axios.create({
  baseURL: `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// 모든 요청에 API 키와 로그인 토큰을 붙인다.
// updateMask처럼 같은 키를 여러 번 보내야 하는 경우 URLSearchParams로 들어오므로
// 객체와 URLSearchParams 두 형태를 모두 받아준다.
client.interceptors.request.use(async (config) => {
  if (config.params instanceof URLSearchParams) {
    config.params.set('key', API_KEY)
  } else {
    config.params = { key: API_KEY, ...config.params }
  }

  // 보안 규칙이 request.auth를 보므로 토큰이 없으면 읽기조차 거부된다
  const token = await getIdToken()
  if (token) config.headers.Authorization = `Bearer ${token}`

  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    const detail = error?.response?.data?.error?.message
    const message =
      status === 400
        ? `요청 형식이 올바르지 않습니다. ${detail ?? ''}`.trim()
        : // 규칙은 "로그인한 본인 문서 + 계정 이메일"만 허용한다.
          // 설정 문제로 오해하지 않도록 실제로 흔한 원인을 먼저 안내한다.
          status === 401 || status === 403
          ? '저장이 거부되었습니다. 로그인 상태와 알림 이메일이 계정 주소와 같은지 확인해주세요.'
          : status === 404
            ? '해당 플랜을 찾을 수 없습니다.'
            : status >= 500
              ? '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
              : (detail ?? error?.message ?? '요청을 처리하지 못했습니다.')
    return Promise.reject(new Error(message))
  },
)

/* ── Firestore 문서 형식 ↔ 앱 객체 변환 ─────────────────────────
   Firestore REST는 값마다 타입을 명시한 형태({ stringValue: 'x' })를 쓴다.
   앱에서는 평범한 객체로 다루고 경계에서만 변환한다.            */

const toFirestoreValue = (v) => {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number')
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  return { stringValue: String(v) }
}

const fromFirestoreValue = (v) => {
  if (!v || typeof v !== 'object') return null
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('timestampValue' in v) return v.timestampValue
  return v.stringValue ?? null
}

/**
 * 문서에 저장하는 필드 목록.
 *
 * ownerUid가 빠지면 저장 요청에 소유자 표시가 실리지 않아
 * 보안 규칙(claimsSelf)이 모든 쓰기를 거부한다.
 *
 * 이메일은 일부러 넣지 않는다. 목록이 로그인한 모두에게 공개라
 * 문서에 담으면 남의 주소가 그대로 보인다. 알림은 어차피 계정 주소로만
 * 나가므로 발송 시점에 함수가 Firebase Auth에서 꺼내 쓴다.
 * 화면에는 작성자가 정한 nickname을 보여준다.
 */
const PLAN_FIELDS = [
  'ownerUid',
  'nickname',
  'circuitId',
  'circuitName',
  'round',
  'people',
  'excitement',
  'notify',
  'memo',
]

const toDocument = (plan) => ({
  fields: Object.fromEntries(PLAN_FIELDS.map((k) => [k, toFirestoreValue(plan[k])])),
})

// 문서 경로(projects/../documents/plans/abc123)에서 문서 ID만 뽑는다
const docId = (name) =>
  String(name ?? '')
    .split('/')
    .pop()

const fromDocument = (doc) => {
  const fields = doc?.fields ?? {}
  const plan = Object.fromEntries(PLAN_FIELDS.map((k) => [k, fromFirestoreValue(fields[k])]))
  return { ...plan, id: docId(doc?.name) }
}

/* ── CRUD ───────────────────────────────────────────────────── */

/**
 * GET — 모든 플랜 조회.
 * 로그인한 사람은 서로의 플랜을 볼 수 있고, 수정·삭제만 작성자로 제한된다.
 * 문서에 이메일이 없으므로 목록이 공개돼도 남의 주소가 드러나지 않는다.
 */
export const fetchPlans = async (limit = 50) => {
  const { data } = await client.post(':runQuery', {
    structuredQuery: {
      from: [{ collectionId: COLLECTION }],
      limit,
    },
  })

  // runQuery는 [{ document }, ...] 형태로 오고, 결과가 없으면 document가 비어 있다
  return (data ?? []).filter((row) => row.document).map((row) => fromDocument(row.document))
}

// POST — 신규 등록 (Firestore가 문서 ID를 생성)
export const createPlan = async (plan) => {
  const { data } = await client.post(`/${COLLECTION}`, toDocument(plan))
  return fromDocument(data)
}

// PATCH — 수정
export const updatePlan = async (plan) => {
  // updateMask를 명시하지 않으면 문서 전체가 교체된다.
  // 같은 키를 필드 수만큼 반복해야 해서 URLSearchParams를 쓴다.
  const params = new URLSearchParams()
  PLAN_FIELDS.forEach((f) => params.append('updateMask.fieldPaths', f))

  const { data } = await client.patch(`/${COLLECTION}/${plan.id}`, toDocument(plan), { params })
  return fromDocument(data)
}

// DELETE — 삭제
export const deletePlan = async (id) => {
  await client.delete(`/${COLLECTION}/${id}`)
  return id
}
