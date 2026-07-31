<script setup>
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { searchCities } from '@/api/weather'

const emit = defineEmits(['search'])
const keyword = ref('')
const loadingSuggest = ref(false)

// el-autocomplete용 비동기 후보 조회 (도시 Geocoding API)
const fetchSuggestions = async (query, callback) => {
  if (!query?.trim()) {
    callback([])
    return
  }
  loadingSuggest.value = true
  try {
    const results = await searchCities(query)
    callback(results.map((r) => ({ value: r.label, name: r.name })))
  } catch {
    callback([])
  } finally {
    loadingSuggest.value = false
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
}
</script>

<template>
  <div class="search-bar">
    <el-autocomplete
      v-model="keyword"
      class="search-bar__input"
      size="large"
      placeholder="도시 이름으로 검색 (예: Seoul, Tokyo, Paris)"
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
    <el-button type="primary" size="large" class="search-bar__btn" @click="submit">검색</el-button>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 10px;
  width: 100%;
}
.search-bar__input {
  flex: 1;
}
.search-bar__btn {
  flex-shrink: 0;
}
</style>
