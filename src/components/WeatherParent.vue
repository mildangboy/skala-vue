<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeToRefs } from 'pinia'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'
import SkeletonCard from './SkeletonCard.vue'
import OfflineBanner from './OfflineBanner.vue'
import { useConfigStore } from '@/stores/configStore'
import { useWeatherStore } from '@/stores/weatherStore'
import { useOnlineStatus } from '@/utils/network'

const router = useRouter()
const config = useConfigStore()
const weather = useWeatherStore()
const { cards, myLocation, loading, locating, error, favorites, usingCache, history } =
  storeToRefs(weather)
const { isOnline } = useOnlineStatus()

const load = () => weather.loadDashboard(config.unit)

onMounted(() => {
  load()
  window.addEventListener('skala:reload-weather', load)
})
onBeforeUnmount(() => window.removeEventListener('skala:reload-weather', load))

// 단위가 바뀌면 대시보드를 다시 조회
watch(() => config.unit, load)

const displayCards = computed(() =>
  myLocation.value ? [{ ...myLocation.value, __badge: 'location' }, ...cards.value] : cards.value,
)

const handleSearch = async (city) => {
  try {
    await weather.searchAndAdd(city, config.unit)
    ElMessage.success({ message: `${city} 날씨를 불러왔습니다`, duration: 2000 })
  } catch (err) {
    ElMessage.error(err.message)
  }
}

const handleLocate = async () => {
  try {
    const result = await weather.loadMyLocation(config.unit)
    ElMessage.success({ message: `현재 위치: ${result.city}`, duration: 2000 })
  } catch (err) {
    ElMessage.warning(err.message)
  }
}

// ElMessageBox로 삭제 전 확인 (교재 Feedback 컴포넌트 활용)
const handleRemove = async (city) => {
  try {
    await ElMessageBox.confirm(`'${city}' 카드를 대시보드에서 제거할까요?`, '카드 삭제', {
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
      type: 'warning',
      draggable: true,
    })
    weather.removeCard(city)
    ElMessage.success({ message: '삭제되었습니다', duration: 1600 })
  } catch {
    // 사용자가 취소한 경우 — 별도 처리 없음
  }
}

const handleOpen = (city) => router.push({ name: 'weather-detail', params: { city } })
</script>

<template>
  <section class="weather-parent">
    <SearchBar :locating="locating" @search="handleSearch" @locate="handleLocate" />

    <OfflineBanner :offline="!isOnline" :stale="usingCache" />

    <div v-if="history.length" class="weather-parent__history">
      <span class="weather-parent__history-label">최근 검색</span>
      <el-tag
        v-for="city in history"
        :key="city"
        class="weather-parent__chip"
        size="small"
        round
        @click="handleSearch(city)"
      >
        {{ city }}
      </el-tag>
      <button type="button" class="weather-parent__clear" @click="weather.clearHistory()">
        지우기
      </button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />

    <div class="weather-parent__grid">
      <template v-if="loading && !displayCards.length">
        <SkeletonCard v-for="n in 4" :key="n" height="168px" :lines="2" />
      </template>
      <template v-else>
        <WeatherCard
          v-for="item in displayCards"
          :key="item.__badge === 'location' ? '__my_location' : item.city"
          :data="item"
          :badge="item.__badge ?? ''"
          :favorite="favorites.includes(item.city)"
          :removable="item.__badge !== 'location'"
          @toggle-favorite="weather.toggleFavorite"
          @remove="handleRemove"
          @open="handleOpen"
        />
      </template>
    </div>

    <el-empty
      v-if="!loading && !displayCards.length"
      description="표시할 날씨가 없습니다. 도시를 검색해보세요."
    />
  </section>
</template>

<style scoped>
.weather-parent {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.weather-parent__history {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.weather-parent__history-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-right: 2px;
}
.weather-parent__chip {
  cursor: pointer;
  --el-tag-bg-color: var(--surface);
  --el-tag-border-color: var(--surface-border);
  --el-tag-text-color: var(--text-secondary);
}
.weather-parent__chip:hover {
  --el-tag-bg-color: var(--accent-soft);
  --el-tag-text-color: var(--accent);
}
.weather-parent__clear {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
}
.weather-parent__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 16px;
}
</style>
