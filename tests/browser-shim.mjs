// 브라우저 전용 API 최소 shim (import 순서상 가장 먼저 평가되어야 함)
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
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })

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
