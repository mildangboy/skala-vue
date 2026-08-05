<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useStandingsStore } from '@/stores/standingsStore'
import { perRoundPoints } from '@/api/standings'
import { colorOf } from '@/data/teamColors'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import PointsProgressChart from '@/components/PointsProgressChart.vue'
import PointsSparkline from '@/components/PointsSparkline.vue'
import RefreshButton from '@/components/RefreshButton.vue'

/**
 * 챔피언십 순위.
 *
 * 탭을 열 때마다 그 쪽 데이터를 받아온다. 처음부터 둘 다 받으면 요청이 두 배가
 * 되는데, 대개는 한쪽만 보고 나간다.
 */
const store = useStandingsStore()

const tab = ref('driver')
const FORM_RACES = 5

const table = computed(() => store.table[tab.value])
const progress = computed(() => store.progress[tab.value])

/** 표의 각 줄에 붙일 추이 정보 (스파크라인용) */
const formById = computed(() => {
  const map = new Map()
  for (const s of progress.value.series) {
    map.set(s.id, perRoundPoints(s.cumulative).slice(-FORM_RACES))
  }
  return map
})

/**
 * 스파크라인 막대 높이의 기준값.
 * 표 전체에서 한 경기에 딴 최고 포인트로 맞춰야 줄끼리 비교가 된다.
 */
const formMax = computed(() => {
  let top = 1
  for (const vals of formById.value.values()) {
    for (const v of vals) if (v != null && v > top) top = v
  }
  return top
})

const rows = computed(() =>
  table.value.rows.map((r) => ({
    ...r,
    color: colorOf(r.constructorId),
    form: formById.value.get(r.id) ?? [],
  })),
)

/** 차트는 상위 10명(팀)만 */
const chartSeries = computed(() => {
  const order = new Map(table.value.rows.map((r, i) => [r.id, i]))
  return progress.value.series
    .filter((s) => (order.get(s.id) ?? 99) < 10)
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
})

const isDriver = computed(() => tab.value === 'driver')

const load = () => store.load(tab.value)
onMounted(load)
watch(tab, load)
</script>

<template>
  <div class="standings-view">
    <header class="standings-head">
      <div>
        <h1>챔피언십 순위</h1>
        <p class="standings-head__sub">
          2026 시즌
          <template v-if="store.currentRound"> · {{ store.currentRound }}라운드 종료 시점</template>
        </p>
      </div>
      <RefreshButton
        :refreshing="table.loading"
        :last-updated="store.lastUpdated"
        @refresh="store.refresh(tab)"
      />
    </header>

    <el-radio-group v-model="tab" class="standings-tabs">
      <el-radio-button value="driver">드라이버</el-radio-button>
      <el-radio-button value="constructor">컨스트럭터</el-radio-button>
    </el-radio-group>

    <el-alert
      v-if="table.error"
      :title="table.error"
      type="error"
      show-icon
      :closable="false"
      class="standings-alert"
    />

    <!-- 포인트 추이 -->
    <BaseDashboardCard>
      <template #header>
        <span>{{ isDriver ? '드라이버 포인트 추이' : '컨스트럭터 포인트 추이' }}</span>
        <span class="standings-note">
          {{ isDriver ? '상위 10명' : '상위 10팀' }} · 누적
          <template v-if="isDriver"> · 팀메이트는 파선</template>
        </span>
      </template>

      <el-skeleton v-if="progress.loading && !progress.series.length" :rows="5" animated />
      <el-alert
        v-else-if="progress.error"
        :title="progress.error"
        type="info"
        show-icon
        :closable="false"
        description="순위표는 그대로 보실 수 있습니다."
      />
      <PointsProgressChart v-else :series="chartSeries" :rounds="progress.rounds" />

      <p v-if="progress.missing" class="standings-note standings-note--warn">
        일부 라운드({{ progress.missing }}개)를 받아오지 못해 그 구간은 선이 끊겨 있습니다.
      </p>
    </BaseDashboardCard>

    <!-- 순위표 -->
    <BaseDashboardCard>
      <template #header>
        <span>{{ isDriver ? '드라이버 순위' : '컨스트럭터 순위' }}</span>
      </template>

      <el-skeleton v-if="table.loading && !rows.length" :rows="6" animated />

      <el-table v-else :data="rows" class="standings-table" stripe>
        <el-table-column label="#" width="56" align="center">
          <template #default="{ row }">
            <span class="standings-pos mono-num">{{ row.position }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="isDriver ? '드라이버' : '팀'" min-width="180">
          <template #default="{ row }">
            <div class="standings-name">
              <span class="standings-bar" :style="{ background: row.color }" />
              <div>
                <strong>{{ row.name }}</strong>
                <small v-if="isDriver">{{ row.constructorName }}</small>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          v-if="isDriver"
          prop="code"
          label="약칭"
          width="80"
          align="center"
          class-name="mono-num"
        />

        <el-table-column label="포인트" width="92" align="right" sortable :sort-by="'points'">
          <template #default="{ row }">
            <strong class="mono-num">{{ row.points }}</strong>
          </template>
        </el-table-column>

        <el-table-column label="승" width="66" align="right" sortable :sort-by="'wins'">
          <template #default="{ row }">
            <span class="mono-num">{{ row.wins }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="`최근 ${FORM_RACES}경기`" width="108" align="center">
          <template #default="{ row }">
            <PointsSparkline
              v-if="row.form.length"
              :values="row.form"
              :max="formMax"
              :color="row.color"
            />
            <span v-else class="standings-note">—</span>
          </template>
        </el-table-column>
      </el-table>
    </BaseDashboardCard>
  </div>
</template>

<style scoped>
.standings-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.standings-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.standings-head h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
}
.standings-head__sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
.standings-tabs {
  align-self: flex-start;
}
.standings-alert {
  margin: 0;
}
.standings-note {
  font-size: 12px;
  color: var(--text-muted);
}
.standings-note--warn {
  margin: 10px 0 0;
  color: var(--el-color-warning, #e6a23c);
}

/* 표 */
.standings-pos {
  font-weight: 700;
  color: var(--text-secondary);
}
.standings-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
/* 팀 색을 이름 옆 얇은 띠로. 색맹 사용자를 위해 색만으로 뜻을 전하지 않고
   팀 이름을 함께 적는다. */
.standings-bar {
  flex: none;
  width: 4px;
  height: 26px;
  border-radius: 2px;
}
.standings-name strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.25;
}
.standings-name small {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .standings-head h1 {
    font-size: 22px;
  }
}
</style>
