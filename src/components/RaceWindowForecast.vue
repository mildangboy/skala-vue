<script setup>
import { computed, ref, watch } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import {
  FORECAST_DAYS,
  describeWmo,
  fetchRaceWindow,
  summarize,
} from '@/api/raceWeather'
import BaseDashboardCard from './BaseDashboardCard.vue'

/**
 * 경기 시작 전후 시간대의 날씨.
 *
 * "지금 서킷 날씨"만으로는 관전자가 궁금한 것에 답하지 못한다.
 * 알고 싶은 건 경기가 열리는 그 두 시간에 비가 오느냐다.
 */
const props = defineProps({
  race: { type: Object, default: null },
  startAt: { type: Date, default: null },
})

const config = useConfigStore()

const state = ref('idle') // idle | loading | ok | out-of-range | error
const hours = ref([])
const daysAway = ref(0)

const load = async () => {
  const race = props.race
  const at = props.startAt
  if (!race || !at || Number.isNaN(at.getTime())) return

  state.value = 'loading'
  try {
    const res = await fetchRaceWindow({
      lat: race.lat,
      lon: race.lon,
      startAt: at,
      unit: config.unit,
    })
    daysAway.value = res.daysAway
    if (res.status === 'ok') {
      hours.value = res.hours
      state.value = 'ok'
    } else {
      hours.value = []
      state.value = 'out-of-range'
    }
  } catch {
    state.value = 'error'
  }
}

watch(
  () => [props.race?.circuitId, props.startAt?.getTime(), config.unit],
  load,
  { immediate: true },
)

const summary = computed(() => summarize(hours.value))

/** 강수확률 막대의 높이(%) — 0%도 아주 얕게 남겨 칸이 비지 않게 한다 */
const popHeight = (pop) => `${Math.max(pop ?? 0, 2)}%`

const timeLabel = (at) =>
  at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

const tempUnit = computed(() => (config.unit === 'metric' ? '°C' : '°F'))
const windUnit = computed(() => (config.unit === 'metric' ? 'km/h' : 'mph'))

const waitDays = computed(() => Math.ceil(daysAway.value - FORECAST_DAYS))
</script>

<template>
  <BaseDashboardCard>
    <template #header>
      <span>레이스 시간대 예보</span>
      <span class="rw__src">Open-Meteo · 1시간 간격</span>
    </template>

    <el-skeleton v-if="state === 'loading'" :rows="3" animated />

    <el-alert
      v-else-if="state === 'error'"
      type="info"
      show-icon
      :closable="false"
      title="레이스 시간대 예보를 불러오지 못했습니다"
      description="아래 현재 날씨와 예보는 그대로 보실 수 있습니다."
    />

    <!-- 아직 예보가 닿지 않는 시점 -->
    <p v-else-if="state === 'out-of-range'" class="rw__pending">
      경기까지 <strong>{{ Math.ceil(daysAway) }}일</strong> 남았습니다. 예보는 경기
      {{ FORECAST_DAYS }}일 전부터 나오므로,
      <strong>{{ waitDays > 0 ? `${waitDays}일 뒤` : '곧' }}</strong> 이 자리에
      시간대별 날씨가 채워집니다.
    </p>

    <template v-else-if="state === 'ok'">
      <p v-if="summary" class="rw__verdict" :class="`rw__verdict--${summary.level}`">
        <strong>{{ summary.text }}</strong>
        <span>
          경기 중 최대 강수확률 {{ summary.maxPop }}%<template v-if="summary.totalMm > 0">
            · 예상 강수량 {{ summary.totalMm }}mm</template
          >
        </span>
      </p>

      <ul class="rw__hours">
        <li v-for="h in hours" :key="h.offset" :class="{ 'is-start': h.offset === 0 }">
          <span class="rw__time mono-num">{{ timeLabel(h.at) }}</span>
          <span class="rw__tag">{{
            h.offset === 0 ? '스타트' : h.offset < 0 ? `${h.offset}h` : `+${h.offset}h`
          }}</span>

          <span class="rw__icon" :title="describeWmo(h.code).text">{{
            describeWmo(h.code).icon
          }}</span>

          <span class="rw__pop-track" :aria-label="`강수확률 ${h.pop}%`">
            <span class="rw__pop-fill" :style="{ height: popHeight(h.pop) }" />
          </span>
          <span class="rw__pop mono-num">{{ h.pop }}%</span>

          <span class="rw__temp mono-num">{{ Math.round(h.temp) }}{{ tempUnit }}</span>
          <span class="rw__wind mono-num">{{ Math.round(h.wind) }} {{ windUnit }}</span>
        </li>
      </ul>

      <p class="rw__note">
        시각은 서킷 현지 기준이 아니라 브라우저 표준시로 표시됩니다. 결승은 보통 2시간
        안에 끝나지만, 중단이 있으면 최장 3시간까지 이어집니다.
      </p>
    </template>
  </BaseDashboardCard>
</template>

<style scoped>
.rw__src {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: none;
  letter-spacing: 0;
}

.rw__pending {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.rw__pending strong {
  color: var(--text-primary);
}

/* 판정 한 줄 */
.rw__verdict {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: var(--radius-card, 14px);
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: var(--surface);
  border-left: 3px solid var(--text-muted);
}
.rw__verdict strong {
  font-size: 14px;
  color: var(--text-primary);
}
.rw__verdict span {
  font-size: 12px;
  color: var(--text-muted);
}
/* 색만으로 뜻을 전하지 않도록 문구가 판정을 그대로 말한다 */
.rw__verdict--dry {
  border-left-color: var(--accent);
}
.rw__verdict--low {
  border-left-color: #6c98ff;
}
.rw__verdict--mid {
  border-left-color: #e6a23c;
}
.rw__verdict--high {
  border-left-color: #f56c6c;
}

/* 시간대 */
.rw__hours {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  gap: 8px;
}
.rw__hours li {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border-radius: var(--radius-card, 14px);
  background: var(--surface);
  border: 1px solid transparent;
}
.rw__hours li.is-start {
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  background: var(--accent-soft);
}
.rw__time {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}
.rw__tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.rw__hours li.is-start .rw__tag {
  color: var(--accent);
}
.rw__icon {
  font-size: 20px;
  line-height: 1;
}
.rw__pop-track {
  width: 8px;
  height: 36px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--text-muted) 18%, transparent);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.rw__pop-fill {
  width: 100%;
  border-radius: 4px;
  background: linear-gradient(180deg, #6c98ff, #1868db);
}
.rw__pop {
  font-size: 11px;
  color: var(--text-secondary);
}
.rw__temp {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.rw__wind {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}

.rw__note {
  margin: 14px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted);
}

@media (max-width: 560px) {
  .rw__hours {
    gap: 5px;
  }
  .rw__hours li {
    padding: 10px 3px;
  }
  .rw__wind {
    display: none;
  }
}
</style>
