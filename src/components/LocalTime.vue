<script setup>
import { computed } from 'vue'
import { formatInZone, isSameZoneDay, zoneOffsetMinutes } from '@/utils/format'

/**
 * 서킷 현지 시각과 보는 사람의 시각을 나란히 보여준다.
 *
 * 왜 병기하는가.
 *
 * 예전에는 브라우저 표준시로만 찍었다. 한국에서 보면 전부 KST라 "이 경기가
 * 현지에서는 몇 시에 열리는가"를 알 수 없었고, 시차가 큰 라운드에서는 요일까지
 * 어긋난 채로 읽혔다. 실제로 2026 시즌 22개 중 7개가 현지와 한국의 날짜가
 * 다르다. 라스베이거스는 현지 토요일 밤 8시 경기인데 화면에는 "일요일"로
 * 떴다 — 시각이 아니라 사실이 틀린 셈이다.
 *
 * 그렇다고 현지 시각만 보여주면 "그래서 내가 몇 시에 봐야 하나"를 사람이
 * 직접 계산해야 한다. 둘 다 궁금한 값이라 둘 다 보여준다.
 *
 * 시차가 없으면(스즈카를 한국에서 볼 때) 같은 값을 두 번 쓰는 게 되므로
 * 자동으로 한 줄로 줄인다. 필요 없는 정보를 보여주지 않는 것도 정보다.
 *
 * timeZone을 모르면(표에 없는 서킷) 내 시간만 남는다. 예전 동작 그대로다.
 */
const props = defineProps({
  /** 표시할 시각 */
  at: { type: Date, default: null },
  /** 서킷의 IANA 타임존. 비면 내 시간만 보여준다. (data/circuitTimezones.js) */
  timeZone: { type: String, default: '' },
  /** 현지 쪽 표기 상세도 */
  preset: {
    type: String,
    default: 'time',
    validator: (v) => ['time', 'datetime', 'full'].includes(v),
  },
  /** 좁은 칸에서는 가로로 못 늘어놓으므로 위아래로 쌓는다 */
  stack: { type: Boolean, default: false },
  /**
   * '현지'/'내 시간' 꼬리표를 붙일지.
   *
   * 같은 화면에 이 컴포넌트가 여러 번 반복되면(시간대별 칸처럼) 꼬리표가
   * 칸마다 되풀이돼 숫자를 덮는다. 그럴 때는 꼬리표를 끄고, 무엇이 무엇인지는
   * 목록 바깥에 한 번만 적는다. 뜻을 전하는 글자를 없애는 게 아니라 옮기는 것이다.
   */
  labels: { type: Boolean, default: true },
})

// 24시간제로 통일한다. '오후 3:00'과 '오후 10:00'을 나란히 두면 자릿수가
// 흔들려 두 값을 눈으로 비교하기 어렵다.
const PRESETS = {
  time: { hour: '2-digit', minute: '2-digit', hour12: false },
  datetime: {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
  full: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
}

const valid = computed(() => props.at instanceof Date && !Number.isNaN(props.at.getTime()))

const sameDay = computed(() => (valid.value ? isSameZoneDay(props.at, props.timeZone) : true))

/**
 * 시차가 없으면 병기할 이유가 없다.
 * 타임존을 모를 때(null)도 여기로 떨어져 내 시간만 남는다.
 */
const collapsed = computed(() => {
  if (!valid.value || !props.timeZone) return true
  const there = zoneOffsetMinutes(props.at, props.timeZone)
  return there === null || there === zoneOffsetMinutes(props.at, '')
})

/**
 * 요청받은 상세도로 찍은 값. timeZone이 비면 내 시간 기준이 된다.
 * 병기할 때는 현지 쪽에, 한 줄로 줄였을 때는 그 한 줄에 쓴다.
 */
const localText = computed(() =>
  valid.value ? formatInZone(props.at, props.timeZone, PRESETS[props.preset]) : '',
)

/**
 * 내 시간 쪽은 시각만 보여 짧게 둔다. 단 날짜가 갈리는 라운드에서는
 * 날짜까지 찍어야 한다. 그러지 않으면 현지 토요일 경기가 내 쪽 요일 없이
 * 시각만 남아 오히려 더 헷갈린다.
 */
const mineText = computed(() => {
  if (!valid.value) return ''
  const options = sameDay.value
    ? PRESETS.time
    : { month: 'numeric', day: 'numeric', weekday: 'short', ...PRESETS.time }
  return formatInZone(props.at, '', options)
})

const iso = computed(() => (valid.value ? props.at.toISOString() : undefined))
</script>

<template>
  <span v-if="valid" class="lt" :class="{ 'lt--stack': stack, 'lt--dual': !collapsed }">
    <!--
      줄일 때 '내 시간' 쪽 서식(mineText)을 쓰면 안 된다. 그쪽은 현지 시각 옆에
      붙는 보조라서 일부러 시각만 남기는데, 줄이고 나면 그 한 줄이 유일한 값이
      되기 때문이다. 실제로 그렇게 뒀다가 시차 없는 지역에서 날짜가 통째로 사라졌다.
      줄이는 것은 중복을 없애는 일이지 정보를 깎는 일이 아니다.
    -->
    <template v-if="collapsed">
      <time class="lt__value" :datetime="iso">{{ localText }}</time>
    </template>

    <template v-else>
      <span class="lt__part">
        <span v-if="labels" class="lt__tag">현지</span>
        <time class="lt__value" :datetime="iso">{{ localText }}</time>
      </span>
      <span v-if="!stack" class="lt__sep" aria-hidden="true">·</span>
      <span class="lt__part lt__part--mine">
        <span v-if="labels" class="lt__tag">내 시간</span>
        <time class="lt__value" :datetime="iso">{{ mineText }}</time>
      </span>
    </template>
  </span>
</template>

<style scoped>
.lt {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.lt--stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.lt__part {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

/* '현지'/'내 시간'은 값을 읽는 열쇠라서 색만으로 구분하지 않고 글자로 적는다 */
.lt__tag {
  font-size: 0.78em;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  white-space: nowrap;
}

.lt__value {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.lt__sep {
  color: var(--text-muted);
}

/* 내 시간은 보조 정보라 한 단계 낮춘다. 다만 읽을 수는 있어야 하므로
   글자 크기는 그대로 두고 색으로만 위계를 준다. */
.lt--dual .lt__part--mine .lt__value {
  color: var(--text-muted);
}
.lt--stack .lt__part--mine {
  font-size: 0.85em;
}
</style>
