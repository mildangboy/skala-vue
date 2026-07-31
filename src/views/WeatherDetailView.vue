<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft, StarFilled, Star } from '@element-plus/icons-vue'
import { fetchCurrentWeatherByCity, fetchForecastByCity } from '@/api/weather'
import { formatTemp, formatWeekday, formatHour } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { useConfigStore } from '@/stores/configStore'
import { useWeatherStore } from '@/stores/weatherStore'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'

const route = useRoute()
const router = useRouter()
const config = useConfigStore()
const weatherStore = useWeatherStore()
const { favorites } = storeToRefs(weatherStore)

const current = ref(null)
const forecast = ref(null)
const loading = ref(false)
const error = ref('')

const cityParam = computed(() => route.params.city)
const isFav = computed(() => favorites.value.includes(current.value?.city))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetchCurrentWeatherByCity(cityParam.value, config.unit),
      fetchForecastByCity(cityParam.value, config.unit),
    ])
    current.value = currentRes
    forecast.value = forecastRes
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([cityParam, () => config.unit], load)
</script>

<template>
  <div class="detail-view">
    <el-button :icon="ArrowLeft" text @click="router.push('/')">홈으로</el-button>

    <el-alert v-if="error" :title="error" type="error" show-icon />

    <div v-loading="loading">
      <template v-if="current">
        <BaseDashboardCard class="detail-view__hero">
          <template #header>
            <h1>{{ current.city }}<small v-if="current.country">, {{ current.country }}</small></h1>
            <el-icon class="detail-view__fav" @click="weatherStore.toggleFavorite(current.city)">
              <StarFilled v-if="isFav" style="color: #f7b500" />
              <Star v-else />
            </el-icon>
          </template>
          <div class="detail-view__main">
            <span class="detail-view__icon">{{ iconEmoji(current.icon) }}</span>
            <div>
              <div class="detail-view__temp">{{ formatTemp(current.temp, config.unit) }}</div>
              <div class="detail-view__desc">{{ current.description }}</div>
            </div>
          </div>
          <div class="detail-view__stats">
            <div><span>체감</span><strong>{{ formatTemp(current.feelsLike, config.unit) }}</strong></div>
            <div><span>최고 / 최저</span><strong>{{ formatTemp(current.tempMax, config.unit) }} / {{ formatTemp(current.tempMin, config.unit) }}</strong></div>
            <div><span>습도</span><strong>{{ current.humidity }}%</strong></div>
            <div><span>바람</span><strong>{{ current.windSpeed }} m/s</strong></div>
          </div>
        </BaseDashboardCard>

        <BaseDashboardCard v-if="forecast?.hourly?.length">
          <template #header><h2>시간별 예보</h2></template>
          <div class="detail-view__hourly">
            <div v-for="h in forecast.hourly" :key="h.dt" class="detail-view__hour">
              <span>{{ formatHour(h.dt, forecast.timezone) }}</span>
              <span class="detail-view__hour-icon">{{ iconEmoji(h.icon) }}</span>
              <span>{{ formatTemp(h.temp, config.unit) }}</span>
            </div>
          </div>
        </BaseDashboardCard>

        <BaseDashboardCard v-if="forecast?.daily?.length">
          <template #header><h2>일별 예보</h2></template>
          <div class="detail-view__daily">
            <div v-for="d in forecast.daily" :key="d.day" class="detail-view__day">
              <span>{{ formatWeekday(d.dt, forecast.timezone) }}</span>
              <span class="detail-view__hour-icon">{{ iconEmoji(d.icon) }}</span>
              <span>{{ formatTemp(d.max, config.unit) }} / {{ formatTemp(d.min, config.unit) }}</span>
            </div>
          </div>
        </BaseDashboardCard>
      </template>
    </div>
  </div>
</template>

<style scoped>
.detail-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.detail-view__hero h1 {
  margin: 0;
  font-size: 22px;
}
.detail-view__hero h1 small {
  color: var(--text-muted);
  font-weight: 400;
  margin-left: 6px;
}
.detail-view__fav {
  cursor: pointer;
}
.detail-view__main {
  display: flex;
  align-items: center;
  gap: 18px;
}
.detail-view__icon {
  font-size: 64px;
}
.detail-view__temp {
  font-size: 44px;
  font-weight: 800;
}
.detail-view__desc {
  color: var(--text-muted);
  text-transform: capitalize;
}
.detail-view__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 14px;
  margin-top: 18px;
}
.detail-view__stats span {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
}
.detail-view__hourly,
.detail-view__daily {
  display: flex;
  overflow-x: auto;
  gap: 16px;
  padding-bottom: 4px;
}
.detail-view__daily {
  flex-direction: column;
  overflow-x: visible;
}
.detail-view__hour,
.detail-view__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 56px;
  font-size: 13px;
}
.detail-view__day {
  flex-direction: row;
  justify-content: space-between;
  min-width: 100%;
  padding: 6px 0;
  border-bottom: 1px solid var(--surface-border);
}
.detail-view__hour-icon {
  font-size: 20px;
}
</style>
