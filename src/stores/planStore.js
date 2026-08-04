import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createPlan, deletePlan, fetchPlans, hasFirestoreConfig, updatePlan } from '@/api/plans'
import { useAuthStore } from './authStore'

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
  const auth = useAuthStore()
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

  // Firestore 설정이 없으면 로컬 저장만으로 동작한다 (알림 발송은 불가)
  const offline = !hasFirestoreConfig()

  const loadInitial = async () => {
    if (offline) {
      error.value = 'Firestore가 설정되지 않아 이 기기에만 저장됩니다. (functions/README.md 참고)'
      return
    }
    if (!auth.isSignedIn) {
      plans.value = []
      return
    }
    loading.value = true
    error.value = ''
    try {
      plans.value = await fetchPlans(auth.user.uid)
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
    // 소유자와 이메일은 로그인 계정 기준으로 채운다.
    // 보안 규칙이 이 두 값을 토큰과 대조하므로 임의 값은 거부된다.
    const owned = {
      ...draft,
      ownerUid: auth.user?.uid ?? '',
      email: auth.user?.email ?? draft.email,
    }
    const tempId = `temp-${Date.now()}`
    const optimistic = { ...owned, id: tempId, pending: true }
    plans.value = [optimistic, ...plans.value]
    if (offline) {
      plans.value = plans.value.map((p) =>
        p.id === tempId ? { ...optimistic, pending: false } : p,
      )
      persist(plans.value)
      saving.value = false
      return optimistic
    }
    try {
      const saved = await createPlan(owned)
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
    const owned = {
      ...draft,
      ownerUid: auth.user?.uid ?? '',
      email: auth.user?.email ?? draft.email,
    }
    const before = plans.value.find((p) => p.id === draft.id)
    plans.value = plans.value.map((p) => (p.id === draft.id ? { ...owned, pending: true } : p))
    try {
      const saved = await updatePlan(owned)
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
