import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  completeButtonSignIn,
  hasAuthConfig,
  renderGoogleButton,
  signInWithGoogle,
  signOut,
  watchAuth,
} from '@/api/firebase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // { uid, email, displayName, photoURL }
  const ready = ref(false) // 최초 상태 확인이 끝났는지
  const busy = ref(false)
  const error = ref('')

  const isSignedIn = computed(() => Boolean(user.value))

  // computed로 둬야 하는 이유:
  // storeToRefs는 ref/computed만 골라내고 일반 값은 버린다.
  // boolean으로 두면 화면 쪽 storeToRefs 결과에서 undefined가 되어
  // 설정이 있어도 "설정 안 됨"으로 보이고, .value를 읽는 순간 터진다.
  const configured = computed(() => hasAuthConfig())

  // 새로고침해도 로그인 상태가 유지되도록 구독해 둔다
  watchAuth((fbUser) => {
    user.value = fbUser
      ? {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        }
      : null
    ready.value = true
  })

  const login = async () => {
    busy.value = true
    error.value = ''
    try {
      await signInWithGoogle()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      busy.value = false
    }
  }

  /**
   * 구글 공식 버튼을 그리고, 눌렀을 때 들어오는 로그인을 처리한다.
   * 반환 프라미스는 로그인이 끝나야 풀리므로 화면 쪽에서 결과를 알릴 수 있다.
   */
  const mountGoogleButton = async (container) => {
    error.value = ''
    await renderGoogleButton(container)
    try {
      await completeButtonSignIn()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const logout = async () => {
    busy.value = true
    try {
      await signOut()
    } finally {
      busy.value = false
    }
  }

  return {
    user,
    ready,
    busy,
    error,
    isSignedIn,
    configured,
    login,
    logout,
    mountGoogleButton,
  }
})
