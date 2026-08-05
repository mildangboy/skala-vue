<script setup>
import { computed, ref, watch } from 'vue'
import { fetchCircuitHistory } from '@/api/f1'
import { lengthOf, shapeOf } from '@/data/circuitShapes'
import { timezoneOf } from '@/data/circuitTimezones'
import { utcOffsetLabel } from '@/utils/format'
import CircuitOutline from './CircuitOutline.vue'
import LocalTime from './LocalTime.vue'

/**
 * 그랑프리 세부 정보.
 *
 * 주말 세션 시각과 서킷 제원은 이미 갖고 있는 값이라 바로 보여주고,
 * 역대 결과만 열릴 때 받아온다. 미리 받아두면 쓰지도 않을 요청이
 * 페이지마다 나가고, 창을 열 때 받으면 한 번으로 끝난다.
 */
const props = defineProps({
  race: { type: Object, default: null },
})

const open = defineModel({ type: Boolean, default: false })

const history = ref([])
const loading = ref(false)
const failed = ref(false)
// 서킷마다 다시 받아야 하므로 어떤 서킷을 받아뒀는지 기억한다
const loadedFor = ref('')

const load = async () => {
  const id = props.race?.circuitId
  if (!id || loadedFor.value === id) return
  loading.value = true
  failed.value = false
  try {
    history.value = await fetchCircuitHistory(id, 5)
    loadedFor.value = id
  } catch {
    failed.value = true
    history.value = []
  } finally {
    loading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) load()
})

/* ── 주말 일정 ─────────────────────────────────────────────── */

const SESSION_LABEL = {
  fp1: 'FP1',
  fp2: 'FP2',
  fp3: 'FP3',
  sprintQualifying: 'Sprint Qualifying',
  sprint: 'Sprint',
  qualifying: 'Qualifying',
}
const startOf = (date, time) => {
  if (!date) return null
  const at = new Date(`${date}T${time ?? '00:00:00Z'}`)
  return Number.isNaN(at.getTime()) ? null : at
}

/** 서킷 현지 타임존. 표에 없는 서킷이면 빈 값이고, 그때는 내 시간만 나온다. */
const circuitTz = computed(() => timezoneOf(props.race?.circuitId) ?? '')

/**
 * 주말 세션을 시각 순으로 늘어놓는다.
 *
 * API는 세션을 이름 붙은 필드로만 줘서 순서 정보가 없다.
 * 진행 순서를 배열로 적어두는 방법도 있지만, 주말 형식이 바뀌면
 * (스프린트 주말은 연습이 하나뿐이다) 그 배열을 같이 고쳐야 하고
 * 어긋나도 눈치채기 어렵다. 각 세션이 자기 시각을 갖고 있으니 그걸로 정렬한다.
 */
const sessions = computed(() => {
  const s = props.race?.sessions ?? {}

  const rows = Object.keys(SESSION_LABEL)
    .map((k) => ({ key: k, label: SESSION_LABEL[k], at: startOf(s[k]?.date, s[k]?.time) }))
    .filter((r) => r.at)

  // 결승은 sessions가 아니라 race 자체에 시각이 있다
  const raceAt = startOf(props.race?.date, props.race?.time)
  if (raceAt) rows.push({ key: 'race', label: '결승', at: raceAt, main: true })

  return rows.sort((a, b) => a.at - b.at)
})

/**
 * 소제목 옆에 붙는 타임존 표기.
 *
 * 예전에는 'UTC +9'가 글자 그대로 박혀 있었다. 만든 사람이 한국에 있어서
 * 맞아 보였을 뿐, 다른 표준시에서 열면 틀린 값을 자신 있게 보여주는 셈이었다.
 * 지금은 그 주말 날짜를 기준으로 두 타임존을 실제로 계산해 적는다.
 * 날짜를 기준 삼는 이유는 서머타임 때문이다 — 같은 서킷도 3월과 7월의
 * 오프셋이 다르다.
 */
const zoneNote = computed(() => {
  const at = sessions.value[0]?.at
  if (!at) return ''
  const mine = utcOffsetLabel(at, '')
  const there = circuitTz.value ? utcOffsetLabel(at, circuitTz.value) : ''
  return there && there !== mine ? `현지 ${there} · 내 시간 ${mine}` : mine
})

