<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Plus, Refresh } from '@element-plus/icons-vue'
import { usePlanStore } from '@/stores/planStore'
import { useF1Store } from '@/stores/f1Store'
import { useConfigStore } from '@/stores/configStore'
import { formatTemp } from '@/utils/format'
import { iconEmoji } from '@/utils/weatherIcons'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'

const planStore = usePlanStore()
const f1 = useF1Store()
const config = useConfigStore()
const { plans, loading, saving, error, total, totalPeople, avgExcitement, notifyCount } =
  storeToRefs(planStore)
const { upcomingRaces, circuitWeather } = storeToRefs(f1)

const formRef = ref(null)
const editingId = ref(null)

const blankForm = () => ({
  circuitId: '',
  email: '',
  people: 2,
  excitement: 4,
  notify: false,
  memo: '',
})
const form = reactive(blankForm())

const rules = {
  circuitId: [{ required: true, message: '관전할 그랑프리를 선택해주세요.', trigger: 'change' }],
  email: [
    { required: true, message: '이메일을 입력해주세요.', trigger: 'blur' },
    { type: 'email', message: '올바른 이메일 형식이 아닙니다.', trigger: ['blur', 'change'] },
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
const selectedRace = computed(() => upcomingRaces.value.find((r) => r.circuitId === form.circuitId))
const selectedWeather = computed(() =>
  form.circuitId ? (circuitWeather.value[form.circuitId] ?? null) : null,
)

const isEditing = computed(() => editingId.value !== null)

onMounted(async () => {
  await Promise.all([f1.loadCalendar(), planStore.loadInitial()])
  f1.loadCircuitWeather(upcomingRaces.value.slice(0, 8), config.unit)
})

const resetForm = () => {
  Object.assign(form, blankForm())
  editingId.value = null
  formRef.value?.clearValidate()
}

const submit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  const race = upcomingRaces.value.find((r) => r.circuitId === form.circuitId)
  const draft = { ...form, circuitName: race?.name ?? '', round: race?.round ?? null }

  try {
    if (isEditing.value) {
      await planStore.edit({ ...draft, id: editingId.value })
      ElMessage.success({ message: '플랜을 수정했습니다.', duration: 1800 })
    } else {
      await planStore.add(draft)
      ElMessage.success({ message: '플랜을 등록했습니다.', duration: 1800 })
    }
    resetForm()
  } catch (err) {
    ElMessage.error(err.message)
  }
}

const startEdit = (plan) => {
  Object.assign(form, {
    circuitId: plan.circuitId,
    email: plan.email,
    people: plan.people,
    excitement: plan.excitement,
    notify: plan.notify,
    memo: plan.memo,
  })
  editingId.value = plan.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const confirmRemove = async (plan) => {
  try {
    await ElMessageBox.confirm(
      `'${plan.circuitName || plan.memo}' 플랜을 삭제할까요?`,
      '플랜 삭제',
      { confirmButtonText: '삭제', cancelButtonText: '취소', type: 'warning', draggable: true },
    )
  } catch {
    return // 사용자가 취소
  }
  try {
    await planStore.remove(plan.id)
    ElMessage.success({ message: '삭제했습니다.', duration: 1600 })
  } catch (err) {
    ElMessage.error(err.message)
  }
}
</script>

<template>
  <div class="plan-view">
    <header class="plan-view__head">
      <h1>레이스 관전 플랜</h1>
      <p>관전할 그랑프리를 고르고 인원과 기대 지수를 기록하세요. 서킷 날씨가 함께 표시됩니다.</p>
    </header>

    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />

    <!-- 등록/수정 폼 -->
    <BaseDashboardCard tone="accent">
      <template #header>
        <span>{{ isEditing ? '플랜 수정' : '새 플랜 등록' }}</span>
        <el-button v-if="isEditing" text size="small" :icon="Refresh" @click="resetForm">
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
                v-for="race in upcomingRaces"
                :key="race.circuitId"
                :label="`R${race.round} · ${race.name}`"
                :value="race.circuitId"
              />
            </el-select>
          </el-form-item>

          <el-form-item prop="email" label="알림 받을 이메일">
            <el-input v-model.trim="form.email" placeholder="example@email.com" />
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
              {{ formatTemp(selectedWeather.temp, config.unit) }}
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

    <!-- 통계 -->
    <div class="plan-stats">
      <div class="plan-stats__item">
        <span>등록 플랜</span><strong class="mono-num">{{ total }}</strong>
      </div>
      <div class="plan-stats__item">
        <span>총 인원</span><strong class="mono-num">{{ totalPeople }}</strong>
      </div>
      <div class="plan-stats__item">
        <span>평균 기대</span><strong class="mono-num">{{ avgExcitement }}</strong>
      </div>
      <div class="plan-stats__item">
        <span>알림 신청</span><strong class="mono-num">{{ notifyCount }}</strong>
      </div>
    </div>

    <!-- 목록 -->
    <SkeletonCard v-if="loading" height="160px" :lines="3" />
    <template v-else>
      <ul v-if="plans.length" class="plan-list">
        <li
          v-for="plan in plans"
          :key="plan.id"
          class="plan-item"
          :class="{ 'is-pending': plan.pending }"
        >
          <div class="plan-item__main">
            <div class="plan-item__title">
              <strong>{{ plan.circuitName || '(서킷 미지정)' }}</strong>
              <el-tag v-if="plan.notify" size="small" class="plan-item__tag">알림</el-tag>
              <el-tag v-if="plan.pending" size="small" type="info">저장 중…</el-tag>
            </div>
            <p class="plan-item__meta">
              {{ plan.email }} · {{ plan.people }}명 · 기대
              <span class="mono-num">{{ Number(plan.excitement).toFixed(1) }}</span
              >점
            </p>
            <p v-if="plan.memo" class="plan-item__memo">{{ plan.memo }}</p>
          </div>
          <div class="plan-item__actions">
            <el-button size="small" :icon="Edit" :disabled="plan.pending" @click="startEdit(plan)">
              수정
            </el-button>
            <el-button
              size="small"
              type="danger"
              plain
              :icon="Delete"
              :disabled="plan.pending"
              @click="confirmRemove(plan)"
            >
              삭제
            </el-button>
          </div>
        </li>
      </ul>
      <el-empty v-else description="등록된 플랜이 없습니다. 위에서 첫 플랜을 만들어보세요." />
    </template>
  </div>
</template>

<style scoped>
.plan-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.plan-view__head h1 {
  margin: 0;
  font-size: 26px;
}
.plan-view__head p {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
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
.plan-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}
.plan-stats__item {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
}
.plan-stats__item span {
  display: block;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.plan-stats__item strong {
  font-size: 22px;
  font-weight: 700;
}
.plan-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.plan-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 15px 18px;
  border-radius: 16px;
  border: 1px solid var(--surface-border);
  border-left: 3px solid var(--accent);
  background: var(--surface);
  transition: opacity 0.2s ease;
}
.plan-item.is-pending {
  opacity: 0.6;
}
.plan-item__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 15px;
}
.plan-item__tag {
  --el-tag-bg-color: var(--accent-soft);
  --el-tag-border-color: transparent;
  --el-tag-text-color: var(--accent);
  font-weight: 700;
}
.plan-item__meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.plan-item__memo {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.plan-item__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .plan-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
