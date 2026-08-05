<script setup>
// Apple Weather 스타일 글래스 카드 프레임 — 앱 전역에서 재사용
import { computed } from 'vue'
import { useDemoSource } from '@/composables/useDemoSource'

const props = defineProps({
  clickable: { type: Boolean, default: false },
  padded: { type: Boolean, default: true },
  // 'default' 유리 카드 | 'accent' 강조 | 'bare' 프레임 없이 슬롯 구조만 사용
  tone: { type: String, default: 'default' },
  /**
   * 이 카드가 보여주는 데이터의 출처. 'live' | 'demo'
   *
   * 비워두면 화면이 provide한 컨텍스트를 따른다. 한 화면에서 카드마다 출처가
   * 갈릴 때(날씨는 실시간인데 순위만 데모)만 카드가 직접 지정한다.
   */
  source: { type: String, default: '' },
})
const emit = defineEmits(['click'])

const context = useDemoSource()

/**
 * 카드가 직접 받은 값을 먼저 보고, 없으면 화면 컨텍스트로 물러난다.
 *
 * 이 판정을 카드가 하는 이유는, 헤더 슬롯을 쓰는 쪽이 두 곳(prop과 inject)을
 * 각각 확인하게 두면 카드마다 같은 규칙을 다시 쓰게 되기 때문이다.
 * 판정은 한 곳에서 하고, 결과만 슬롯으로 내려준다.
 */
const resolvedSource = computed(() => props.source || (context.isDemo.value ? 'demo' : 'live'))
const isDemo = computed(() => resolvedSource.value === 'demo')
</script>

<template>
  <div
    class="glass-card"
    :class="[
      `glass-card--${tone}`,
      {
        'liquid-glass': tone !== 'bare',
        'liquid-glass--interactive': clickable && tone !== 'bare',
        'glass-card--clickable': clickable,
        'glass-card--padded': padded,
      },
    ]"
    @click="clickable && emit('click')"
  >
    <!--
      스코프드 슬롯: 카드가 판정한 데이터 출처를 헤더 쪽으로 내려준다.
      헤더를 그리는 주체는 부모지만, 출처를 아는 주체는 카드다.
      그래서 '무엇을 아는지'는 카드가, '어떻게 보여줄지'는 부모가 정한다.
    -->
    <div v-if="$slots.header" class="glass-card__header">
      <slot name="header" :demo="isDemo" :source="resolvedSource" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="glass-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
/* 배경·테두리·반사광은 전역 .liquid-glass가 담당하고
   여기서는 모양(반경)과 레이아웃만 정의한다. */
.glass-card {
  border-radius: var(--radius-card);
}
.glass-card--padded {
  padding: 18px 20px;
}
/* 구조(헤더 슬롯 + 본문 슬롯)는 그대로 쓰되 카드 프레임은 그리지 않는다.
   카드 안에 카드가 겹쳐 배경이 탁해지는 것을 피하기 위한 변형. */
.glass-card--bare {
  background: none;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.glass-card--accent {
  border-color: color-mix(in srgb, var(--accent) 38%, transparent);
  background: linear-gradient(135deg, var(--accent-soft), transparent 55%), var(--surface);
}
.glass-card--clickable {
  cursor: pointer;
}

.glass-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.glass-card__footer {
  margin-top: 14px;
}
</style>
