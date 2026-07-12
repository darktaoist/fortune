#!/usr/bin/env node
/**
 * 오늘의 운세(today 테이블) 콘텐츠 전면 재생성.
 *
 *  - 120개 번호(to000~to119) × 7컬럼(total/money/biz/job/love/wish/hope).
 *  - 한국어 정본 생성(톤 기복: 대길/길/평/주의) → en/ja/zh(번체) 현지화 번역.
 *  - 결과를 scripts/db/_gen/today-generated.json 에 "증분 저장"(재개 가능).
 *  - 이 스크립트는 DB에 쓰지 않는다. 적용은 apply-today.mjs 가 담당.
 *
 * 사용:
 *   node scripts/db/gen-today.mjs 000            # 스모크: to000 하나만
 *   node scripts/db/gen-today.mjs                # 전량(120개), 이미 된 건 건너뜀
 *   node scripts/db/gen-today.mjs --force        # 전량 재생성(기존 무시)
 */
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = resolve(ROOT, 'scripts/db/_gen')
const OUT = resolve(OUT_DIR, 'today-generated.json')

// .env 에서 키/모델
const env = readFileSync(resolve(ROOT, '.env'), 'utf8')
const getEnv = (k) => (env.split('\n').find((l) => l.startsWith(k + '=')) || '').split('=').slice(1).join('=').trim()
const API_KEY = process.env.ANTHROPIC_API_KEY || getEnv('ANTHROPIC_API_KEY')
const MODEL = process.env.PREMIUM_MODEL || getEnv('PREMIUM_MODEL') || 'claude-sonnet-4-6'
if (!API_KEY) { console.error('ANTHROPIC_API_KEY 없음'); process.exit(1) }
const client = new Anthropic({ apiKey: API_KEY })

// ── 인자 ──
const rawArgs = process.argv.slice(2)
const FORCE = rawArgs.includes('--force')
const onlyNums = rawArgs.filter((a) => /^\d{1,3}$/.test(a)).map((a) => a.padStart(3, '0'))
const ALL = Array.from({ length: 120 }, (_, i) => String(i).padStart(3, '0'))
const NUMS = onlyNums.length ? onlyNums : ALL
const CONCURRENCY = onlyNums.length ? 1 : 6

// ── 톤 분포(대길 18 / 길 42 / 평 42 / 주의 18 = 120) ──
// 번호 i → pool[(i*47)%120] 스캐터(47은 120과 서로소, 5의 배수 아님) → 톤이 연속번호에
// 몰리지 않고, 일자별 +5 mod 120 진행에도 특정 톤에 고정되지 않는다.
const POOL = [
  ...Array(18).fill('대길'), ...Array(42).fill('길'),
  ...Array(42).fill('평'), ...Array(18).fill('주의'),
]
const toneOf = (numStr) => POOL[(parseInt(numStr, 10) * 47) % 120]

const TONE_GUIDE = {
  대길: '오늘 운이 매우 좋은 날. 자신감 있게 밀어붙여도 좋은, 확신과 도약의 어조.',
  길: '대체로 순조롭고 긍정적인 날. 기분 좋은 흐름과 소소한 행운의 어조.',
  평: '무난하고 잔잔한 날. 큰 기복 없이 안정과 내실을 권하는 담담한 어조.',
  주의: '조심이 필요한 날. 겁주지 않되 과속·성급함·감정 소모를 경계하고 대비를 권하는 건설적 어조.',
}

const COLS = ['total', 'money', 'biz', 'job', 'love', 'wish', 'hope']
const COL_KO = {
  total: '총운(오늘 하루 전반의 기운)', money: '재물운(금전·수입·지출)',
  biz: '사업운(사업·거래·확장)', job: '직장운(업무·승진·인간관계)',
  love: '애정운(연애·부부·인연)', wish: '소망운(바라는 일의 성취)',
  hope: '희망(오늘을 맺는 따뜻한 덕담 한 단락)',
}

const KO_SCHEMA = {
  type: 'object', additionalProperties: false, required: COLS,
  properties: Object.fromEntries(COLS.map((c) => [c, { type: 'string' }])),
}
const TR_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['e', 'j', 'c'],
  properties: Object.fromEntries(['e', 'j', 'c'].map((n) => [n, KO_SCHEMA])),
}

async function structured(system, user, schema, maxTokens = 4000) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL, max_tokens: maxTokens, thinking: { type: 'disabled' },
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: user }],
      })
      const block = (res.content || []).find((b) => b.type === 'text')
      const text = block?.text || ''
      try { return JSON.parse(text) } catch {
        const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('parse')
      }
    } catch (e) {
      if (attempt === 2) throw e
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
}

