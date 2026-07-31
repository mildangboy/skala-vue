import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'skala-vue:theme'
const MODES = ['system', 'light', 'dark']

// OS 다크모드 설정을 구독하는 MediaQueryList
const media = window.matchMedia('(prefers-color-scheme: dark)')

export const useThemeStore = defineStore('theme', () => {
  // 'system' | 'light' | 'dark'
  const mode = ref(
    MODES.includes(localStorage.getItem(STORAGE_KEY))
      ? localStorage.getItem(STORAGE_KEY)
      : 'system',
  )
  const systemPrefersDark = ref(media.matches)

  const isDark = computed(() =>
    mode.value === 'system' ? systemPrefersDark.value : mode.value === 'dark',
  )

  const applyToDocument = () => {
    document.documentElement.classList.toggle('dark', isDark.value)
    document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
  }

  const setMode = (next) => {
    if (MODES.includes(next)) mode.value = next
  }

  const toggle = () => setMode(isDark.value ? 'light' : 'dark')

  // OS 설정 변경 실시간 반영
  media.addEventListener('change', (e) => {
    systemPrefersDark.value = e.matches
  })

  watch(mode, (value) => localStorage.setItem(STORAGE_KEY, value))
  watch(isDark, applyToDocument, { immediate: true })

  return { mode, isDark, setMode, toggle }
})
