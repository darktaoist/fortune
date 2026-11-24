#!/usr/bin/env -S npx tsx
/**
 * 2027 토정비결 파일럿 — 괘 1개를 Claude API로 생성해 tojung_yearly(1행) +
 * tojung_monthly(12행)에 status='draft'로 upsert한다.
 *
 *   npx tsx scripts/tojung2027/generate_one.ts 001            # API 1회 호출 + 적재
 *   npx tsx scripts/tojung2027/generate_one.ts 001 --dry-run  # 프롬프트만 출력(호출·적재 없음)
 *   npx tsx scripts/tojung2027/generate_one.ts 001 --from-out # 저장된 응답으로 적재만(호출 없음)
 *
 * CLAUDE.md §1 예외(사용자 건별 승인) 범위:
 *   - 실행 1회 = API 호출 1회. SDK 자동 재시도 끔(maxRetries: 0), 실패 시 그대로 종료.
 *   - out/에 같은 괘·프롬프트 버전의 응답이 이미 있으면 호출을 거부한다(재실행 방지).
 *   - 키는 scripts/tojung2027/.env 의 ANTHROPIC_API_KEY만 읽는다(process.env 미사용).
 * DB는 scripts/db 방식(루트 .env의 SUPABASE_DATABASE_URL, pg)으로 기존 tojung을 읽고
 * 새 두 테이블에만 쓴다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import pg from 'pg'
import { leakErrors } from './leak-check.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const OUT = resolve(HERE, 'out')

const YEAR = 2027
const SCHEME = 'legacy72'
const LANG = 'ko'
const MODEL = 'claude-sonnet-5-5'
const PROMPT_VER = 'v1'
const MAX_TOKENS = 32000
// claude-sonnet-5-5 단가(USD / 1M tokens)
const PRICE_IN = 2.0
const PRICE_OUT = 10.0

const MONTH_COLS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

// ---------- args ----------
const args = process.argv.slice(2)
const code = args.find((a) => !a.startsWith('--')) ?? ''
const DRY = args.includes('--dry-run')
const FROM_OUT = args.includes('--from-out')
if (!/^[0-9]{3}$/.test(code) || code < '001' || code > '072') {
  console.error('usage: npx tsx scripts/tojung2027/generate_one.ts <001~072> [--dry-run|--from-out]')
  process.exit(1)
}

// tojungNumber() 역산: 001~036 남, 037~072 여. 띠는 양력 연도 기준이라(입춘 무시) 프롬프트에 넣지 않는다.
const gender = Number(code) > 36 ? '여성' : '남성'

const rawPath = resolve(OUT, `${YEAR}-${code}-${LANG}-${PROMPT_VER}.response.json`)
const usagePath = resolve(OUT, `${YEAR}-${code}-${LANG}-${PROMPT_VER}.usage.json`)

// ---------- env ----------
function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

function pgConfig() {
  const url = readEnv(resolve(ROOT, '.env')).SUPABASE_DATABASE_URL
  if (!url) throw new Error('SUPABASE_DATABASE_URL not found in .env')
  const m = url.match(/^postgres(?:ql)?:\/\/(.*)@([^/]+)\/(.+)$/)
  if (!m) throw new Error('Could not parse SUPABASE_DATABASE_URL')
  const ci = m[1].indexOf(':')
  return {
    user: m[1].slice(0, ci), password: m[1].slice(ci + 1),
    host: m[2].slice(0, m[2].lastIndexOf(':')), port: 5432, database: m[3],
    ssl: { rejectUnauthorized: false },
  }
}

// ---------- legacy input ----------
// 깨진 문장 제거: 한자·라틴 덩어리·깨진 문자·10자 미만 조각이 든 줄은 버린다.
function clean(text: string | null, dropped: string[]): string {
  return (text ?? '')
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return false
      const bad = /[一-龥]|[a-zA-Z]{3,}|\?\?|�/.test(t) || (t.length < 10 && !/^✨/.test(t))
      if (bad) dropped.push(t)
      return !bad
    })
    .join('\n')
}

// ---------- output schema ----------
const str = { type: 'string' }
const grade = { type: 'integer', enum: [1, 2, 3, 4, 5] }
const monthInt = { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
const obj = (props: Record<string, unknown>) => ({
  type: 'object', properties: props, required: Object.keys(props), additionalProperties: false,
})
const SCHEMA = obj({
  grade, headline: str, summary: str, total: str,
  wealth: str, career: str, love: str, health: str, family: str, caution: str,
  good_months: { type: 'array', items: monthInt },
  bad_months: { type: 'array', items: monthInt },
  lucky: obj({
    colors: { type: 'array', items: str },
    numbers: { type: 'array', items: { type: 'integer' } },
    direction: str,
    item: str,
  }),
  months: {
    type: 'array',
    items: obj({
      month: monthInt, grade, summary: str, body: str,
      wealth: str, career: str, love: str, health: str, advice: str,
    }),
  },
})

type Month = { month: number; grade: number; summary: string; body: string; wealth: string; career: string; love: string; health: string; advice: string }
type Result = {
  grade: number; headline: string; summary: string; total: string
  wealth: string; career: string; love: string; health: string; family: string; caution: string
  good_months: number[]; bad_months: number[]; lucky: Record<string, unknown>; months: Month[]
}

function validate(r: Result): string[] {
  const errs: string[] = []
  const months = [...r.months].map((m) => m.month).sort((a, b) => a - b)
  if (months.join(',') !== '1,2,3,4,5,6,7,8,9,10,11,12') errs.push(`months 1~12 불완전: ${months.join(',')}`)
  if (new Set(r.months.map((m) => m.grade)).size < 2) errs.push('월별 등급이 전부 같음')
  if (!r.good_months.length || !r.bad_months.length) errs.push('good_months/bad_months 비어 있음')
  return errs
}

function lengthReport(r: Result) {
  const len = (s: string) => [...s].length
  const row = (k: string, s: string, lo: number, hi: number) => ({ field: k, chars: len(s), target: `${lo}~${hi}`, ok: len(s) >= lo && len(s) <= hi })
  const rows = [
    row('total', r.total, 900, 1300),
    ...(['wealth', 'career', 'love', 'health', 'family', 'caution'] as const).map((k) => row(k, r[k], 300, 500)),
    ...r.months.map((m) => row(`m${m.month}.body`, m.body, 350, 550)),
  ]
  console.table(rows)
}

// ---------- main ----------
const db = new pg.Client(pgConfig())
await db.connect()
try {
  let message: Anthropic.Message

  if (FROM_OUT) {
    if (!existsSync(rawPath)) throw new Error(`저장된 응답 없음: ${rawPath}`)
    message = JSON.parse(readFileSync(rawPath, 'utf8'))
    console.log(`→ 저장된 응답 사용(API 호출 없음): ${rawPath}`)
  } else {
    const legacy = (await db.query(
      `select total, ${MONTH_COLS.join(', ')} from public.tojung where num = $1 and nation = 'k'`, [code],
    )).rows[0]
    if (!legacy) throw new Error(`public.tojung에 num='${code}', nation='k' 행이 없음`)

    const dropped: string[] = []
    const legacyTotal = clean(legacy.total, dropped)
    const legacyMonths = MONTH_COLS.map((c, i) => `[${i + 1}월]\n${clean(legacy[c], dropped)}`).join('\n\n')
    console.log(`→ 입력: tojung num='${code}' nation='k' (${gender}) · 제거한 줄 ${dropped.length}개`)
    for (const d of dropped) console.log(`   - ${d.slice(0, 80)}`)

    const prompt = readFileSync(resolve(HERE, 'prompts', `${PROMPT_VER}.md`), 'utf8')
      .replaceAll('{{gwae_code}}', code)
      .replaceAll('{{gender}}', gender)
      .replaceAll('{{legacy_total}}', legacyTotal)
      .replaceAll('{{legacy_months}}', legacyMonths)

    if (DRY) {
      console.log(`\n----- prompt (${[...prompt].length}자) -----\n${prompt}`)
      process.exit(0)
    }
    if (existsSync(rawPath)) {
      throw new Error(`이미 생성된 응답이 있어 호출하지 않음(재실행 방지): ${rawPath}\n적재만 하려면 --from-out`)
    }

    const apiKey = existsSync(resolve(HERE, '.env')) ? readEnv(resolve(HERE, '.env')).ANTHROPIC_API_KEY : undefined
    if (!apiKey) throw new Error('scripts/tojung2027/.env 에 ANTHROPIC_API_KEY 없음')

    const client = new Anthropic({ apiKey, maxRetries: 0 })
    console.log(`→ ${MODEL} 호출 1회 (max_tokens ${MAX_TOKENS}, 재시도 없음)…`)
    const t0 = Date.now()
    message = await client.messages
      .stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // 사고 토큰이 출력 상한을 잠식하지 않도록 extended thinking을 끈다(Sonnet 5.5 전용 값, SDK 0.102 타입 미반영).
        thinking: { type: 'between_tools' } as unknown as Anthropic.ThinkingConfigParam,
        output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content: prompt }],
      })
      .finalMessage()
    console.log(`✔ 응답 수신 ${((Date.now() - t0) / 1000).toFixed(1)}s · stop_reason=${message.stop_reason}`)

    mkdirSync(OUT, { recursive: true })
    writeFileSync(rawPath, JSON.stringify(message, null, 2))
    const u = message.usage
    const cost = (u.input_tokens * PRICE_IN + u.output_tokens * PRICE_OUT) / 1e6
    const usage = { model: MODEL, prompt_ver: PROMPT_VER, gwae_code: code, stop_reason: message.stop_reason, usage: u, est_cost_usd: Number(cost.toFixed(4)), at: new Date().toISOString() }
    writeFileSync(usagePath, JSON.stringify(usage, null, 2))
    console.log(`→ usage: in ${u.input_tokens} / out ${u.output_tokens} tokens · 예상 비용 $${cost.toFixed(4)}`)
    console.log(`→ 저장: ${rawPath}`)
  }

  if (message.stop_reason !== 'end_turn') throw new Error(`stop_reason=${message.stop_reason} — 적재하지 않고 중단`)
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  const r = JSON.parse(text) as Result

  const errs = [...validate(r), ...leakErrors(r, 'ko')] // 내부번호·성별 분류·키 노출이면 적재 거부(2026-11-24)
  lengthReport(r)
  if (errs.length) throw new Error(`검증 실패 — 적재하지 않음:\n  ${errs.join('\n  ')}`)

  await db.query('begin')
  await db.query(
    `insert into public.tojung_yearly
       (year, scheme, gwae_code, lang, grade, headline, summary, total, wealth, career, love, health, family, caution,
        good_months, bad_months, lucky, status, model, prompt_ver)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'draft',$18,$19)
     on conflict (year, scheme, gwae_code, lang) do update set
       grade=excluded.grade, headline=excluded.headline, summary=excluded.summary, total=excluded.total,
       wealth=excluded.wealth, career=excluded.career, love=excluded.love, health=excluded.health,
       family=excluded.family, caution=excluded.caution, good_months=excluded.good_months,
       bad_months=excluded.bad_months, lucky=excluded.lucky, status='draft', model=excluded.model,
       prompt_ver=excluded.prompt_ver`,
    [YEAR, SCHEME, code, LANG, r.grade, r.headline, r.summary, r.total, r.wealth, r.career, r.love, r.health,
      r.family, r.caution, r.good_months, r.bad_months, JSON.stringify(r.lucky), MODEL, PROMPT_VER],
  )
  for (const m of r.months) {
    await db.query(
      `insert into public.tojung_monthly
         (year, scheme, gwae_code, lang, month, grade, summary, body, wealth, career, love, health, advice, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft')
       on conflict (year, scheme, gwae_code, lang, month) do update set
         grade=excluded.grade, summary=excluded.summary, body=excluded.body, wealth=excluded.wealth,
         career=excluded.career, love=excluded.love, health=excluded.health, advice=excluded.advice, status='draft'`,
      [YEAR, SCHEME, code, LANG, m.month, m.grade, m.summary, m.body, m.wealth, m.career, m.love, m.health, m.advice],
    )
  }
  await db.query('commit')
  console.log(`✔ upsert: tojung_yearly 1행 + tojung_monthly ${r.months.length}행 (status=draft)`)
} catch (err) {
  await db.query('rollback').catch(() => {})
  console.error('x', (err as Error).message)
  process.exitCode = 1
} finally {
  await db.end()
}
