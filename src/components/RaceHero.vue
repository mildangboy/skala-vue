<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Timer, LocationInformation, TrendCharts, InfoFilled } from '@element-plus/icons-vue'
import { formatTemp } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { raceStartDate } from '@/data/f1Calendar2026'
import { shapeOf } from '@/data/circuitShapes'
import CircuitOutline from './CircuitOutline.vue'
import RaceInfoDialog from './RaceInfoDialog.vue'

const props = defineProps({
  race: { type: Object, default: null },
  weather: { type: Object, default: null },
  countdown: { type: Object, default: null },
  unit: { type: String, default: 'metric' },
})

const router = useRouter()

const infoOpen = ref(false)

// 도형이 없는 서킷(아직 OSM에 없는 신설 트랙)에서는 라벨까지 통째로 감춘다
const hasLayout = computed(() => Boolean(shapeOf(props.race?.circuitId)))

const raceLocalTime = computed(() => {
  if (!props.race) return ''
  return raceStartDate(props.race).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const pad = (n) => String(n ?? 0).padStart(2, '0')

const goDetail = () => {
  if (props.race)
    router.push({ name: 'circuit-detail', params: { circuitId: props.race.circuitId } })
}
</script>

<template>
  <section v-if="race" class="race-hero">
    <div class="race-hero__glow" aria-hidden="true" />

    <header class="race-hero__top">
      <span class="race-hero__badge">
        <span class="race-hero__badge-dot" />
        NEXT RACE · ROUND {{ race.round }}
      </span>
      <el-tag v-if="race.sprint" size="small" effect="dark" class="race-hero__sprint"
        >SPRINT</el-tag
      >
    </header>

    <div class="race-hero__body">
      <!-- 왼쪽: 제목 · 날씨 · 버튼 -->
      <div class="race-hero__main">
        <h1 class="race-hero__title">{{ race.name }}</h1>
        <p class="race-hero__circuit">
          <el-icon><LocationInformation /></el-icon>
          {{ race.circuit }} · {{ race.locality }}, {{ race.country }}
        </p>

        <!-- 서킷 현재 날씨 (Apple Weather 히어로 온도 표현) -->
        <div class="race-hero__weather">
          <template v-if="weather">
            <span class="race-hero__icon">{{ iconEmoji(weather.icon) }}</span>
            <div>
              <div class="race-hero__temp temp-display">{{ formatTemp(weather.temp, unit) }}</div>
              <div class="race-hero__desc">{{ weather.description }}</div>
            </div>
          </template>
          <div v-else class="race-hero__weather-empty">서킷 날씨 불러오는 중…</div>
        </div>
      </div>

      <!-- 오른쪽: 서킷 도형. 도형이 없으면 라벨까지 통째로 감춘다 -->
      <figure v-if="hasLayout" class="race-hero__layout">
        <figcaption>CIRCUIT LAYOUT</figcaption>
        <CircuitOutline :circuit-id="race.circuitId" :label="race.name" />
      </figure>
    </div>

    <footer class="race-hero__footer">
      <div class="race-hero__actions">
        <el-button type="primary" round :icon="TrendCharts" @click="goDetail">
          서킷 날씨 상세 보기
        </el-button>
        <el-button round text @click="router.push({ name: 'f1-calendar' })">시즌 캘린더</el-button>
        <el-button round text :icon="InfoFilled" @click="infoOpen = true">그랑프리 정보</el-button>
      </div>

      <!-- 레이스 카운트다운 -->
      <div class="race-hero__countdown">
        <div class="race-hero__countdown-label">
          <el-icon><Timer /></el-icon>
          레이스까지
        </div>
        <div v-if="countdown && !countdown.live" class="race-hero__clock mono-num">
          <div>
            <strong>{{ countdown.days }}</strong
            ><span>DAYS</span>
          </div>
          <div>
            <strong>{{ pad(countdown.hours) }}</strong
            ><span>HRS</span>
          </div>
          <div>
            <strong>{{ pad(countdown.minutes) }}</strong
            ><span>MIN</span>
          </div>
          <div>
            <strong>{{ pad(countdown.seconds) }}</strong
            ><span>SEC</span>
          </div>
        </div>
        <div v-else class="race-hero__live">LIGHTS OUT 🏁</div>
        <p class="race-hero__time">{{ raceLocalTime }} (내 시간대)</p>
      </div>
    </footer>
    <RaceInfoDialog v-model="infoOpen" :race="race" />
  </section>
</template>

<style scoped>
.race-hero {
  position: relative;
  overflow: hidden;
  padding: 28px 30px 26px;
  border-radius: var(--radius-card);
  border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
  background:
    linear-gradient(135deg, rgba(39, 244, 210, 0.16), transparent 52%),
    linear-gradient(200deg, rgba(10, 10, 10, 0.06), transparent 40%), var(--surface);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
  box-shadow: var(--surface-shadow);
}
.race-hero__glow {
  position: absolute;
  inset: -40% 45% 40% -20%;
  background: radial-gradient(circle, rgba(39, 244, 210, 0.32), transparent 68%);
  filter: blur(38px);
  pointer-events: none;
}
.race-hero__top {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}
.race-hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.race-hero__badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 70%, transparent);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  70% {
    box-shadow: 0 0 0 9px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}
.race-hero__sprint {
  --el-tag-bg-color: var(--accent);
  --el-tag-border-color: var(--accent);
  color: #04120f;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.race-hero__title {
  position: relative;
  margin: 12px 0 4px;
  font-size: clamp(26px, 4vw, 40px);
  font-weight: 700;
  letter-spacing: -0.03em;
}
.race-hero__circuit {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}
.race-hero__body {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-top: 14px;
}
.race-hero__weather {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 22px;
}
/*
 * 왼쪽에 제목·위치·날씨를 쌓고, 오른쪽 남는 자리를 서킷 모양이 통째로 쓴다.
 * 카운트다운을 아래 버튼 줄로 내려 이 공간을 비워둔 덕에
 * 도형을 알아볼 수 있는 크기로 키울 수 있다.
 */
.race-hero__main {
  min-width: 0;
  flex: 1 1 300px;
}
.race-hero__layout {
  margin: 0;
  flex: 0 1 240px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.race-hero__layout figcaption {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--text-muted);
  white-space: nowrap;
}
.race-hero__layout :deep(.circuit-outline) {
  height: 168px;
}
.race-hero__icon {
  font-size: 58px;
  line-height: 1;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.18));
}
.race-hero__temp {
  font-size: clamp(46px, 7vw, 68px);
  line-height: 1;
  color: var(--hero-text);
}
.race-hero__desc {
  margin-top: 4px;
  color: var(--hero-sub);
  text-transform: capitalize;
  font-size: 15px;
}
.race-hero__weather-empty {
  color: var(--text-muted);
  font-size: 14px;
}
.race-hero__countdown {
  text-align: right;
}
.race-hero__countdown-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  text-transform: uppercase;
}
.race-hero__clock {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  justify-content: flex-end;
}
.race-hero__clock div {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 46px;
  padding: 8px 6px;
  border-radius: 12px;
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
}
.race-hero__clock strong {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text-primary);
}
.race-hero__clock span {
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  font-weight: 700;
}
.race-hero__live {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 800;
  color: var(--accent);
}
.race-hero__time {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
/* 버튼과 카운트다운을 한 줄에 둔다 (요청: 카운트다운을 버튼 높이에 맞춰 내림) */
.race-hero__footer {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-top: 22px;
  flex-wrap: wrap;
}
.race-hero__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .race-hero {
    padding: 22px 20px;
  }
  .race-hero__body {
    flex-direction: column;
    align-items: flex-start;
  }
  .race-hero__countdown {
    text-align: left;
    width: 100%;
  }
  .race-hero__clock {
    justify-content: flex-start;
  }
  /* 좁은 화면에서는 제목이 우선이다 */
  .race-hero__layout {
    display: none;
  }
}
</style>
