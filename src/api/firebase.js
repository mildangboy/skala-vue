import axios from 'axios'

/**
 * 구글 로그인 (Firebase Auth REST + Google Identity Services)
 *
 * 관전 플랜은 공개 링크로 접근하므로 로그인한 본인 문서만 다루도록 한다.
 * 알림 메일도 계정에 등록된 주소로만 나가게 해 임의 주소 발송을 막는다.
 * (짝이 되는 규칙은 functions/firestore.rules)
 *
 * SDK 대신 REST를 쓰는 이유
 * - Firestore를 이미 Axios(REST)로 부르고 있어 방식이 통일된다
 * - 번들에 큰 의존성을 더하지 않는다
 *
 * 흐름
 *   GIS로 구글 ID 토큰 발급 → Firebase가 자체 ID 토큰으로 교환
 *   → 그 토큰을 Firestore 요청에 Bearer로 실어 보낸다
 */
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY ?? ''
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const STORAGE_KEY = 'skala-vue:auth'

export const hasAuthConfig = () => Boolean(API_KEY && GOOGLE_CLIENT_ID)

/* ── 세션 보관 ───────────────────────────────────────────────── */

const readSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeSession = (session) => {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 저장 실패해도 이번 세션은 메모리로 동작한다
  }
}

let session = readSession()
const listeners = new Set()

const emit = () => {
  const user = session
    ? {
        uid: session.uid,
        email: session.email,
        displayName: session.displayName,
        photoURL: session.photoURL,
      }
    : null
  listeners.forEach((fn) => fn(user))
}

const setSession = (next) => {
  session = next
  writeSession(next)
  emit()
}

/* ── Google Identity Services 로드 ───────────────────────────── */

let gisPromise = null

const loadGis = () =>
  (gisPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google)
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('구글 로그인 스크립트를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  }))

/** GIS 팝업으로 구글 ID 토큰을 받는다 */
const requestGoogleIdToken = () =>
  new Promise((resolve, reject) => {
    loadGis()
      .then((google) => {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) =>
            credential ? resolve(credential) : reject(new Error('로그인이 취소되었습니다.')),
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true,
        })
        google.accounts.id.prompt((notification) => {
          // One Tap이 뜨지 않는 환경에서는 사용자에게 안내한다
          if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
            reject(
              new Error(
                '구글 로그인 창을 띄우지 못했습니다. 브라우저의 서드파티 쿠키 차단을 확인해주세요.',
              ),
            )
          }
        })
      })
      .catch(reject)
  })

/* ── Firebase Auth REST ──────────────────────────────────────── */

const identity = axios.create({
  baseURL: 'https://identitytoolkit.googleapis.com/v1',
  timeout: 10000,
})
const secureToken = axios.create({
  baseURL: 'https://securetoken.googleapis.com/v1',
  timeout: 10000,
})

const saveFromAuthResponse = (data) => {
  setSession({
    uid: data.localId,
    email: data.email,
    displayName: data.displayName ?? data.email,
    photoURL: data.photoUrl ?? '',
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    // 만료 60초 전에는 미리 갱신한다
    expiresAt: Date.now() + (Number(data.expiresIn ?? 3600) - 60) * 1000,
  })
}

export const signInWithGoogle = async () => {
  if (!hasAuthConfig()) throw new Error('Firebase 설정이 없습니다. .env를 확인해주세요.')

  const googleIdToken = await requestGoogleIdToken()
  try {
    const { data } = await identity.post(
      '/accounts:signInWithIdp',
      {
        postBody: `id_token=${googleIdToken}&providerId=google.com`,
        requestUri: window.location.origin,
        returnSecureToken: true,
      },
      { params: { key: API_KEY } },
    )
    saveFromAuthResponse(data)
    return data
  } catch (err) {
    const reason = err?.response?.data?.error?.message ?? err.message
    const messages = {
      INVALID_IDP_RESPONSE: '구글 인증 정보가 올바르지 않습니다.',
      OPERATION_NOT_ALLOWED: 'Firebase에서 Google 로그인이 활성화되어 있지 않습니다.',
    }
    throw new Error(messages[reason] ?? `로그인에 실패했습니다. (${reason})`, { cause: err })
  }
}

export const signOut = async () => {
  if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect()
  setSession(null)
}

/** 만료됐으면 갱신해서 유효한 ID 토큰을 돌려준다 */
export const getIdToken = async () => {
  if (!session) return null
  if (Date.now() < session.expiresAt) return session.idToken

  try {
    const { data } = await secureToken.post(
      '/token',
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refreshToken }),
      { params: { key: API_KEY } },
    )
    setSession({
      ...session,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
    })
    return data.id_token
  } catch {
    setSession(null) // 갱신 실패 = 세션 만료
    return null
  }
}

/** 로그인 상태 구독. 반환값을 호출하면 해제 */
export const watchAuth = (callback) => {
  listeners.add(callback)
  callback(
    session
      ? {
          uid: session.uid,
          email: session.email,
          displayName: session.displayName,
          photoURL: session.photoURL,
        }
      : null,
  )
  return () => listeners.delete(callback)
}
