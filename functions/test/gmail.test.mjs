import { getAccessToken, sendRaw, resetTokenCache } from '../gmail.js'

let fail = 0
const check = (n, ok, extra='') => { if(!ok) fail++; console.log(` ${ok?'OK  ':'실패 ✗'} ${n}${ok?'':' — '+extra}`) }

// fetch를 가로채 요청 내용을 들여다본다
const calls = []
const stub = (handler) => { global.fetch = async (url, init) => { calls.push({ url: String(url), init }); return handler(String(url), init) } }
const ok = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

console.log('=== 액세스 토큰 발급 ===')
resetTokenCache(); calls.length = 0
stub(() => ok({ access_token: 'AT-1', expires_in: 3600 }))
const t1 = await getAccessToken({ clientId:'cid', clientSecret:'sec', refreshToken:'rt' }, 0)
check('토큰 반환', t1 === 'AT-1', t1)
check('토큰 엔드포인트', calls[0].url === 'https://oauth2.googleapis.com/token', calls[0].url)
const body = Object.fromEntries(new URLSearchParams(calls[0].init.body))
check('grant_type=refresh_token', body.grant_type === 'refresh_token')
check('client_id 전달', body.client_id === 'cid')
check('client_secret 전달', body.client_secret === 'sec')
check('refresh_token 전달', body.refresh_token === 'rt')

console.log('\n=== 토큰 재사용 ===')
calls.length = 0
const t2 = await getAccessToken({ clientId:'cid', clientSecret:'sec', refreshToken:'rt' }, 1000)
check('유효하면 다시 안 받음', t2 === 'AT-1' && calls.length === 0, `호출 ${calls.length}회`)
calls.length = 0
stub(() => ok({ access_token: 'AT-2', expires_in: 3600 }))
const t3 = await getAccessToken({ clientId:'cid', clientSecret:'sec', refreshToken:'rt' }, 3600 * 1000)
check('만료되면 새로 받음', t3 === 'AT-2' && calls.length === 1, `${t3}, 호출 ${calls.length}회`)

console.log('\n=== 메일 전송 ===')
calls.length = 0
stub(() => ok({ id: 'MSG-1', labelIds: ['SENT'] }))
const r = await sendRaw('AT-9', 'RAW-BODY')
check('id 반환', r.id === 'MSG-1')
check('전송 엔드포인트', calls[0].url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', calls[0].url)
check('Bearer 토큰 실림', calls[0].init.headers.Authorization === 'Bearer AT-9')
check('raw를 그대로 보냄', JSON.parse(calls[0].init.body).raw === 'RAW-BODY')

console.log('\n=== 오류 처리 ===')
resetTokenCache()
global.fetch = async () => new Response(JSON.stringify({ error: { message: '토큰 만료' } }), { status: 401 })
let msg = ''
try { await getAccessToken({ clientId:'c', clientSecret:'s', refreshToken:'r' }, 0) } catch (e) { msg = e.message }
check('실패 시 원인이 메시지에 담김', msg.includes('401') && msg.includes('토큰 만료'), msg)

global.fetch = async () => new Response('그냥 텍스트', { status: 500 })
msg = ''
try { await sendRaw('AT', 'RAW') } catch (e) { msg = e.message }
check('JSON이 아닌 오류도 처리', msg.includes('500') && msg.includes('그냥 텍스트'), msg)

console.log('\n' + (fail ? `${fail}건 실패 ✗` : 'PASS — Gmail 모듈 전 항목 통과'))
process.exit(fail ? 1 : 0)
