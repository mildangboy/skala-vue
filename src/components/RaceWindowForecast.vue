<script setup>
import { computed, ref, watch } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import { FORECAST_DAYS, describeWmo, fetchRaceWindow, summarize } from '@/api/raceWeather'
import { mockRaceWindow } from '@/api/mock'
import { timezoneOf } from '@/data/circuitTimezones'
import { utcOffsetLabel, zoneOffsetMinutes } from '@/utils/format'
import BaseDashboardCard from './BaseDashboardCard.vue'
import DemoDataNotice from './DemoDataNotice.vue'
import LocalTime from './LocalTime.vue'

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
// 데모로 물러난 사유. 빈 문자열이면 Open-Meteo 실측이다.
const demoReason = ref('')

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
    demoReason.value = ''
    if (res.status === 'ok') {
      hours.value = res.hours
      state.value = 'ok'
    } else {
      hours.value = []
      state.value = 'out-of-range'
    }
  } catch (err) {
    /**
     * 예보를 못 받으면 예전에는 안내만 남기고 칸을 통째로 비웠다.
     * 이 카드가 이 화면의 존재 이유에 가까운데(경기 중에 비가 오는가) 그 자리가
     * 비면 화면이 무엇을 하려던 것인지 알 수 없다. 그래서 데모로 채우고,
     * 실측이 아니라는 사실을 카드 머리와 아래 문구에 함께 밝힌다.
     */
    const demo = mockRaceWindow({ startAt: at, seedKey: race.circuitId ?? 'race' })
    if (demo) {
      hours.value = demo.hours
      daysAway.value = 0
      demoReason.value = err?.message ?? '실시간 예보 조회에 실패했습니다'
      state.value = 'ok'
    } else {
      state.value = 'error'
    }
  }
}

watch(() => [props.race?.circuitId, props.startAt?.getTime(), config.unit], load, {
  immediate: true,
})

const summary = computed(() => summarize(hours.value))

/** 강수확률 막대의 높이(%) — 0%도 아주 얕게 남겨 칸이 비지 않게 한다 */
const popHeight = (pop) => `${Math.max(pop ?? 0, 2)}%`

/** 서킷 현지 타임존. 표에 없으면 빈 값이고 내 시간만 나온다. */
const circuitTz = computed(() => timezoneOf(props.race?.circuitId) ?? '')

/**
 * 현지와 내 표준시가 실제로 다른지.
 *
 * 스즈카를 한국에서 볼 때처럼 시차가 없으면 같은 숫자를 두 번 쓰는 게 되므로
 * 두 줄로 늘리지 않는다. 오프셋은 날짜마다 달라질 수 있어(서머타임) 경기
 * 시각을 기준으로 잰다.
 */
const dual = computed(() => {
  const at = props.startAt
  if (!circuitTz.value || !at || Number.isNaN(at.getTime())) return false
  const there = zoneOffsetMinutes(at, circuitTz.value)
  return there !== null && there !== zoneOffsetMinutes(at, '')
})

/**
 * 칸마다 '현지'/'내 시간'을 되풀이하면 다섯 칸이 꼬리표로 덮인다.
 * 그래서 칸에는 숫자만 두고, 무엇이 무엇인지는 목록 위에 한 번만 적는다.
 */
const legend = computed(() => {
  const at = props.startAt
  if (!dual.value || !at) return null
  return {
    there: utcOffsetLabel(at, circuitTz.value),
    mine: utcOffsetLabel(at, ''),
  }
})

const tempUnit = computed(() => (config.unit === 'metric' ? '°C' : '°F'))
const windUnit = computed(() => (config.unit === 'metric' ? 'km/h' : 'mph'))

const waitDays = computed(() => Math.ceil(daysAway.value - FORECAST_DAYS))
</script>

<template>
  <!--
    source를 직접 넘기는 이유: 이 카드의 출처는 화면 전체와 다를 수 있다.
    서킷 현재 날씨는 실시간인데 시간대 예보만 실패하는 경우가 실제로 있다.
  -->
  <BaseDashboardCard :source="demoReason ? 'demo' : ''">
    <template #header="{ demo }">
      <span>레이스 시간대 예보</span>
      <span class="rw__src">
        <DemoDataNotice v-if="demo" variant="pill" :demo="true" />
        <template v-else>Open-Meteo · 1시간 간격</template>
      </span>
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
      <strong>{{ waitDays > 0 ? `${waitDays}일 뒤` : '곧' }}</strong> 이 자리에 시간대별 날씨가
      채워집니다.
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

      <p v-if="legend" class="rw__legend">
        <span><strong>위</strong> 서킷 현지 시각 · {{ legend.there }}</span>
        <span><strong>아래</strong> 내 시간 · {{ legend.mine }}</span>
      </p>

      <ul class="rw__hours">
        <li v-for="h in hours" :key="h.offset" :class="{ 'is-start': h.offset === 0 }">
          <LocalTime
            class="rw__time"
            :at="h.at"
            :time-zone="circuitTz"
            preset="time"
            stack
            :labels="false"
          />
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

      <p v-if="demoReason" class="rw__note rw__note--demo">
        실시간 API에 문제가 있어 Mock API의 데모 데이터를 표시하고 있습니다. 실제 예보가 아닙니다.
        (사유: {{ demoReason }})
      </p>

      <p class="rw__note">
        <template v-if="legend"
          >시각은 서킷 현지 기준으로 먼저 적고, 내 표준시를 아래에 함께 적습니다.</template
        >
        <template v-else>이 서킷은 내 표준시와 시차가 없습니다.</template>
        결승은 보통 2시간 안에 끝나지만, 중단이 있으면 최장 3시간까지 이어집니다.
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

/* 두 시각이 각각 무엇인지 한 번만 밝히는 줄 */
.rw__legend {
  margin: 0 0 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 11px;
  color: var(--text-muted);
}
.rw__legend strong {
  font-weight: 700;
  color: var(--text-secondary);
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
  align-items: center;
  line-height: 1.35;
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
.rw__note--demo {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-pill);
  background: rgba(230, 162, 60, 0.12);
  border: 1px solid rgba(230, 162, 60, 0.34);
  color: var(--text-secondary);
  font-size: 12px;
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
