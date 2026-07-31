import axios from 'axios'

/**
 * 관전 플랜 CRUD.
 * 교재 실습과 동일하게 JSONPlaceholder를 연습용 백엔드로 사용한다.
 * 이 API는 실제로 저장하지 않고 요청을 그대로 되돌려주므로,
 * 화면 상태는 스토어가 낙관적으로 갱신하고 실패 시 롤백한다.
 */
const client = axios.create({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    const message =
      status === 404
        ? '해당 플랜을 서버에서 찾을 수 없습니다.'
        : status >= 500
          ? '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
          : (error?.message ?? '요청을 처리하지 못했습니다.')
    return Promise.reject(new Error(message))
  },
)

// GET — 초기 목록 (연습 API의 posts를 플랜 형태로 매핑)
export const fetchPlans = async (limit = 3) => {
  const { data } = await client.get('/posts', { params: { _limit: limit } })
  return data.map((item) => ({
    id: item.id,
    circuitId: '',
    circuitName: '(불러온 샘플)',
    email: `user${item.id}@example.com`,
    people: 1,
    excitement: 3,
    notify: false,
    memo: item.title,
  }))
}

// POST — 신규 등록
export const createPlan = async (plan) => {
  const { data } = await client.post('/posts', { title: plan.memo, body: JSON.stringify(plan) })
  return { ...plan, id: data.id }
}

// PUT — 수정
export const updatePlan = async (plan) => {
  const { data } = await client.put(`/posts/${plan.id}`, {
    id: plan.id,
    title: plan.memo,
    body: JSON.stringify(plan),
  })
  return { ...plan, id: data.id ?? plan.id }
}

// DELETE — 삭제
export const deletePlan = async (id) => {
  await client.delete(`/posts/${id}`)
  return id
}
