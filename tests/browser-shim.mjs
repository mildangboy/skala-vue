/*
 * 브라우저 전용 API 최소 shim.
 *
 * 번들 안에서 첫 줄에 import하는 것만으로는 부족하다. 롤업이 코드를 청크로
 * 나누면서 진입점의 import 순서를 다시 짜기 때문에, 소스에서 아무리 먼저
 * 적어도 다른 청크가 앞서 평가될 수 있다. 실제로 Chart.js가 모듈 최상단에서
 * window.matchMedia를 읽는데, 순위 화면이 생겨 Chart.js가 공용 청크로 빠지자
 * 그 청크가 shim보다 먼저 실행돼 터졌다.
 *
 * 그래서 npm 스크립트에서 node --import로 미리 싣는다. 번들이 어떻게 쪼개지든
 * 이 파일이 항상 먼저 실행된다. 번들 안의 import는 그대로 두어도 무해하다
 * (두 번 실행될 뿐이고, 아래 정의는 모두 덮어쓸 수 있게 두었다).
 *
 * 순수 JS라 별도 변환 없이 Node가 바로 읽는다.
 */
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i],
  get length() {
    return store.size
  },
}
// addListener/removeListener는 폐기된 이름이지만 아직 쓰는 라이브러리가 있다
// (Chart.js가 prefers-color-scheme을 이 방식으로 구독한다)
globalThis.matchMedia = (media = '') => ({
  media,
  matches: false,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
})

const makeEl = () => ({
  style: {},
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {},
  getAttribute: () => null,
  removeAttribute() {},
  appendChild() {},
  removeChild() {},
  addEventListener() {},
  removeEventListener() {},
  getContext: () => null,
  children: [],
  parentNode: null,
})

globalThis.document = {
  documentElement: makeEl(),
  body: makeEl(),
  head: makeEl(),
  title: '',
  createElement: makeEl,
  createTextNode: () => ({}),
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener() {},
  removeEventListener() {},
}

Object.defineProperty(globalThis, 'location', {
  value: {
    href: 'http://localhost/',
    origin: 'http://localhost',
    pathname: '/',
    search: '',
    hash: '',
    protocol: 'http:',
    host: 'localhost',
  },
  configurable: true,
  writable: true,
})

Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true, userAgent: 'node', geolocation: { getCurrentPosition() {} } },
  configurable: true,
  writable: true,
})

globalThis.window = globalThis
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#27f4d2' })
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)
globalThis.cancelAnimationFrame = () => {}

Object.defineProperty(globalThis, 'history', {
  value: {
    state: {},
    pushState() {},
    replaceState() {},
    go() {},
    back() {},
    forward() {},
    length: 1,
  },
  configurable: true,
  writable: true,
})
