<script setup>
import { ref } from 'vue'
import { Search, Position } from '@element-plus/icons-vue'
import { searchCities } from '@/api/weather'

const props = defineProps({
  locating: { type: Boolean, default: false },
})
const emit = defineEmits(['search', 'locate'])

const keyword = ref('')

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

const handleSelect = (item) => {
  keyword.value = item.name ?? item.value
  submit()
}

const submit = () => {
  const city = keyword.value.trim()
  if (!city) return
  emit('search', city)
  keyword.value = ''
}
</script>

<template>
  <div class="search-bar">
    <el-autocomplete
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
