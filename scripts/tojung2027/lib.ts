/**
 * 2027 토정비결 생성 공용 모듈 — generate_batch.ts가 쓴다.
 * (generate_one.ts는 001 파일럿 당시 그대로 둔다. 스키마·검증·적재 SQL은 동일하다.)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'

export const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(HERE, '../..')
export const OUT = resolve(HERE, 'out')

export const YEAR = 2027
export const SCHEME = 'legacy72'
export const MODEL = 'claude-sonnet-5-5'
export const MAX_TOKENS = 32000
export const KO_VER = 'v1'
export const TR_VER = 't1'
// Batch API 단가(USD / 1M tokens) — claude-sonnet-5-5 표준가 $2/$10의 50%
export const BATCH_PRICE_IN = 1.0
export const BATCH_PRICE_OUT = 5.0
export const COST_CAP_USD = 90

export const MONTH_COLS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const
export const CODES = Array.from({ length: 72 }, (_, i) => String(i + 1).padStart(3, '0'))
export const TR_LANGS = ['en', 'ja', 'zh'] as const

// ---------- env / db ----------
export function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

export function pgConfig() {
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

export function apiKey(): string {
  const f = resolve(HERE, '.env')
  const key = existsSync(f) ? readEnv(f).ANTHROPIC_API_KEY : undefined
  if (!key) throw new Error('scripts/tojung2027/.env 에 ANTHROPIC_API_KEY 없음')
  return key
}

// ---------- output schema (generate_one.ts와 동일) ----------
const str = { type: 'string' }
const grade = { type: 'integer', enum: [1, 2, 3, 4, 5] }
const monthInt = { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
const obj = (props: Record<string, unknown>) => ({
  type: 'object', properties: props, required: Object.keys(props), additionalProperties: false,
})
export const SCHEMA = obj({
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

export type Month = { month: number; grade: number; summary: string; body: string; wealth: string; career: string; love: string; health: string; advice: string }
export type Result = {
  grade: number; headline: string; summary: string; total: string
  wealth: string; career: string; love: string; health: string; family: string; caution: string
  good_months: number[]; bad_months: number[]
  lucky: { colors: string[]; numbers: number[]; direction: string; item: string }
  months: Month[]
}

export function validateStructure(r: Result): string[] {
  const errs: string[] = []
  const months = [...r.months].map((m) => m.month).sort((a, b) => a - b)
  if (months.join(',') !== '1,2,3,4,5,6,7,8,9,10,11,12') errs.push(`months 1~12 불완전: ${months.join(',')}`)
  if (new Set(r.months.map((m) => m.grade)).size < 2) errs.push('월별 등급이 전부 같음')
  if (!r.good_months.length || !r.bad_months.length) errs.push('good_months/bad_months 비어 있음')
  return errs
}

/** 결과의 모든 문자열 필드에 f를 적용한 사본. */
export function mapStrings(r: Result, f: (s: string) => string): Result {
  const walk = (v: unknown): unknown =>
    typeof v === 'string' ? f(v) : Array.isArray(v) ? v.map(walk)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v
  return walk(r) as Result
}

export function allText(r: Result): string {
  const parts: string[] = []
  mapStrings(r, (s) => { parts.push(s); return s })
  return parts.join('\n')
}

// ---------- legacy input ----------
/**
 * 깨진 문장 제거. 한국어 원본(k)에는 한자·라틴 덩어리·깨진 문자·10자 미만 조각을 거르고,
 * 다른 언어 원본(e/j/c)에는 깨진 문자만 거른다(한자·라틴이 정상 본문이므로).
 */
export function clean(text: string | null, nation: string, dropped: string[]): string {
  return (text ?? '')
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return false
      const garbled = /\?\?|�/.test(t)
      const bad = nation === 'k'
        ? garbled || /[一-龥]|[a-zA-Z]{3,}/.test(t) || (t.length < 10 && !/^✨/.test(t))
        : garbled
      if (bad) dropped.push(t)
      return !bad
    })
    .join('\n')
}

// ---------- ledger (중복 청구 방지) ----------
export type ReqState = {
  submits: number
  status: 'pending' | 'ok' | 'invalid' | 'errored' | 'expired' | 'canceled'
  errors?: string[]
  source?: string // ko: 입력 출처 k/e/j/c/none
  dropped?: number
  usage?: { input_tokens: number; output_tokens: number }
}
export type BatchRec = { id: string | null; phase: string; custom_ids: string[]; created_at: string; worst_usd: number; collected: boolean; note?: string }
export type Ledger = { spent_usd: number; requests: Record<string, ReqState>; batches: BatchRec[] }

const LEDGER = resolve(OUT, 'ledger.json')

export function loadLedger(): Ledger {
  if (existsSync(LEDGER)) return JSON.parse(readFileSync(LEDGER, 'utf8'))
  // 첫 실행: 001 파일럿(실시간 호출 1회, 표준가)을 기록에 넣는다.
  const u = JSON.parse(readFileSync(resolve(OUT, `${YEAR}-001-ko-${KO_VER}.usage.json`), 'utf8'))
  return {
    spent_usd: u.est_cost_usd,
    requests: { 'ko-001': { submits: 1, status: 'ok', source: 'k', dropped: 0, usage: { input_tokens: u.usage.input_tokens, output_tokens: u.usage.output_tokens } } },
    batches: [],
  }
}

export function saveLedger(l: Ledger) {
  writeFileSync(LEDGER, JSON.stringify(l, null, 2))
}

export const responsePath = (lang: string, code: string) =>
  resolve(OUT, `${YEAR}-${code}-${lang}-${lang === 'ko' ? KO_VER : TR_VER}.response.json`)

// ---------- db upsert ----------
export async function upsert(db: pg.Client, lang: string, code: string, r: Result, promptVer: string) {
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
    [YEAR, SCHEME, code, lang, r.grade, r.headline, r.summary, r.total, r.wealth, r.career, r.love, r.health,
      r.family, r.caution, r.good_months, r.bad_months, JSON.stringify(r.lucky), MODEL, promptVer],
  )
  for (const m of r.months) {
    await db.query(
      `insert into public.tojung_monthly
         (year, scheme, gwae_code, lang, month, grade, summary, body, wealth, career, love, health, advice, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft')
       on conflict (year, scheme, gwae_code, lang, month) do update set
         grade=excluded.grade, summary=excluded.summary, body=excluded.body, wealth=excluded.wealth,
         career=excluded.career, love=excluded.love, health=excluded.health, advice=excluded.advice, status='draft'`,
      [YEAR, SCHEME, code, lang, m.month, m.grade, m.summary, m.body, m.wealth, m.career, m.love, m.health, m.advice],
    )
  }
}
