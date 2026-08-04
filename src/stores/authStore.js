import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { hasAuthConfig, signInWithGoogle, signOut, watchAuth } from '@/api/firebase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // { uid, email, displayName, photoURL }
  const ready = ref(false) // 최초 상태 확인이 끝났는지
  const busy = ref(false)
  const error = ref('')

  const isSignedIn = computed(() => Boolean(user.value))
  const configured = hasAuthConfig()

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

  const logout = async () => {
    busy.value = true
    try {
      await signOut()
    } finally {
      busy.value = false
    }
  }

  return { user, ready, busy, error, isSignedIn, configured, login, logout }
})
