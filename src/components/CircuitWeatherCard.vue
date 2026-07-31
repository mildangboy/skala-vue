<script setup>
import { computed } from 'vue'
import { formatTemp } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { raceStartDate } from '@/data/f1Calendar2026'

const props = defineProps({
  race: { type: Object, required: true },
  weather: { type: Object, default: null },
  unit: { type: String, default: 'metric' },
  past: { type: Boolean, default: false },
})
defineEmits(['open'])

const dateLabel = computed(() =>
  raceStartDate(props.race).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
)
</script>

<template>
  <article class="circuit-card" :class="{ 'is-past': past }" @click="$emit('open', race.circuitId)">
    <div class="circuit-card__head">
      <span class="circuit-card__round">R{{ race.round }}</span>
      <el-tag v-if="race.sprint" size="small" class="circuit-card__sprint">SPRINT</el-tag>
      <span class="circuit-card__date">{{ dateLabel }}</span>
    </div>

    <h3 class="circuit-card__name">{{ race.name }}</h3>
    <p class="circuit-card__circuit">{{ race.circuit }}</p>

    <div class="circuit-card__weather">
      <template v-if="weather">
        <span class="circuit-card__emoji">{{ iconEmoji(weather.icon) }}</span>
        <span class="circuit-card__temp mono-num">{{ formatTemp(weather.temp, unit) }}</span>
        <span class="circuit-card__desc">{{ weather.description }}</span>
      </template>
      <span v-else class="circuit-card__pending">날씨 조회 중…</span>
    </div>
  </article>
</template>

<style scoped>
.circuit-card {
  position: relative;
  padding: 16px 18px 18px;
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  background: var(--surface);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
  cursor: pointer;
  transition:
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.22s ease;
  border-left: 3px solid var(--accent);
}
.circuit-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  border-left-color: var(--accent);
}
.circuit-card.is-past {
  opacity: 0.58;
  border-left-color: var(--text-muted);
}
.circuit-card__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.circuit-card__round {
  color: var(--accent);
}
.circuit-card__date {
  color: var(--text-muted);
  margin-left: auto; /* 날짜를 항상 오른쪽 끝으로 */
  white-space: nowrap;
}
.circuit-card__name {
  margin: 10px 0 2px;
  font-size: 16px;
  font-weight: 600;
}
.circuit-card__circuit {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.circuit-card__weather {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  min-height: 30px;
}
.circuit-card__emoji {
  font-size: 24px;
}
.circuit-card__temp {
  font-size: 20px;
  font-weight: 600;
}
.circuit-card__desc {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.circuit-card__pending {
  font-size: 12px;
  color: var(--text-muted);
}
.circuit-card__sprint {
  --el-tag-bg-color: var(--accent-soft);
  --el-tag-border-color: transparent;
  --el-tag-text-color: var(--accent);
  height: 17px;
  padding: 0 6px;
  font-weight: 800;
  font-size: 9px;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}
</style>
