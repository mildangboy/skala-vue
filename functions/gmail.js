/**
 * Gmail 발송 (REST 직접 호출).
 *
 * googleapis 패키지를 쓰지 않는다. 그 패키지는 구글의 모든 API를 한 덩어리로
 * 담고 있어 116MB에 달하는데, 여기서 필요한 건 토큰 갱신과 메일 전송 두 개뿐이다.
 * 배포할 때마다 그만큼을 내려받아 설치하느라 빌드가 길어졌다.
 *
 * 두 요청 모두 공개된 REST 엔드포인트라 별도 SDK가 필요 없다.
 *   1) 리프레시 토큰 → 액세스 토큰   (oauth2.googleapis.com/token)
 *   2) 액세스 토큰으로 메일 전송      (gmail.googleapis.com/.../messages/send)
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const TIMEOUT = 10000

/** 응답이 실패면 본문까지 담아 던진다 (로그에서 원인을 바로 보려고) */
const readOrThrow = async (res, what) => {
  const text = await res.text()
  if (!res.ok) {
    let detail = text.slice(0, 300)
    try {
      detail = JSON.parse(text)?.error?.message ?? detail
    } catch {
      // 본문이 JSON이 아니면 그대로 쓴다
    }
    throw new Error(`${what} 실패 (${res.status}): ${detail}`)
  }
  return text ? JSON.parse(text) : {}
}

/**
 * 리프레시 토큰으로 액세스 토큰을 받는다.
 *
 * 액세스 토큰은 한 시간짜리라 함수 인스턴스가 살아 있는 동안 재사용한다.
 * 매 발송마다 새로 받으면 수신자 수만큼 불필요한 왕복이 생긴다.
 */
let cached = { token: '', expiresAt: 0 }

export const getAccessToken = async ({ clientId, clientSecret, refreshToken }, now = Date.now()) => {
  if (cached.token && now < cached.expiresAt) return cached.token

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  const data = await readOrThrow(res, '액세스 토큰 발급')

  // 만료 60초 전에는 새로 받는다
  cached = {
    token: data.access_token,
    expiresAt: now + (Number(data.expires_in ?? 3600) - 60) * 1000,
  }
  return cached.token
}

/** 테스트에서 캐시를 비울 때 쓴다 */
export const resetTokenCache = () => {
  cached = { token: '', expiresAt: 0 }
}

/** base64url로 인코딩된 원문(raw)을 그대로 보낸다 */
export const sendRaw = async (accessToken, raw) => {
  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  return readOrThrow(res, '메일 전송')
}