const KO_SYS = [
  '너는 타오운세의 "오늘의 운세" 카피라이터다. 사주 번호별 오늘 하루 운세를 집필한다.',
  '',
  '[출력 항목] 7개를 각각 독립된 한 단락으로 쓴다:',
  ...COLS.map((c) => `- ${c}: ${COL_KO[c]}`),
  '',
  '[문체·형식]',
  '- 현대적이고 따뜻한 상담조의 존댓말 산문. 점술 특유의 운치·조언을 충분히 살리되(구체적 처세·주의·건강·인간관계 지침 포함), 어색한 옛 번역투는 피하고 자연스러운 현대 한국어로 쓴다.',
  '- 분량(매우 중요): total(총운)은 한국어 기준 350~450자, 2~3단락의 풍부하고 다면적인 풀이 — 오늘의 전반 기운에 더해 건강·처세·인간관계·재물·행동 지침 등 "여러 측면의 구체적 조언"을 실속 있게 녹인다. 나머지 6개 항목(money/biz/job/love/wish/hope)은 각 180~260자로, 해당 영역을 깊이 있고 구체적으로 풀되 서로 다른 조언을 담는다. 막연한 미사여구로 길이만 늘리지 말고 실질 조언으로 채운다.',
  '- 각 항목은 항목명·소제목·불릿·이모지·마크다운 없이 곧바로 풀이 산문으로 시작한다. total은 단락 사이를 빈 줄 하나로 구분해도 된다.',
  '- 7개 항목은 "오늘 하루의 톤"을 일관되게 공유한다. 특히 주의·평 톤이면 막연한 칭찬이 아니라 조심할 점·대비책을 구체적으로 제시한다.',
  '- 매 번호가 서로 다른 하루가 되도록 소재·상황·표현을 다양화한다(클리셰·상투구 반복 금지).',
].join('\n')

const TR_SYS = [
  '너는 타오운세의 다국어 현지화 번역가다. 한국어 "오늘의 운세" 정본을 각 언어로 옮긴다.',
  '- 직역이 아니라, 그 언어 사용자가 자연스럽게 읽는 운세 상담조 산문으로 현지화한다.',
  '- 톤·의미·구체적 조언을 빠짐없이 보존한다. 원문의 분량·밀도·단락 구조를 유지하고 짧게 줄이지 않는다(total은 길고 풍부, 나머지도 원문 길이에 상응).',
  '- 이모지·마크다운·항목명 반복 금지.',
  '- e=English, j=자연스러운 일본어, c=繁體中文(대만 번체). c는 반드시 번체로 쓰고 간체(简体)를 절대 쓰지 않는다.',
].join('\n')

async function genOne(numStr) {
  const tone = toneOf(numStr)
  const ko = await structured(
    KO_SYS,
    `번호 ${numStr}. 오늘의 톤 = "${tone}"(${TONE_GUIDE[tone]})\n이 톤을 7개 항목 전체에 일관되게 반영해 한국어 정본을 JSON으로 작성하라. total은 350~450자로 풍부하게, 나머지는 각 180~260자로.`,
    KO_SCHEMA,
    6000,
  )
  const tr = await structured(
    TR_SYS,
    `다음은 번호 ${numStr}(톤 ${tone})의 한국어 정본이다:\n${JSON.stringify(ko, null, 0)}\n\n이를 e/j/c 세 언어로 각각 현지화 번역해 JSON으로 반환하라. 원문의 길이·밀도를 유지하라.`,
    TR_SCHEMA,
    16000,
  )
  return { num: numStr, tone, k: ko, e: tr.e, j: tr.j, c: tr.c }
}

// ── 실행 ──
mkdirSync(OUT_DIR, { recursive: true })
const store = !FORCE && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const todo = NUMS.filter((n) => FORCE || !store[n])
console.log(`모델=${MODEL} | 대상 ${NUMS.length}개 중 생성필요 ${todo.length}개 | 동시성 ${CONCURRENCY}`)

let done = 0, failed = []
async function worker(queue) {
  while (queue.length) {
    const n = queue.shift()
    try {
      store[n] = await genOne(n)
      writeFileSync(OUT, JSON.stringify(store, null, 2)) // 증분 저장
      done++
      if (done % 5 === 0 || todo.length <= 5) console.log(`  ...${done}/${todo.length} (마지막 to${n}, 톤 ${store[n].tone})`)
    } catch (e) {
      failed.push(n); console.error(`  ✗ to${n} 실패: ${e.message}`)
    }
  }
}
const queue = [...todo]
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))

console.log(`\n생성 완료: ${done}개 저장 → ${OUT}`)
if (failed.length) { console.error(`실패 ${failed.length}개: ${failed.join(',')} (재실행하면 이어서 채움)`); process.exit(2) }
console.log(`전체 저장분: ${Object.keys(store).length}/120`)
