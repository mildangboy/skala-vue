<script setup>
import { computed } from 'vue'
import { useDemoSource } from '@/composables/useDemoSource'

/**
 * 지금 보고 있는 값이 실측이 아니라 데모라는 사실을 밝히는 표시.
 *
 * 데이터는 props로 받지 않고 provide/inject로 가져온다. 이 배지가 놓이는 자리가
 * 카드 헤더 슬롯 안쪽이라, props로 이으면 중간 컴포넌트들이 쓰지도 않는 값을
 * 받아 넘기기만 하게 된다.
 *
 * 색으로만 알리지 않는다. 아이콘과 색은 눈에 띄게 하는 역할이고,
 * 무슨 뜻인지는 글자가 말한다.
 */
const props = defineProps({
  /** pill: 카드 헤더에 붙는 작은 표시 · line: 섹션 위에 한 줄로 설명 */
  variant: { type: String, default: 'pill', validator: (v) => ['pill', 'line'].includes(v) },
  /** 부모(카드)가 이미 판정했으면 그 값을 쓴다. 없으면 컨텍스트를 본다. */
  demo: { type: Boolean, default: null },
})

const source = useDemoSource()

const visible = computed(() => (props.demo === null ? source.isDemo.value : props.demo))

const FULL_TEXT = '실시간 API에 문제가 있어 Mock API의 데모 데이터를 표시하고 있습니다.'

// 사유는 알면 덧붙인다. 없으면 원인을 지어내지 않는다.
const detail = computed(() =>
  source.reason.value ? `${FULL_TEXT} (사유: ${source.reason.value})` : FULL_TEXT,
)
</script>

<template>
  <span
    v-if="visible && variant === 'pill'"
    class="demo-pill"
    role="status"
    :title="detail"
    :aria-label="detail"
  >
    <span class="demo-pill__dot" aria-hidden="true" />
    데모 데이터
  </span>

  <p v-else-if="visible" class="demo-line" role="status">
    <span class="demo-pill__dot" aria-hidden="true" />
    <span>
      <strong>Mock API 데모 데이터</strong>
      실시간 API에서 값을 받지 못해 예시 데이터를 보여주고 있습니다. 실제 관측값이 아닙니다.
      <template v-if="source.reason.value">
        <br />
        <span class="demo-line__reason">사유: {{ source.reason.value }}</span>
      </template>
    </span>
  </p>
</template>

<style scoped>
/* 카드 헤더용 — 제목을 가리지 않도록 작게 */
.demo-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: rgba(230, 162, 60, 0.16);
  border: 1px solid rgba(230, 162, 60, 0.42);
  color: #e6a23c;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
  white-space: nowrap;
  cursor: help;
}

.demo-pill__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e6a23c;
  flex-shrink: 0;
}

/* 섹션 상단용 — 한 줄 설명 */
.demo-line {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 0;
  padding: 9px 14px;
  border-radius: var(--radius-pill);
  background: rgba(230, 162, 60, 0.12);
  border: 1px solid rgba(230, 162, 60, 0.36);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.demo-line .demo-pill__dot {
  margin-top: 6px;
}
.demo-line strong {
  color: #e6a23c;
  margin-right: 4px;
}
.demo-line__reason {
  color: var(--text-muted);
  font-size: 11px;
}
</style>
