<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeToRefs } from 'pinia'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'
import SkeletonCard from './SkeletonCard.vue'
import BaseDashboardCard from './BaseDashboardCard.vue'
import OfflineBanner from './OfflineBanner.vue'
import { useConfigStore } from '@/stores/configStore'
import { useWeatherStore } from '@/stores/weatherStore'
import { useOnlineStatus } from '@/utils/network'
import { cityMatchesQuery } from '@/data/cityIndex'

const router = useRouter()
const config = useConfigStore()
const weather = useWeatherStore()
const { cards, myLocation, loading, locating, error, favorites, usingCache, history } =
  storeToRefs(weather)
const { isOnline } = useOnlineStatus()

/* ── 반응형 상태 ───────────────────────────────────────────────
   searchQuery : 검색 입력값 (SearchBar와 v-model로 양방향 연결)
   selectedCity: 카드 클릭으로 선택된 도시 — 해당 카드가 그 자리에서 상세를 펼친다
   statusText  : 선택 상태 문구 (스크린리더 안내 및 로그용)        */
const searchQuery = ref('')
const selectedCity = ref('')
const statusText = ref('')

const load = () => weather.loadDashboard(config.unit)

/**
 * 카드 바깥을 클릭하면 선택을 해제한다.
 * 카드 내부 클릭은 카드가 직접 처리하므로(선택/토글) 여기서 건너뛴다.
 * 별·삭제·상세 버튼은 @click.stop이라 이 핸들러까지 오지 않는다.
 */
const handleOutsideClick = (e) => {
  if (!selectedCity.value) return
  if (e.target.closest?.('.weather-card')) return
  selectedCity.value = ''
}

// Esc로도 선택을 풀 수 있게 한다 (키보드 사용자 배려)
const handleEscape = (e) => {
  if (e.key === 'Escape' && selectedCity.value) selectedCity.value = ''
}

onMounted(() => {
  load()
  window.addEventListener('skala:reload-weather', load)
  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('skala:reload-weather', load)
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleEscape)
})

// 단위가 바뀌면 대시보드를 다시 조회
watch(() => config.unit, load)

// 내 위치 카드를 목록 맨 앞에 붙인다
const displayCards = computed(() =>
  myLocation.value ? [{ ...myLocation.value, __badge: 'location' }, ...cards.value] : cards.value,
)

/* ── computed: 검색어로 목록 필터링 ───────────────────────────
   서버 조회(Enter)와 별개로, 이미 받아온 카드를 즉시 좁혀준다.
   즐겨찾기가 쌓였을 때 원하는 도시를 바로 찾기 위한 용도.       */
const filteredCards = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return displayCards.value
  // 카드의 도시명은 영문이지만 사용자는 한글로 칠 수 있어 양쪽으로 매칭한다
  return displayCards.value.filter((c) => cityMatchesQuery(c.city ?? '', q))
})

/* ── watch: 선택된 도시 변화 감시 ──────────────────────────────
   선택이 바뀔 때만 상태바 문구를 갱신하고 그 사실을 로그로 남긴다. */
watch(selectedCity, (city, prev) => {
  statusText.value = city ? `${city}이(가) 선택되었습니다.` : ''
  console.log(`[watch 감지] 선택 도시 변경: ${prev || '(없음)'} → ${city || '(없음)'}`)
  if (statusText.value) console.log(`[watch 감지] 상태바 문구 업데이트 -> "${statusText.value}"`)
})

/* ── watchEffect: 검색어 추적 ─────────────────────────────────
   의존하는 반응형 값(searchQuery, filteredCards)이 바뀔 때마다 자동 실행된다.
   watch와 달리 감시 대상을 따로 명시하지 않는 점이 차이.        */
watchEffect(() => {
  const q = searchQuery.value
  console.log(
    `[watchEffect 자동 호출] 현재 검색어 '${q}' — 목록에서 ${filteredCards.value.length}건 일치`,
  )
})

