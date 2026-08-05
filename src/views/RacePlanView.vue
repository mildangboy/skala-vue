<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import { usePlanStore } from '@/stores/planStore'
import { useF1Store } from '@/stores/f1Store'
import { useConfigStore } from '@/stores/configStore'
import { useAuthStore } from '@/stores/authStore'
import PlanForm from '@/components/PlanForm.vue'
import SignInGate from '@/components/SignInGate.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'

const planStore = usePlanStore()
const f1 = useF1Store()
const config = useConfigStore()
const auth = useAuthStore()
const { plans, loading, saving, error, total, totalPeople, avgExcitement, notifyCount, myCount } =
  storeToRefs(planStore)
const { upcomingRaces, circuitWeather } = storeToRefs(f1)

// 수정 중인 플랜 (null이면 신규 등록 모드)
const editingPlan = ref(null)
const editingId = computed(() => editingPlan.value?.id ?? null)

onMounted(async () => {
  await Promise.all([f1.loadCalendar(), planStore.loadInitial()])
  f1.loadCircuitWeather(upcomingRaces.value.slice(0, 8), config.unit)
})

// 로그인 상태가 바뀌면 내 플랜을 다시 불러온다
watch(
  () => auth.isSignedIn,
  () => planStore.loadInitial(),
)

// 폼에서 올라온 초안을 저장 — 등록/수정 분기와 스토어 호출은 뷰가 담당
const handleSubmit = async (draft) => {
  try {
    if (editingId.value !== null) {
      await planStore.edit({ ...draft, id: editingId.value })
      ElMessage.success({ message: '플랜을 수정했습니다.', duration: 1800 })
    } else {
      await planStore.add(draft)
      ElMessage.success({ message: '플랜을 등록했습니다.', duration: 1800 })
    }
    editingPlan.value = null
  } catch (err) {
    ElMessage.error(err.message)
  }
}

const startEdit = (plan) => {
  editingPlan.value = plan
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const confirmRemove = async (plan) => {
  try {
    await ElMessageBox.confirm(
      `'${plan.circuitName || plan.memo}' 플랜을 삭제할까요?`,
      '플랜 삭제',
      {
        confirmButtonText: '삭제',
        cancelButtonText: '취소',
        type: 'warning',
        draggable: true,
      },
    )
  } catch {
    return // 사용자가 취소
  }
  try {
    await planStore.remove(plan.id)
    if (editingId.value === plan.id) editingPlan.value = null
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

    <SignInGate />

    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />

    <PlanForm
      v-if="auth.isSignedIn || !auth.configured"
      :races="upcomingRaces"
      :circuit-weather="circuitWeather"
      :unit="config.unit"
      :saving="saving"
      :editing="editingPlan"
      :default-nickname="auth.user?.displayName ?? ''"
      @submit="handleSubmit"
      @cancel="editingPlan = null"
    />

    <!-- 통계 -->
    <div class="plan-stats">
      <div class="plan-stats__item">
        <span>전체 플랜</span><strong class="mono-num">{{ total }}</strong>
      </div>
      <div class="plan-stats__item">
        <span>내 플랜</span><strong class="mono-num">{{ myCount }}</strong>
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
          :class="{ 'is-pending': plan.pending, 'is-editing': plan.id === editingId }"
        >
          <div class="plan-item__main">
            <div class="plan-item__title">
              <strong>{{ plan.circuitName || '(서킷 미지정)' }}</strong>
              <el-tag v-if="planStore.isMine(plan)" size="small" type="success" effect="plain"
                >내 플랜</el-tag
              >
              <el-tag v-if="plan.notify" size="small" class="plan-item__tag">알림</el-tag>
              <el-tag v-if="plan.pending" size="small" type="info">저장 중…</el-tag>
            </div>
            <p class="plan-item__meta">
              {{ plan.nickname || '익명' }} · {{ plan.people }}명 · 기대
              <span class="mono-num">{{ Number(plan.excitement).toFixed(1) }}</span
              >점
            </p>
            <p v-if="plan.memo" class="plan-item__memo">{{ plan.memo }}</p>
          </div>
          <div v-if="planStore.isMine(plan)" class="plan-item__actions">
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
  transition:
    opacity 0.2s ease,
    border-color 0.2s ease;
}
.plan-item.is-pending {
  opacity: 0.6;
}
.plan-item.is-editing {
  border-color: var(--accent);
  background: var(--accent-soft);
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
