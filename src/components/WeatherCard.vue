<script setup>
import { computed } from 'vue'
import { Star, StarFilled, Close, Position } from '@element-plus/icons-vue'
import { formatTemp } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { useConfigStore } from '@/stores/configStore'

const props = defineProps({
  data: { type: Object, required: true },
  favorite: { type: Boolean, default: false },
  removable: { type: Boolean, default: true },
  badge: { type: String, default: '' },
})
const emit = defineEmits(['toggle-favorite', 'open', 'remove'])

const config = useConfigStore()
const hasError = computed(() => Boolean(props.data.failed))
const range = computed(() =>
  props.data.tempMin != null && props.data.tempMax != null
    ? `최고 ${formatTemp(props.data.tempMax, config.unit)} · 최저 ${formatTemp(props.data.tempMin, config.unit)}`
    : '',
)
</script>

<template>
  <article
    class="weather-card"
    :class="{ 'weather-card--error': hasError }"
    @click="!hasError && emit('open', data.city)"
  >
    <div class="weather-card__top">
      <div class="weather-card__names">
        <h3 class="weather-card__city">
          <el-icon v-if="badge === 'location'" class="weather-card__pin"><Position /></el-icon>
          {{ data.city }}
        </h3>
        <span class="weather-card__country">{{
          badge === 'location' ? '내 위치' : data.country
        }}</span>
      </div>

      <div class="weather-card__actions" @click.stop>
        <button
          type="button"
          class="weather-card__icon-btn"
          :class="{ 'is-fav': favorite }"
          :aria-label="favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'"
          @click="emit('toggle-favorite', data.city)"
        >
          <el-icon><StarFilled v-if="favorite" /><Star v-else /></el-icon>
        </button>
        <button
          v-if="removable"
          type="button"
          class="weather-card__icon-btn"
          aria-label="카드 삭제"
          @click="emit('remove', data.city)"
        >
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </div>

    <p v-if="hasError" class="weather-card__error">날씨를 불러오지 못했습니다</p>

    <template v-else>
      <div class="weather-card__main">
        <span class="weather-card__emoji">{{ iconEmoji(data.icon) }}</span>
        <span class="weather-card__temp temp-display">{{
          formatTemp(data.temp, config.unit)
        }}</span>
      </div>
      <p class="weather-card__desc">{{ data.description }}</p>
      <p class="weather-card__range">{{ range }}</p>
    </template>
  </article>
</template>

<style scoped>
.weather-card {
  position: relative;
  padding: 18px 20px 20px;
  border-radius: var(--radius-card);
  border: 1px solid var(--surface-border);
  background: var(--surface);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
  box-shadow: var(--surface-shadow);
  cursor: pointer;
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}
.weather-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--accent) 42%, transparent);
  box-shadow: 0 16px 40px rgba(0, 166, 143, 0.16);
}
.weather-card--error {
  cursor: default;
}
.weather-card--error:hover {
  transform: none;
}
.weather-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.weather-card__city {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}
.weather-card__pin {
  color: var(--accent);
  font-size: 14px;
}
.weather-card__country {
  font-size: 12px;
  color: var(--text-muted);
}
.weather-card__actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.weather-card:hover .weather-card__actions,
.weather-card:focus-within .weather-card__actions {
  opacity: 1;
}
.weather-card__icon-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.weather-card__icon-btn:hover {
  background: var(--accent-soft);
  color: var(--text-primary);
}
.weather-card__icon-btn.is-fav {
  color: var(--accent);
  opacity: 1;
}
.weather-card__main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}
.weather-card__emoji {
  font-size: 40px;
  line-height: 1;
}
.weather-card__temp {
  font-size: 40px;
  line-height: 1;
}
.weather-card__desc {
  margin: 8px 0 0;
  color: var(--text-secondary);
  text-transform: capitalize;
  font-size: 14px;
}
.weather-card__range {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.weather-card__error {
  margin: 16px 0 0;
  color: var(--el-color-danger);
  font-size: 14px;
}

/* 즐겨찾기 버튼은 터치 기기에서 항상 노출 */
@media (hover: none) {
  .weather-card__actions {
    opacity: 1;
  }
}
</style>
