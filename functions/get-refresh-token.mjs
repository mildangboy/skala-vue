/**
 * Gmail 리프레시 토큰 발급 (로컬에서 한 번만 실행)
 *
 *   node get-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * 브라우저로 구글 로그인 → 동의하면 리프레시 토큰이 터미널에 출력된다.
 * 출력된 값은 Secret Manager에만 넣고 코드나 Git에는 두지 않는다.
 *
 * 이 스크립트는 로컬 임시 서버(http://localhost:8910)로 인증 코드를 받는다.
 * OAuth 클라이언트의 '승인된 리디렉션 URI'에 아래 주소를 등록해야 한다.
 *   http://localhost:8910/callback
 */
import { createServer } from 'node:http'
import { google } from 'googleapis'

const [clientId, clientSecret] = process.argv.slice(2)
if (!clientId || !clientSecret) {
  console.error('사용법: node get-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>')
  process.exit(1)
}

const REDIRECT = 'http://localhost:8910/callback'
const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT)

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline', // 리프레시 토큰을 받으려면 필수
  prompt: 'consent', // 이미 동의했어도 토큰을 다시 발급받도록
  scope: ['https://www.googleapis.com/auth/gmail.send'],
})

console.log('\n아래 주소를 브라우저에서 열어 로그인·동의하세요:\n')
console.log(authUrl)
console.log('\n대기 중... (동의를 마치면 이 창에 토큰이 출력됩니다)\n')

const server = createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) {
    res.writeHead(404).end()
    return
  }
  const code = new URL(req.url, REDIRECT).searchParams.get('code')
  if (!code) {
    res.writeHead(400).end('code 파라미터가 없습니다.')
    return
  }
  try {
    const { tokens } = await oauth2.getToken(code)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h2>완료되었습니다. 터미널을 확인하세요.</h2>')

    console.log('─'.repeat(60))
    if (tokens.refresh_token) {
      console.log('GMAIL_REFRESH_TOKEN =')
      console.log(tokens.refresh_token)
    } else {
      console.log('리프레시 토큰이 오지 않았습니다.')
      console.log('구글 계정 > 보안 > 서드파티 앱에서 기존 권한을 삭제한 뒤 다시 실행해보세요.')
    }
    console.log('─'.repeat(60))
    console.log('\n이 값을 Secret Manager에 넣고, 터미널 기록은 지워두세요.')
  } catch (err) {
    res.writeHead(500).end('토큰 교환 실패: ' + err.message)
    console.error('토큰 교환 실패:', err.message)
  } finally {
    server.close()
  }
})

server.listen(8910)
