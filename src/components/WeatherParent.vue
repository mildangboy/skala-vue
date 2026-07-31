<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'
import { useConfigStore } from '@/stores/configStore'
import { useWeatherStore } from '@/stores/weatherStore'

const router = useRouter()
const config = useConfigStore()
const weather = useWeatherStore()
const { cards, loading, error, favorites } = storeToRefs(weather)

const load = () => weather.loadDashboard(config.unit)

onMounted(load)
// 단위(섭씨/화씨)가 바뀌면 대시보드 전체를 다시 불러온다
watch(() => config.unit, load)

const handleSearch = async (city) => {
  try {
    await weather.searchAndAdd(city, config.unit)
    ElMessage.success(`${city} 날씨를 불러왔습니다`)
  } catch (err) {
    ElMessage.error(err.message)
  }
}

const handleToggleFavorite = (city) => weather.toggleFavorite(city)
const handleOpen = (city) => router.push({ name: 'weather-detail', params: { city } })
</script>

<template>
  <section class="weather-parent">
    <SearchBar @search="handleSearch" />

    <el-alert v-if="error" :title="error" type="error" show-icon class="weather-parent__alert" />

    <div v-loading="loading" class="weather-parent__grid">
      <WeatherCard
        v-for="item in cards"
        :key="item.city"
        :data="item"
        :favorite="favorites.includes(item.city)"
        @toggle-favorite="handleToggleFavorite"
        @open="handleOpen"
      />
      <el-empty v-if="!loading && !cards.length" description="표시할 날씨 정보가 없습니다" />
    </div>
  </section>
</template>

<style scoped>
.weather-parent {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.weather-parent__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
  min-height: 120px;
}
</style>
