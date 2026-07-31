import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'skala-vue:unit'

export const useConfigStore = defineStore('config', () => {
  // 'metric'(섭씨) | 'imperial'(화씨) — 새로고침해도 유지되도록 localStorage에서 복원
  const unit = ref(localStorage.getItem(STORAGE_KEY) ?? 'metric')

  const unitSymbol = computed(() => (unit.value === 'metric' ? '°C' : '°F'))
  const isMetric = computed(() => unit.value === 'metric')

  const toggleUnit = () => {
    unit.value = unit.value === 'metric' ? 'imperial' : 'metric'
  }

  const setUnit = (next) => {
    if (next === 'metric' || next === 'imperial') unit.value = next
  }

  watch(unit, (value) => localStorage.setItem(STORAGE_KEY, value))

  return { unit, unitSymbol, isMetric, toggleUnit, setUnit }
})