const handleSearch = async (city) => {
  try {
    const result = await weather.searchAndAdd(city, config.unit)
    // 검색 성공 시 필터를 해제한다.
    // API가 돌려주는 도시명이 입력과 다를 수 있어(예: 'Fukuoka' 요청 → 'Fukuoka-shi' 응답)
    // 필터가 남아 있으면 방금 추가된 카드가 오히려 가려진다.
    searchQuery.value = ''
    ElMessage.success({ message: `${result.city} 날씨를 불러왔습니다`, duration: 2000 })
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
    await ElMessageBox.confirm(`'${city}' 날씨 정보를 대시보드에서 제거할까요?`, '카드 삭제', {
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
      type: 'warning',
      draggable: true,
    })
    weather.removeCard(city)
    if (selectedCity.value === city) selectedCity.value = ''
    ElMessage.success({ message: '삭제되었습니다', duration: 1600 })
  } catch {
    // 사용자가 취소한 경우 — 별도 처리 없음
  }
}

const handleSelect = (city) => {
  selectedCity.value = selectedCity.value === city ? '' : city // 다시 누르면 선택 해제
}

const handleOpen = (city) => router.push({ name: 'weather-detail', params: { city } })

const clearSearch = () => (searchQuery.value = '')
</script>

<template>
  <section class="weather-parent">
    <!-- 검색 영역: BaseDashboardCard의 슬롯으로 주입 -->
    <BaseDashboardCard tone="bare" :padded="false">
      <template #header><span>도시 검색</span></template>
      <SearchBar
        v-model="searchQuery"
        :locating="locating"
        @search="handleSearch"
        @locate="handleLocate"
      />
    </BaseDashboardCard>

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

    <!-- 검색 중일 때 필터 상태 안내 -->
    <!-- 검색어가 있을 때의 안내 한 줄.
         목록에 없는 도시는 '없다'고 단정하지 않고 조회를 권한다 —
         아직 추가하지 않은 도시를 검색하는 중일 수 있기 때문. -->
    <p v-if="searchQuery.trim()" class="weather-parent__filter-info">
      <template v-if="filteredCards.length">
        내 도시에서 <strong>{{ filteredCards.length }}건</strong> 일치
      </template>
      <template v-else>
        내 도시에 <strong>'{{ searchQuery.trim() }}'</strong>이(가) 없습니다.
        <el-button
          type="primary"
          size="small"
          round
          :loading="loading"
          @click="handleSearch(searchQuery.trim())"
        >
          날씨 불러오기
        </el-button>
      </template>
      <button type="button" class="weather-parent__clear" @click="clearSearch">지우기</button>
    </p>

    <!-- 날씨 현황: 같은 카드 프레임을 슬롯으로 재사용 -->
    <BaseDashboardCard tone="bare" :padded="false">
      <template #header>
        <span>지역별 날씨 현황</span>
        <span class="weather-parent__count">{{ filteredCards.length }}개 도시</span>
      </template>
      <div class="weather-parent__grid">
        <template v-if="loading && !displayCards.length">
          <SkeletonCard v-for="n in 4" :key="n" height="168px" :lines="2" />
        </template>
        <template v-else>
          <WeatherCard
            v-for="item in filteredCards"
            :key="item.__badge === 'location' ? '__my_location' : item.city"
            :data="item"
            :badge="item.__badge ?? ''"
            :favorite="favorites.includes(item.city)"
            :selected="selectedCity === item.city"
            :removable="item.__badge !== 'location'"
            @toggle-favorite="weather.toggleFavorite"
            @remove="handleRemove"
            @select="handleSelect"
            @open="handleOpen"
          />
        </template>
      </div>
    </BaseDashboardCard>

    <!-- 선택 상태는 카드가 시각적으로 표현하고, 스크린리더에는 문구로 알린다 -->
    <span class="sr-only" role="status" aria-live="polite">{{ statusText }}</span>

    <!-- 검색어가 없는데 카드도 없을 때 -->
    <el-empty
      v-if="!loading && !displayCards.length && !searchQuery.trim()"
      description="표시할 날씨가 없습니다. 위에서 도시를 검색해보세요."
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
.weather-parent__filter-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.weather-parent__filter-info strong {
  color: var(--accent);
}
.weather-parent__count {
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--text-muted);
}
.weather-parent__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 16px;
  align-items: start; /* 카드가 펼쳐져도 같은 행의 다른 카드가 늘어나지 않도록 */
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
