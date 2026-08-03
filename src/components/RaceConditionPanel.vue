<script setup>
import { computed, ref } from 'vue'
import { Flag } from '@element-plus/icons-vue'
import BaseDashboardCard from './BaseDashboardCard.vue'
import {
  raceConditionBreakdown,
  raceConditionLabel,
  conditionGrade,
  conditionColor,
  CONDITION_RULES,
  CONDITION_GRADES,
} from '@/utils/raceCondition'

/**
 * 레이스 컨디션 지수 패널.
 * 날씨 원본과 단위만 받아 점수 산출부터 근거 표시까지 스스로 책임진다.
 * 부모는 어떤 날씨를 넘길지만 정하면 되고, 산출 규칙은 이 컴포넌트가 캡슐화한다.
 */
const props = defineProps({
  weather: { type: Object, default: null },
  unit: { type: String, default: 'metric' },
})

const conditionTab = ref('score')
const rules = CONDITION_RULES
const grades = CONDITION_GRADES

const breakdown = computed(() => raceConditionBreakdown(props.weather, props.unit))
const conditionScore = computed(() => breakdown.value?.score ?? null)
const conditionText = computed(() => raceConditionLabel(conditionScore.value))
const grade = computed(() => conditionGrade(conditionScore.value))
const scoreColor = computed(() => conditionColor(conditionScore.value))

// 감점이 적용된 항목만 추려 "이 점수가 나온 이유"로 보여준다
const appliedFactors = computed(() => breakdown.value?.factors.filter((f) => f.delta < 0) ?? [])
</script>

<template>
  <BaseDashboardCard v-if="breakdown">
    <template #header>
      <span
        ><el-icon><Flag /></el-icon> 레이스 컨디션 지수</span
      >
    </template>

    <el-tabs v-model="conditionTab" class="condition__tabs">
      <!-- 탭 1: 현재 지수 -->
      <el-tab-pane label="현재 지수" name="score">
        <div class="score">
          <div class="score__value">
            <strong class="temp-display" :style="{ color: scoreColor }">{{
              conditionScore
            }}</strong>
            <span>/ 100</span>
          </div>
          <div class="score__grade">
            <span class="score__badge" :style="{ background: scoreColor }">{{ grade.grade }}</span>
            <span class="score__label">{{ conditionText }}</span>
          </div>
        </div>

        <el-progress
          :percentage="conditionScore"
          :stroke-width="10"
          :show-text="false"
          :color="scoreColor"
          class="score__bar"
        />

        <!-- 이 점수가 나온 이유 -->
        <div class="condition__why">
          <template v-if="appliedFactors.length">
            <p class="condition__why-title">감점 요인</p>
            <ul class="condition__why-list">
              <li v-for="f in appliedFactors" :key="f.key">
                <span class="condition__why-label">{{ f.label }}</span>
                <span class="condition__why-reading">{{ f.reading }}</span>
                <span class="condition__why-delta mono-num">{{ f.delta.toFixed(1) }}</span>
              </li>
            </ul>
          </template>
          <p v-else class="condition__perfect">
            감점 요인이 없습니다. 모든 지표가 쾌적 구간입니다.
          </p>
        </div>
      </el-tab-pane>

      <!-- 탭 2: 산출 방식 -->
      <el-tab-pane label="산출 방식" name="method">
        <p class="condition__intro">
          기본 <strong>100점</strong>에서 출발해 아래 네 가지 지표가 이상 범위를 벗어난 만큼
          감점합니다. 벗어난 정도에 비례해 연속적으로 깎이며, 결과는 정수로 반올림합니다.
        </p>

        <!-- 현재 날씨에 실제로 적용된 계산 과정 -->
        <div class="calc">
          <div class="calc__row calc__row--base">
            <span>기본 점수</span>
            <strong class="mono-num">100</strong>
          </div>
          <div
            v-for="f in breakdown.factors"
            :key="f.key"
            class="calc__row"
            :class="{ 'is-zero': f.delta === 0 }"
          >
            <span>{{ f.label }}</span>
            <em>{{ f.reading }}</em>
            <strong class="mono-num">{{ f.delta === 0 ? '—' : f.delta.toFixed(2) }}</strong>
          </div>
          <div class="calc__row calc__row--total">
            <span>최종 점수</span>
            <em>정수 반올림 · 0~100 범위</em>
            <strong class="mono-num" :style="{ color: scoreColor }">
              {{ conditionScore }}
            </strong>
          </div>
        </div>

        <!-- 기준표 -->
        <el-table :data="rules" class="condition__table" size="small">
          <el-table-column prop="label" label="지표" width="110" />
          <el-table-column prop="ideal" label="이상 범위" width="130" />
          <el-table-column prop="penalty" label="감점 규칙" min-width="180" />
          <el-table-column prop="max" label="최대" width="70" align="center">
            <template #default="{ row }">
              <span class="mono-num">−{{ row.max }}</span>
            </template>
          </el-table-column>
        </el-table>

        <p class="condition__subtitle">등급 구간</p>
        <div class="grades">
          <div v-for="g in grades" :key="g.grade" class="grades__item">
            <span class="grades__badge">{{ g.grade }}</span>
            <strong>{{ g.min }}점 이상</strong>
            <em>{{ g.label }} · {{ g.desc }}</em>
          </div>
        </div>

        <ul class="condition__notes">
          <li v-for="r in rules" :key="r.key">
            <strong>{{ r.label }}</strong> {{ r.note }}
          </li>
        </ul>

        <p class="condition__disclaimer">
          FIA 공식 지표가 아니라, 공개된 날씨 데이터로 관전 여건을 가늠해보기 위해 정한 자체
          기준입니다.
        </p>
      </el-tab-pane>
    </el-tabs>
  </BaseDashboardCard>
