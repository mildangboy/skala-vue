<script setup>
import { computed } from 'vue'
import { Star, StarFilled } from '@element-plus/icons-vue'
import BaseDashboardCard from './BaseDashboardCard.vue'
import { formatTemp } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import { useConfigStore } from '@/stores/configStore'

const props = defineProps({
  data: { type: Object, required: true },
  favorite: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle-favorite', 'open'])

const config = useConfigStore()
const hasError = computed(() => Boolean(props.data.failed))
</script>

<template>
  <BaseDashboardCard clickable @click="emit('open', data.city)">
    <template #header>
      <span class="weather-card__city">{{ data.city }}<small v-if="data.country">, {{ data.country }}</small></span>
      <el-icon
        class="weather-card__fav"
        :class="{ 'is-active': favorite }"
        @click.stop="emit('toggle-favorite', data.city)"
      >
        <StarFilled v-if="favorite" />
        <Star v-else />
      </el-icon>
    </template>

    <div v-if="hasError" class="weather-card__error">불러오지 못했습니다</div>
    <div v-else class="weather-card__body">
      <span class="weather-card__icon">{{ iconEmoji(data.icon) }}</span>
      <span class="weather-card__temp">{{ formatTemp(data.temp, config.unit) }}</span>
    </div>
    <p v-if="!hasError" class="weather-card__desc">{{ data.description }}</p>
  </BaseDashboardCard>
</template>

<style scoped>
.weather-card__city {
  font-size: 16px;
}
.weather-card__city small {
  color: var(--text-muted);
  font-weight: 400;
  margin-left: 4px;
}
.weather-card__fav {
  cursor: pointer;
  color: var(--text-muted);
}
.weather-card__fav.is-active {
  color: #f7b500;
}
.weather-card__body {
  display: flex;
  align-items: center;
  gap: 12px;
}
.weather-card__icon {
  font-size: 40px;
  line-height: 1;
}
.weather-card__temp {
  font-size: 32px;
  font-weight: 700;
}
.weather-card__desc {
  margin: 8px 0 0;
  color: var(--text-muted);
  text-transform: capitalize;
}
.weather-card__error {
  color: var(--el-color-danger);
}
</style>
