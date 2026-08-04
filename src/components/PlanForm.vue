<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Refresh } from '@element-plus/icons-vue'
import BaseDashboardCard from './BaseDashboardCard.vue'
import { formatTemp } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'

/**
 * 관전 플랜 등록/수정 폼.
 * 입력값 관리와 검증만 책임지고, 저장은 부모(뷰)가 스토어를 통해 수행한다.
 * 수정 모드는 editing prop으로 들어온 플랜을 폼에 채우는 방식으로 처리한다.
 */
const props = defineProps({
  races: { type: Array, default: () => [] },
  circuitWeather: { type: Object, default: () => ({}) },
  unit: { type: String, default: 'metric' },
  saving: { type: Boolean, default: false },
  editing: { type: Object, default: null },
  // 별명을 비워 뒀을 때 채워 넣을 기본값 (로그인 계정 이름)
  defaultNickname: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'cancel'])

const formRef = ref(null)

// 비울 때도 별명은 계정 이름으로 되돌린다.
// 빈 문자열로 두면 폼 초기화가 방금 채운 값을 지운다.
const blankForm = () => ({
  circuitId: '',
  nickname: props.defaultNickname,
  people: 2,
  excitement: 4,
  notify: false,
  memo: '',
})
const form = reactive(blankForm())

const isEditing = computed(() => Boolean(props.editing))

// 로그인 정보가 늦게 들어오면 비어 있는 별명만 채운다 (입력 중이면 건드리지 않는다)
watch(
  () => props.defaultNickname,
  (name) => {
    if (name && !form.nickname) form.nickname = name
  },
  { immediate: true },
)

// 부모가 수정 대상을 넘기면 폼을 채우고, 비우면 초기화한다
watch(
  () => props.editing,
  (plan) => {
    if (plan) {
      Object.assign(form, {
        circuitId: plan.circuitId,
        nickname: plan.nickname,
        people: plan.people,
        excitement: plan.excitement,
        notify: plan.notify,
        memo: plan.memo,
      })
    } else {
      Object.assign(form, blankForm())
      formRef.value?.clearValidate()
    }
  },
  { immediate: true },
)

const rules = {
  circuitId: [{ required: true, message: '관전할 그랑프리를 선택해주세요.', trigger: 'change' }],
  nickname: [
    { required: true, message: '표시할 별명을 입력해주세요.', trigger: 'blur' },
    { max: 20, message: '별명은 20자 이내로 입력해주세요.', trigger: 'blur' },
  ],
  people: [
    {
      validator: (rule, value, callback) =>
        value >= 1 && value <= 10 ? callback() : callback(new Error('1~10명 사이로 입력해주세요.')),
      trigger: 'change',
    },
  ],
  memo: [{ max: 40, message: '메모는 40자 이내로 작성해주세요.', trigger: 'blur' }],
}

// 선택한 서킷의 현재 날씨를 실시간 요약에 함께 보여준다
const selectedRace = computed(() => props.races.find((r) => r.circuitId === form.circuitId))
const selectedWeather = computed(() =>
  form.circuitId ? (props.circuitWeather[form.circuitId] ?? null) : null,
)

const submit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return // 검증 실패 시 el-form이 항목별 메시지를 표시한다
  }
  const race = props.races.find((r) => r.circuitId === form.circuitId)
  emit('submit', { ...form, circuitName: race?.name ?? '', round: race?.round ?? null })
}

const reset = () => {
  Object.assign(form, blankForm())
  formRef.value?.clearValidate()
  emit('cancel')
}

defineExpose({ reset })
</script>

<template>
  <BaseDashboardCard tone="accent">
    <template #header>
      <span>{{ isEditing ? '플랜 수정' : '새 플랜 등록' }}</span>
      <el-button v-if="isEditing" text size="small" :icon="Refresh" @click="reset">
        새로 작성
      </el-button>
    </template>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="submit"
    >
      <div class="plan-form__grid">
        <el-form-item prop="circuitId" label="그랑프리">
          <el-select v-model="form.circuitId" placeholder="관전할 레이스 선택" filterable>
            <el-option
              v-for="race in races"
              :key="race.circuitId"
              :label="`R${race.round} · ${race.name}`"
              :value="race.circuitId"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="nickname" label="표시할 별명">
          <el-input v-model.trim="form.nickname" maxlength="20" placeholder="다른 사람에게 보일 이름" />
          <span class="plan-form__hint">
            목록에 이 이름으로 표시됩니다. 알림은 로그인한 계정 주소로만 발송됩니다.
          </span>
        </el-form-item>

        <el-form-item prop="people" label="관전 인원">
          <el-input-number v-model="form.people" :min="1" :max="10" controls-position="right" />
          <span class="plan-form__hint">최대 10명</span>
        </el-form-item>

        <el-form-item label="기대 지수">
          <div class="plan-form__rate">
            <el-rate
              v-model="form.excitement"
              allow-half
              :max="5"
              :colors="['#00a68f', '#00a68f', '#27f4d2']"
            />
            <span class="plan-form__hint mono-num">{{ form.excitement.toFixed(1) }} / 5</span>
          </div>
        </el-form-item>
      </div>

      <el-form-item prop="memo" label="메모">
        <el-input v-model="form.memo" placeholder="같이 갈 사람, 준비물 등 (40자 이내)" />
      </el-form-item>

      <el-form-item>
        <el-switch v-model="form.notify" />
        <span class="plan-form__hint">레이스 전날 날씨 알림을 받겠습니다.</span>
      </el-form-item>

      <!-- 실시간 요약 -->
      <div class="plan-summary">
        <span class="plan-summary__dot" />
        <template v-if="selectedRace">
          {{ selectedRace.name }} · 인원 {{ form.people }}명 · 기대
          {{ form.excitement.toFixed(1) }}점
          <template v-if="selectedWeather">
            · 현재 {{ iconEmoji(selectedWeather.icon) }}
            {{ formatTemp(selectedWeather.temp, unit) }}
          </template>
        </template>
        <template v-else>그랑프리를 선택하면 요약이 표시됩니다.</template>
      </div>

      <el-form-item class="plan-form__actions">
        <el-button type="primary" :icon="Plus" :loading="saving" @click="submit">
          {{ isEditing ? '수정 저장 (PUT)' : '플랜 등록 (POST)' }}
        </el-button>
      </el-form-item>
    </el-form>
  </BaseDashboardCard>
</template>

<style scoped>
.plan-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0 16px;
}
.plan-form__rate {
  display: flex;
  align-items: center;
  gap: 10px;
}
.plan-form__hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.plan-form__actions {
  margin-bottom: 0;
}
.plan-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  margin: 4px 0 18px;
  border-radius: 12px;
  background: var(--accent-soft);
  font-size: 13px;
  color: var(--text-secondary);
}
.plan-summary__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
</style>
