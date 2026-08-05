/**
 * 프런트와 Cloud Function이 복사해 쓰는 파일이 어긋났는지 검사한다.
 *
 * 왜 필요한가.
 *
 * functions/는 프런트와 별도로 배포되어 src/를 import할 수 없다. 그래서 같은
 * 내용을 양쪽에 두고 손으로 맞춰왔다. 문제는 한쪽만 고쳐도 아무 일도 일어나지
 * 않는다는 점이다. 빌드도 통과하고 테스트도 통과하고, 알림 메일만 조용히
 * 옛 일정으로 나간다. 어긋난 순간이 아니라 메일이 틀린 뒤에야 알게 된다.
 *
 * 사람이 기억해야만 지켜지는 규칙은 언젠가 안 지켜진다. 그래서 CI가 본다.
 *
 * 왜 '몇 줄 건너뛰기'가 아닌가.
 *
 * 처음 떠오르는 방법은 functions/ 쪽 머리말 두 줄을 tail -n +3으로 건너뛰고
 * 비교하는 것이다. 실제로 지금은 그게 맞다. 하지만 그 두 줄은 설명이라
 * 언젠가 늘거나 준다. 그때 이 검사는 '내용이 달라졌다'가 아니라 '줄 수가
 * 달라졌다'로 실패한다. 거짓 실패가 몇 번 반복되면 사람은 검사를 끈다.
 *
 * 그래서 줄 수를 세지 않고 '머리말 주석이 끝나는 곳부터' 본다.
 * 머리말은 양쪽이 다른 게 정상이고(각자 자기 맥락을 설명한다), 그 아래
 * 실제 내용만 같으면 된다.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 함께 유지해야 하는 짝 — 새로 복사한 파일이 생기면 여기에 추가한다 */
const PAIRS = [
  ['functions/f1Calendar2026.js', 'src/data/f1Calendar2026.js'],
  ['functions/weatherText.js', 'src/utils/weatherText.js'],
]

/**
 * 파일 맨 위의 주석과 빈 줄을 걷어낸다.
 * 코드가 시작되는 첫 줄에서 멈추므로, 머리말이 몇 줄이든 상관없다.
 */
const stripHeader = (source) => {
  const lines = source.split('\n')
  let i = 0
  let inBlock = false

  for (; i < lines.length; i += 1) {
    const line = lines[i].trim()

    if (inBlock) {
      if (line.endsWith('*/')) inBlock = false
      continue
    }
    if (line === '') continue
    if (line.startsWith('//')) continue
    if (line.startsWith('/*')) {
      // 한 줄짜리 블록 주석(/* ... */)은 여기서 이미 닫힌다
      if (!line.endsWith('*/')) inBlock = true
      continue
    }
    break
  }

  return lines.slice(i).join('\n').trimEnd()
}

const read = (rel) => {
  try {
    return stripHeader(readFileSync(resolve(ROOT, rel), 'utf8'))
  } catch (err) {
    console.log(`FAIL  ${rel} — 읽지 못했습니다 (${err.code ?? err.message})`)
    return null
  }
}

let failed = 0

for (const [a, b] of PAIRS) {
  const left = read(a)
  const right = read(b)
  if (left === null || right === null) {
    failed += 1
    continue
  }

  if (left === right) {
    console.log(`PASS  ${a}  ==  ${b}`)
    continue
  }

  failed += 1
  const la = left.split('\n')
  const lb = right.split('\n')
  const at = la.findIndex((line, i) => line !== lb[i])

  console.log(`FAIL  ${a}  !=  ${b}`)
  // 어느 줄이 처음 갈라졌는지까지 알려준다. '다르다'만 알면 결국 눈으로 다 훑어야 한다.
  if (at >= 0) {
    console.log(`      머리말을 뺀 ${at + 1}번째 줄부터 다릅니다`)
    console.log(`      ${a.padEnd(34)} ${JSON.stringify(la[at] ?? '(줄 없음)')}`)
    console.log(`      ${b.padEnd(34)} ${JSON.stringify(lb[at] ?? '(줄 없음)')}`)
  } else {
    console.log(`      한쪽이 더 깁니다 (${la.length}줄 vs ${lb.length}줄)`)
  }
  console.log(`      한쪽만 고치셨다면 나머지 한쪽에도 같은 수정을 반영해주세요.`)
}

console.log(
  failed ? `\n${failed}쌍이 어긋났습니다` : `\n복사본 ${PAIRS.length}쌍이 모두 같습니다`,
)
process.exit(failed ? 1 : 0)
