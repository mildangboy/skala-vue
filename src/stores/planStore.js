import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createPlan, deletePlan, fetchPlans, updatePlan } from '@/api/plans'

const STORAGE_KEY = 'skala-vue:plans'

const readLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const persist = (plans) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
  } catch {
    // 저장 실패는 무시 (연습용 데이터)
  }
}

export const usePlanStore = defineStore('plan', () => {
  const plans = ref(readLocal() ?? [])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  const total = computed(() => plans.value.length)
  const totalPeople = computed(() => plans.value.reduce((sum, p) => sum + (p.people ?? 0), 0))
  const avgExcitement = computed(() =>
    plans.value.length
      ? Math.round(
          (plans.value.reduce((s, p) => s + (p.excitement ?? 0), 0) / plans.value.length) * 10,
        ) / 10
      : 0,
  )
  const notifyCount = computed(() => plans.value.filter((p) => p.notify).length)

  const loadInitial = async () => {
    if (plans.value.length) return // 로컬에 이미 있으면 서버 샘플을 덮어쓰지 않는다
    loading.value = true
    error.value = ''
    try {
      plans.value = await fetchPlans(3)
      persist(plans.value)
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /** POST — 낙관적 추가 후 실패하면 되돌린다 */
  const add = async (draft) => {
    saving.value = true
    error.value = ''
    const tempId = `temp-${Date.now()}`
    const optimistic = { ...draft, id: tempId, pending: true }
    plans.value = [optimistic, ...plans.value]
    try {
      const saved = await createPlan(draft)
      plans.value = plans.value.map((p) => (p.id === tempId ? { ...saved, pending: false } : p))
      persist(plans.value)
      return saved
    } catch (err) {
      plans.value = plans.value.filter((p) => p.id !== tempId) // 롤백
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  /** PUT — 이전 값을 보관했다가 실패 시 복원 */
  const edit = async (draft) => {
    saving.value = true
    error.value = ''
    const before = plans.value.find((p) => p.id === draft.id)
    plans.value = plans.value.map((p) => (p.id === draft.id ? { ...draft, pending: true } : p))
    try {
      const saved = await updatePlan(draft)
      plans.value = plans.value.map((p) => (p.id === draft.id ? { ...saved, pending: false } : p))
      persist(plans.value)
      return saved
    } catch (err) {
      if (before) plans.value = plans.value.map((p) => (p.id === draft.id ? before : p)) // 롤백
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  /** DELETE — 먼저 화면에서 제거하고 실패하면 원래 자리에 되돌린다 */
  const remove = async (id) => {
    error.value = ''
    const index = plans.value.findIndex((p) => p.id === id)
    const before = plans.value[index]
    plans.value = plans.value.filter((p) => p.id !== id)
    try {
      await deletePlan(id)
      persist(plans.value)
    } catch (err) {
      if (before) {
        const restored = [...plans.value]
        restored.splice(index, 0, before) // 원래 순서로 복원
        plans.value = restored
      }
      error.value = err.message
      throw err
    }
  }

  return {
    plans,
    loading,
    saving,
    error,
    total,
    totalPeople,
    avgExcitement,
    notifyCount,
    loadInitial,
    add,
    edit,
    remove,
  }
})
