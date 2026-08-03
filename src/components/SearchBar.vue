<script setup>
import { nextTick, ref } from 'vue'
import { Search, Position } from '@element-plus/icons-vue'
import { searchCities } from '@/api/weather'

const props = defineProps({
  locating: { type: Boolean, default: false },
})
const emit = defineEmits(['search', 'locate'])

// 검색어는 부모(WeatherParent)가 목록 필터링에도 쓰므로 v-model로 끌어올린다
const keyword = defineModel({ type: String, default: '' })

const autocompleteRef = ref(null)

/**
 * 후보 목록을 닫는다.
 *
 * el-autocomplete의 close()는 activated 플래그만 내리는데, Enter 키는 내부
 * handleKeyEnter가 다시 activated = true로 올리고 후보를 재조회한다. 그래서
 * close()만으로는 Enter 직후 목록이 남는다.
 * 표시 조건이 `suggestions.length > 0 && activated`이므로, 노출된 suggestions를
 * 직접 비워 확실히 닫는다. (내부 재조회가 끝난 뒤 실행되도록 다음 틱에 처리)
 */
const closeSuggestions = () => {
  const ac = autocompleteRef.value
  if (!ac) return
  ac.close?.()
  nextTick(() => {
    ac.close?.()
    if (ac.suggestions) ac.suggestions.length = 0
    if (ac.highlightedIndex !== undefined) ac.highlightedIndex = -1
  })
}

// el-autocomplete 비동기 후보 조회 (OpenWeatherMap Geocoding API)
const fetchSuggestions = async (query, callback) => {
  if (!query?.trim()) {
    callback([])
    return
  }
  try {
    const results = await searchCities(query)
    callback(results.map((r) => ({ value: r.label, name: r.name })))
  } catch {
    callback([])
  }
}

/**
 * 자동완성 항목 선택.
 * keyword에 쓴 뒤 submit()으로 되읽으면 안 된다 — defineModel은 부모로 이벤트를
 * 보내고 prop으로 돌아오는 왕복 구조라, 같은 틱에서는 아직 이전 값이 읽힌다.
 * ('Fukuoka'를 골라도 직전에 입력한 'Fuku'로 조회되던 원인)
 * 선택한 값을 그대로 전달한다.
 */
const handleSelect = (item) => {
  const city = (item.name ?? item.value ?? '').trim()
  if (!city) return
  keyword.value = city // 입력창 표시용
  closeSuggestions()
  emit('search', city) // 조회는 모델 왕복을 기다리지 않고 직접 전달
}

const submit = () => {
  const city = keyword.value.trim()
  if (!city) return
  closeSuggestions()
  emit('search', city)
}
</script>

<template>
  <div class="search-bar">
    <el-autocomplete
      ref="autocompleteRef"
      v-model="keyword"
      class="search-bar__input"
      size="large"
      placeholder="도시 검색 (예: Seoul, Monza, Suzuka)"
      :fetch-suggestions="fetchSuggestions"
      :trigger-on-focus="false"
      clearable
      @select="handleSelect"
      @keyup.enter="submit"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-autocomplete>

    <el-button
      class="search-bar__locate"
      size="large"
      circle
      :icon="Position"
      :loading="props.locating"
      title="내 위치 날씨 보기"
      aria-label="내 위치 날씨 보기"
      @click="emit('locate')"
    />
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 10px;
  align-items: center;
}
.search-bar__input {
  flex: 1;
}
.search-bar__input :deep(.el-input__wrapper) {
  border-radius: var(--radius-pill);
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--surface-border) inset;
  backdrop-filter: var(--blur-glass);
}
.search-bar__input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px var(--accent) inset;
}
.search-bar__input :deep(.el-input__inner) {
  color: var(--text-primary);
}
.search-bar__locate {
  flex-shrink: 0;
  background: var(--surface);
  border-color: var(--surface-border);
  color: var(--accent);
}
.search-bar__locate:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
</style>
