import { computed, inject, provide, ref } from 'vue'

/**
 * 데모 데이터 컨텍스트 — 화면이 provide하고, 그 안의 어떤 깊이에서든 inject한다.
 *
 * 왜 Pinia가 아니라 provide/inject인가.
 *
 * 전역 상태처럼 보이지만 실제로는 '이 화면이 지금 보여주는 데이터의 출처'다.
 * 화면마다 답이 다르다 — 홈은 실시간인데 순위 화면만 데모일 수 있고, 둘을
 * 동시에 열어둘 수도 있다. Pinia 스토어는 앱에 하나뿐인 싱글턴이라 이걸 담으려면
 * 화면 이름을 키로 달아 직접 구분해야 한다. 그건 컴포넌트 트리가 이미 갖고 있는
 * 구조를 손으로 다시 만드는 일이다.
 *
 * provide/inject는 범위가 컴포넌트 트리 그 자체다. 화면이 자기 자리에서 provide하면
 * 그 아래만 영향을 받고, 화면을 벗어나면 자동으로 사라진다. 여기서는 이쪽이 맞다.
 *
 * props로 내리지 않는 이유도 있다. 배지를 띄워야 할 곳이
 * View → BaseDashboardCard → 헤더 슬롯처럼 두세 단계 아래라, props로 잇자면
 * 중간 컴포넌트들이 자기가 쓰지도 않는 값을 받아 넘기기만 하게 된다.
 */

// 문자열 키는 다른 라이브러리와 부딪칠 수 있어 Symbol을 쓴다
const DEMO_SOURCE = Symbol('demo-source')

/**
 * provide하지 않은 트리에서 inject했을 때 돌려줄 기본값.
 *
 * 없으면 컴포넌트가 undefined를 읽고 터진다. 배지 하나 때문에 화면 전체가
 * 죽는 건 과한 대가라, '데모 아님'으로 조용히 동작하게 둔다.
 * (SSR 스모크 테스트처럼 화면을 따로 떼어 그리는 경우에도 이 값이 쓰인다.)
 */
const NOOP_SOURCE = {
  isDemo: computed(() => false),
  reason: computed(() => ''),
  mark: () => {},
}

/**
 * 화면 쪽에서 호출한다. 하위 컴포넌트가 읽을 컨텍스트를 심는다.
 *
 * 한 화면이 여러 API를 부르므로(날씨 + 순위 + 예보) 출처를 하나로 두면
 * 나중에 성공한 쪽이 앞의 실패를 덮어버린다. 그래서 키별로 따로 담고,
 * 하나라도 데모면 데모로 본다.
 */
export const provideDemoSource = () => {
  const sources = ref({}) // { [키]: 사유 }

  /**
   * @param {string} key    데이터 종류 ('weather', 'standings' …)
   * @param {string} reason 데모로 물러난 사유. 빈 값이면 해제.
   */
  const mark = (key, reason = '') => {
    const next = { ...sources.value }
    if (reason) next[key] = reason
    else delete next[key]
    // 객체를 통째로 갈아끼워야 반응성이 걸린다 (속성만 바꾸면 감지되지 않는다)
    sources.value = next
  }

  const isDemo = computed(() => Object.keys(sources.value).length > 0)
  const reason = computed(() => Object.values(sources.value)[0] ?? '')

  const context = { isDemo, reason, mark }
  provide(DEMO_SOURCE, context)
  return context
}

/** 하위 컴포넌트에서 호출한다. provide된 곳이 없으면 '데모 아님'으로 동작한다. */
export const useDemoSource = () => inject(DEMO_SOURCE, NOOP_SOURCE)
