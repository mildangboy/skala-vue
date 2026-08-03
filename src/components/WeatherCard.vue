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
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle-favorite', 'open', 'remove', 'select'])

const config = useConfigStore()
const hasError = computed(() => Boolean(props.data.failed))
/**
 * 대시보드 카드는 현재 날씨만 가지고 있어 하루 최고·최저를 알 수 없다.
 * obsMin/obsMax는 같은 도시권 내 관측지점 간 편차라, 대부분의 도시에서는
 * 현재 기온과 같은 값이 온다. 의미 있는 폭이 있을 때만 노출한다.
 */
const range = computed(() => {
  const { obsMin, obsMax } = props.data
  if (obsMin == null || obsMax == null) return ''
  if (Math.abs(obsMax - obsMin) < 0.5) return '' // 관측 편차가 없으면 숨김
  return `관측 ${formatTemp(obsMin, config.unit)} ~ ${formatTemp(obsMax, config.unit)}`
})
</script>

<template>
  <article
    class="weather-card"
    :class="{ 'weather-card--error': hasError, 'is-selected': selected }"
    :aria-pressed="selected"
    @click="!hasError && emit('select', data.city)"
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

      <!-- 선택 시 그 자리에서 펼쳐지는 상세 -->
      <Transition name="expand">
        <div v-if="selected" class="weather-card__detail">
          <dl class="weather-card__metrics">
            <div>
              <dt>체감</dt>
              <dd>{{ formatTemp(data.feelsLike, config.unit) }}</dd>
            </div>
            <div>
              <dt>습도</dt>
              <dd>{{ data.humidity != null ? data.humidity + '%' : '—' }}</dd>
            </div>
            <div>
              <dt>바람</dt>
              <dd>{{ data.windSpeed != null ? data.windSpeed + 'm/s' : '—' }}</dd>
            </div>
            <div>
              <dt>기압</dt>
              <dd>{{ data.pressure != null ? data.pressure + 'hPa' : '—' }}</dd>
            </div>
          </dl>
          <el-button
            type="primary"
            size="small"
            round
            class="weather-card__more"
            @click.stop="emit('open', data.city)"
          >
            상세 보기
          </el-button>
        </div>
      </Transition>
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
.weather-card.is-selected {
  border-color: var(--accent);
  background: linear-gradient(135deg, var(--accent-soft), transparent 55%), var(--surface);
  box-shadow: 0 12px 34px rgba(0, 166, 143, 0.18);
}
.weather-card.is-selected::after {
  content: '';
  position: absolute;
  top: 12px;
  left: 0;
  width: 3px;
  height: 22px;
  border-radius: 0 3px 3px 0;
  background: var(--accent);
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
.weather-card__detail {
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid var(--surface-border);
}
.weather-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 9px 12px;
  margin: 0 0 12px;
}
.weather-card__metrics div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}
.weather-card__metrics dt {
  font-size: 11px;
  color: var(--text-muted);
}
.weather-card__metrics dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.weather-card__more {
  width: 100%;
}
.expand-enter-active,
.expand-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
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
