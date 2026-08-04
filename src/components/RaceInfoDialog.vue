<script setup>
import { computed, ref, watch } from 'vue'
import { fetchCircuitHistory } from '@/api/f1'
import { lengthOf, shapeOf } from '@/data/circuitShapes'
import CircuitOutline from './CircuitOutline.vue'

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
  fp1: '연습 1',
  fp2: '연습 2',
  fp3: '연습 3',
  sprintQualifying: '스프린트 예선',
  sprint: '스프린트',
  qualifying: '예선',
}
// 실제 주말 진행 순서
const SESSION_ORDER = ['fp1', 'sprintQualifying', 'fp2', 'sprint', 'fp3', 'qualifying']

const fmtDateTime = (date, time) => {
  if (!date) return ''
  const at = new Date(`${date}T${time ?? '00:00:00Z'}`)
  if (Number.isNaN(at.getTime())) return ''
  return at.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const sessions = computed(() => {
  const s = props.race?.sessions ?? {}
  const rows = SESSION_ORDER.filter((k) => s[k]?.date).map((k) => ({
    key: k,
    label: SESSION_LABEL[k],
    when: fmtDateTime(s[k].date, s[k].time),
  }))
  // 결승은 항상 마지막에, 강조해서
  if (props.race?.date) {
    rows.push({
      key: 'race',
      label: '결승',
      when: fmtDateTime(props.race.date, props.race.time),
      main: true,
    })
  }
  return rows
})

/* ── 서킷 제원 ─────────────────────────────────────────────── */

// 도형이 없으면(신설 서킷) 빈 자리를 남기지 않도록 제원이 폭을 다 쓴다
const hasShape = computed(() => Boolean(shapeOf(props.race?.circuitId)))

const lengthKm = computed(() => {
  const m = lengthOf(props.race?.circuitId)
  return m ? (m / 1000).toFixed(3) : null
})

/** 최근 기록 중 가장 빠른 랩 (여러 시즌 중 최고) */
const bestLap = computed(() => {
  const laps = history.value.filter((h) => h.fastestLap?.time)
  if (!laps.length) return null
  const toMs = (t) => {
    const m = /^(\d+):(\d+)\.(\d+)$/.exec(t)
    if (!m) return Infinity
    return Number(m[1]) * 60000 + Number(m[2]) * 1000 + Number(m[3])
  }
  return laps.reduce((best, h) => (toMs(h.fastestLap.time) < toMs(best.fastestLap.time) ? h : best))
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
            <dt>한 바퀴</dt>
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
        <h3 class="race-info__heading">주말 일정 <span>내 시간대</span></h3>
        <ul class="race-info__sessions">
          <li v-for="s in sessions" :key="s.key" :class="{ 'is-main': s.main }">
            <span>{{ s.label }}</span>
            <span class="mono-num">{{ s.when }}</span>
          </li>
        </ul>
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
            <span class="race-info__best-label">최고 랩 ({{ bestLap.season }})</span>
            <strong class="mono-num">{{ bestLap.fastestLap.time }}</strong>
            <span>{{ bestLap.fastestLap.name }}</span>
            <span v-if="bestLap.fastestLap.speedKph" class="mono-num">
              평균 {{ bestLap.fastestLap.speedKph.toFixed(1) }} km/h
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
