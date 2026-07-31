import { onMounted, onUnmounted, ref } from 'vue'

/** 브라우저 온라인/오프라인 상태를 추적하는 컴포저블 */
export const useOnlineStatus = () => {
  const isOnline = ref(navigator.onLine)

  const goOnline = () => (isOnline.value = true)
  const goOffline = () => (isOnline.value = false)

  onMounted(() => {
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', goOnline)
    window.removeEventListener('offline', goOffline)
  })

  return { isOnline }
}