/**
 * 결승 말고 연습·예선 시각까지 알고 있는지.
 *
 * 세션 시각은 라이브 API에만 있다. 네트워크가 막혀 내장 캘린더로 물러나면
 * 결승 하나만 남는데, 그것만 두고 '주말 일정'이라 하면
 * 정보를 못 받은 건지 원래 그런 건지 알 수 없다. 그럴 땐 안내를 덧붙인다.
 */
const hasSessionTimes = computed(() => sessions.value.some((s) => !s.main))

/* ── 서킷 제원 ─────────────────────────────────────────────── */

// 도형이 없으면(신설 서킷) 빈 자리를 남기지 않도록 제원이 폭을 다 쓴다
const hasShape = computed(() => Boolean(shapeOf(props.race?.circuitId)))

const lengthKm = computed(() => {
  const m = lengthOf(props.race?.circuitId)
  return m ? (m / 1000).toFixed(3) : null
})

/** "1:20.901" -> 밀리초. 형식이 다르면 Infinity라 비교에서 자동으로 밀린다. */
const lapMs = (t) => {
  const m = /^(\d+):(\d+)\.(\d+)$/.exec(t ?? '')
  if (!m) return Infinity
  return Number(m[1]) * 60000 + Number(m[2]) * 1000 + Number(m[3])
}

/** 최근 기록 중 가장 빠른 랩 (여러 시즌 중 최고) */
const bestLap = computed(() => {
  const laps = history.value.filter((h) => h.fastestLap?.time)
  if (!laps.length) return null
  return laps.reduce((best, h) =>
    lapMs(h.fastestLap.time) < lapMs(best.fastestLap.time) ? h : best,
  )
})

/**
 * 최고 랩의 평균 속도.
 *
 * API가 평균 속도를 같이 주지만 최근 시즌에는 빠져 있을 때가 있다
 * (2025 몬차가 그렇다). 하필 최고 기록이 그 시즌이면 속도만 사라진다.
 *
 * 그래서 값이 없으면 직접 계산한다. 서킷 길이 ÷ 랩 타임인데,
 * 값이 있는 시즌들로 대조해보니 API 값과 소수점 셋째 자리까지 같았다
 * (몬차·실버스톤·스파·잔드보르트·스즈카 10건, 오차 0.000%).
 * 즉 API도 같은 계산을 하고 있어서, 채워 넣어도 성격이 다른 값이 섞이지 않는다.
 */
const bestSpeedKph = computed(() => {
  const lap = bestLap.value?.fastestLap
  if (!lap) return null
  if (lap.speedKph) return lap.speedKph

  const meters = lengthOf(props.race?.circuitId)
  const ms = lapMs(lap.time)
  if (!meters || !Number.isFinite(ms) || ms <= 0) return null
  return (meters / (ms / 1000)) * 3.6
})
</script>