</template>

<style scoped>
.score {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.score__value {
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.score__value strong {
  font-size: clamp(46px, 8vw, 64px);
  line-height: 1;
}
.score__value span {
  font-size: 15px;
  color: var(--text-muted);
  font-weight: 600;
}
.score__grade {
  display: flex;
  align-items: center;
  gap: 9px;
}
.score__badge {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  color: #04120f;
  font-weight: 800;
  font-size: 15px;
}
.score__label {
  font-size: 13px;
  color: var(--text-secondary);
}
.score__bar :deep(.el-progress-bar__outer) {
  background: var(--surface-border);
}
.condition__tabs :deep(.el-tabs__item) {
  font-weight: 600;
  color: var(--text-muted);
}
.condition__tabs :deep(.el-tabs__item.is-active) {
  color: var(--accent);
}
.condition__tabs :deep(.el-tabs__active-bar) {
  background-color: var(--accent);
}
.condition__tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: var(--surface-border);
}

/* 감점 요인 */
.condition__why {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--surface-border);
}
.condition__why-title {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.condition__why-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.condition__why-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.condition__why-label {
  min-width: 78px;
  font-weight: 600;
}
.condition__why-reading {
  flex: 1;
  color: var(--text-muted);
}
.condition__why-delta {
  font-weight: 700;
  color: var(--el-color-danger);
}
.condition__perfect {
  margin: 0;
  font-size: 13px;
  color: var(--accent);
}

/* 산출 방식 */
.condition__intro {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.calc {
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 18px;
}
.calc__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--surface-border);
}
.calc__row:last-child {
  border-bottom: none;
}
.calc__row span {
  min-width: 78px;
  font-weight: 600;
}
.calc__row em {
  flex: 1;
  font-style: normal;
  color: var(--text-muted);
  font-size: 12px;
}
.calc__row strong {
  font-weight: 700;
}
.calc__row.is-zero strong {
  color: var(--text-muted);
}
.calc__row--base {
  background: var(--accent-soft);
}
.calc__row--total {
  background: var(--accent-soft);
  font-size: 14px;
}
.calc__row--total strong {
  color: var(--accent);
  font-size: 16px;
}
.condition__table {
  margin-bottom: 14px;
}
.condition__subtitle {
  margin: 0 0 9px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.grades {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}
.grades__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 11px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  font-size: 13px;
}
.grades__badge {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 800;
  font-size: 12px;
  flex-shrink: 0;
}
.grades__item strong {
  min-width: 74px;
  font-weight: 600;
}
.grades__item em {
  font-style: normal;
  color: var(--text-muted);
  font-size: 12px;
}
.condition__notes {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.condition__notes li {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
  padding-left: 11px;
  border-left: 2px solid var(--surface-border);
}
.condition__notes strong {
  color: var(--text-secondary);
  margin-right: 4px;
}
.condition__disclaimer {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.8;
}
.chart-range {
  display: flex;
  align-items: center;
  gap: 7px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
.chart-range label {
  font-size: 11px;
  color: var(--text-muted);
}
.chart-range em {
  font-style: normal;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