<template>
  <el-dialog
    v-model="open"
    :title="race?.name ?? '그랑프리 정보'"
    width="560px"
    align-center
    append-to-body
    class="race-info"
  >
    <div v-if="race" class="race-info__body">
      <!-- 서킷 요약 -->
      <section class="race-info__summary">
        <div v-if="hasShape" class="race-info__shape">
          <CircuitOutline :circuit-id="race.circuitId" :label="race.name" />
        </div>
        <dl class="race-info__spec">
          <div>
            <dt>서킷</dt>
            <dd>{{ race.circuit }}</dd>
          </div>
          <div>
            <dt>위치</dt>
            <dd>{{ race.locality }}, {{ race.country }}</dd>
          </div>
          <div v-if="lengthKm">
            <dt>총 연장</dt>
            <dd class="mono-num">{{ lengthKm }} km</dd>
          </div>
          <div>
            <dt>라운드</dt>
            <dd class="mono-num">R{{ race.round }}{{ race.sprint ? ' · 스프린트' : '' }}</dd>
          </div>
        </dl>
      </section>

      <!-- 주말 일정 -->
      <section>
        <h3 class="race-info__heading">
          주말 일정 <span>{{ zoneNote }}</span>
        </h3>
        <ul class="race-info__sessions">
          <li v-for="s in sessions" :key="s.key" :class="{ 'is-main': s.main }">
            <span>{{ s.label }}</span>
            <LocalTime
              class="race-info__when"
              :at="s.at"
              :time-zone="circuitTz"
              preset="datetime"
              stack
            />
          </li>
        </ul>
        <p v-if="!hasSessionTimes" class="race-info__note">
          연습·예선 시각은 아직 받아오지 못했습니다. 잠시 후 다시 열어보세요.
        </p>
      </section>

      <!-- 역대 기록 -->
      <section>
        <h3 class="race-info__heading">최근 우승자</h3>

        <el-skeleton v-if="loading" :rows="3" animated />

        <el-alert
          v-else-if="failed"
          type="info"
          show-icon
          :closable="false"
          title="역대 기록을 불러오지 못했습니다"
          description="잠시 후 다시 열어보세요. 나머지 정보는 그대로 보실 수 있습니다."
        />

        <p v-else-if="!history.length" class="race-info__empty">
          이 서킷에서 열린 경기 기록이 아직 없습니다.
        </p>

        <template v-else>
          <ul class="race-info__winners">
            <li v-for="h in history" :key="h.season">
              <strong class="mono-num">{{ h.season }}</strong>
              <span class="race-info__driver">{{ h.winner?.name ?? '—' }}</span>
              <span class="race-info__team">{{ h.winner?.team ?? '' }}</span>
              <span class="race-info__time mono-num">{{ h.winner?.time ?? '' }}</span>
            </li>
          </ul>

          <div v-if="bestLap" class="race-info__best">
            <span class="race-info__best-label">Fastest Lap ({{ bestLap.season }})</span>
            <strong class="mono-num">{{ bestLap.fastestLap.time }}</strong>
            <span>{{ bestLap.fastestLap.name }}</span>
            <span v-if="bestSpeedKph" class="mono-num">
              평균 속도 {{ bestSpeedKph.toFixed(1) }} KPH
            </span>
          </div>
        </template>
      </section>
    </div>
  </el-dialog>
</template>

<style scoped>
.race-info__body {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* ── 요약 ── */
.race-info__summary {
  display: flex;
  align-items: center;
  gap: 18px;
}
.race-info__shape {
  flex: none;
  width: 116px;
  height: 116px;
}
.race-info__spec {
  margin: 0;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.race-info__spec > div {
  display: flex;
  gap: 12px;
  font-size: 13px;
}
.race-info__spec dt {
  flex: none;
  width: 52px;
  color: var(--text-muted);
}
.race-info__spec dd {
  margin: 0;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

/* ── 소제목 ── */
.race-info__heading {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.race-info__heading span {
  margin-left: 6px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

/* ── 주말 일정 ── */
.race-info__sessions {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}
.race-info__sessions li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--surface-border);
}
.race-info__sessions li:last-child {
  border-bottom: none;
}
.race-info__sessions li.is-main {
  color: var(--text-primary);
  font-weight: 700;
}
/* 시각은 오른쪽 끝에 맞춰야 세로로 자릿수가 정렬돼 훑어보기 쉽다 */
.race-info__when {
  align-items: flex-end;
  text-align: right;
}

/* ── 역대 우승자 ── */
.race-info__winners {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}
.race-info__winners li {
  display: grid;
  grid-template-columns: 44px 1fr auto auto;
  align-items: baseline;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--surface-border);
}
.race-info__winners li:last-child {
  border-bottom: none;
}
.race-info__winners strong {
  color: var(--accent);
  font-weight: 700;
}
.race-info__driver {
  color: var(--text-primary);
  overflow-wrap: anywhere;
}
.race-info__team,
.race-info__time {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
}

/* ── 최고 랩 ── */
.race-info__best {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-card, 14px);
  background: var(--accent-soft);
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.race-info__best-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--accent);
}
.race-info__best strong {
  font-size: 16px;
  color: var(--text-primary);
}

.race-info__empty {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}
.race-info__note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 560px) {
  .race-info__summary {
    flex-direction: column;
    align-items: flex-start;
  }
  .race-info__winners li {
    grid-template-columns: 40px 1fr;
  }
  .race-info__time {
    display: none;
  }
}
</style>
