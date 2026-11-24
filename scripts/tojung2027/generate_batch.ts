#!/usr/bin/env -S npx tsx
/**
 * 2027 토정비결 배치 생성 — Batch API(claude-sonnet-5-5, 50% 단가).
 *
 *   npx tsx scripts/tojung2027/generate_batch.ts plan    <ko|tr>   # 대상·최악 비용만 출력(호출 없음)
 *   npx tsx scripts/tojung2027/generate_batch.ts submit  <ko|tr>   # 배치 제출
 *   npx tsx scripts/tojung2027/generate_batch.ts wait    <ko|tr>   # 종료까지 폴링(60초 간격)
 *   npx tsx scripts/tojung2027/generate_batch.ts collect <ko|tr>   # 결과 저장·검증·draft 적재
 *   npx tsx scripts/tojung2027/generate_batch.ts revalidate <ko|tr> [--all] # 저장된 invalid(--all: ok 포함) 응답 재검증·적재(호출 없음)
 *   npx tsx scripts/tojung2027/generate_batch.ts publish            # ledger ok 건만 published(정책 0개일 때만)
 *   npx tsx scripts/tojung2027/generate_batch.ts status
 *
 * 노출 검사(leak-check.mjs): collect/revalidate는 노출이 있으면 invalid로 두고 적재하지 않으며,
 * publish는 공개 대상 행에 노출이 하나라도 있으면 거부한다. 전수 검사는 `npm run tojung:check`.
 *
 * ko = 한국어(prompts/v1.md, 001과 동일 입력·검증·적재), tr = en/ja/zh 번역(prompts/t1.md, 한국어 결과 입력).
 *
 * 중복 청구 방지(out/ledger.json):
 *   - custom_id별 제출 횟수를 create 호출 "전에" 기록한다. 2회(최초 + 재배치 1회)를 넘기려 하면 중단.
 *   - status가 ok인 custom_id(= out/에 검증 통과 결과가 있는 것)는 다시 요청하지 않는다.
 *   - 같은 phase에 아직 collect 안 된 배치가 있으면 submit을 거부한다(폴링 중 크래시 후 재제출 방지).
 *   - 누적 비용(실측) + 이번 배치 최악 비용(max_tokens 전부 사용 가정)이 $90을 넘으면 제출하지 않는다.
 * 사용자 사전 승인(2026-10-17 지시서): ko 71건 1회 + tr 216건 1회 + 실패 건 재배치 각 1회.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { Converter } from 'opencc-js'
import pg from 'pg'
import {
  BATCH_PRICE_IN, BATCH_PRICE_OUT, CODES, COST_CAP_USD, HERE, KO_VER, MAX_TOKENS, MODEL, MONTH_COLS, OUT, SCHEMA,
  TR_LANGS, TR_VER, allText, apiKey, clean, loadLedger, mapStrings, pgConfig, responsePath, saveLedger,
  upsert, validateStructure, type Ledger, type Result,
} from './lib'
import { findLeaks, leakErrors, MONTHLY_TEXT, YEARLY_TEXT } from './leak-check.mjs'

const [cmd, phase] = process.argv.slice(2)
const s2t = Converter({ from: 'cn', to: 'tw' })
mkdirSync(OUT, { recursive: true })

const LANG_NAME: Record<string, string> = { en: 'English', ja: 'Japanese', zh: 'Traditional Chinese (Taiwan)' }
const LANG_RULES: Record<string, string> = {
  en: 'Use natural American English.',
  ja: 'Write natural Japanese in です・ます style, using kanji and kana as a Japanese writer would.',
  zh: 'Write in Traditional Chinese as used in Taiwan (繁體中文). Never use Simplified Chinese characters.',
}
const NO_LEGACY = '(이 괘의 기존 풀이가 없습니다. 괘 번호·성별·정미년의 기운만으로 새로 작성하세요.)'

type Req = { custom_id: string; prompt: string; source?: string; dropped?: number }

// ---------- request builders ----------
async function koRequests(ledger: Ledger, db: pg.Client): Promise<Req[]> {
  const rows = (await db.query(`select num, nation, total, ${MONTH_COLS.join(', ')} from public.tojung`)).rows
  const by = new Map(rows.map((r) => [`${r.num}-${r.nation}`, r]))
  const tpl = readFileSync(resolve(HERE, 'prompts', `${KO_VER}.md`), 'utf8')
  const reqs: Req[] = []
  for (const code of CODES) {
    const id = `ko-${code}`
    if (ledger.requests[id]?.status === 'ok') continue
    // 입력 출처: 한국어(k) → 영어(e) → 일본어(j) → 중국어(c) → 없음
    let source = 'none', total = NO_LEGACY, months = NO_LEGACY
    const dropped: string[] = []
    for (const nat of ['k', 'e', 'j', 'c']) {
      const row = by.get(`${code}-${nat}`)
      if (!row) continue
      const d: string[] = []
      const t = clean(row.total, nat, d)
      const ms = MONTH_COLS.map((c, i) => `[${i + 1}월]\n${clean(row[c], nat, d)}`)
      if (!t.trim()) { dropped.push(...d); continue } // 정제 후 빈 행이면 다음 출처로
      source = nat; total = t; months = ms.join('\n\n'); dropped.push(...d)
      break
    }
    const prompt = tpl
      .replaceAll('{{gwae_code}}', code)
      .replaceAll('{{gender}}', Number(code) > 36 ? '여성' : '남성')
      .replaceAll('{{legacy_total}}', total)
      .replaceAll('{{legacy_months}}', months)
    reqs.push({ custom_id: id, prompt, source, dropped: dropped.length })
  }
  return reqs
}

function koResult(code: string): Result | null {
  const p = responsePath('ko', code)
  if (!existsSync(p)) return null
  const msg = JSON.parse(readFileSync(p, 'utf8'))
  return JSON.parse(msg.content.find((b: any) => b.type === 'text').text)
}

function trRequests(ledger: Ledger): Req[] {
  const tpl = readFileSync(resolve(HERE, 'prompts', `${TR_VER}.md`), 'utf8')
  const reqs: Req[] = []
  for (const lang of TR_LANGS) {
    for (const code of CODES) {
      const id = `${lang}-${code}`
      if (ledger.requests[`ko-${code}`]?.status !== 'ok') continue // 한국어 실패 코드는 건너뛴다
      if (ledger.requests[id]?.status === 'ok') continue
      const ko = koResult(code)!
      const prompt = tpl
        .replaceAll('{{lang_name}}', LANG_NAME[lang])
        .replaceAll('{{lang_rules}}', LANG_RULES[lang])
        .replaceAll('{{korean_json}}', JSON.stringify(ko, null, 1))
      reqs.push({ custom_id: id, prompt })
    }
  }
  return reqs
}

async function buildRequests(ledger: Ledger): Promise<Req[]> {
  if (phase === 'ko') {
    const db = new pg.Client(pgConfig()); await db.connect()
    try { return await koRequests(ledger, db) } finally { await db.end() }
  }
  if (phase === 'tr') return trRequests(ledger)
  throw new Error('phase는 ko 또는 tr')
}

// 재배치 한도: 이미 2번 제출된 custom_id는 대상에서 빼고 최종 실패로 남긴다.
function splitByLimit(ledger: Ledger, reqs: Req[]) {
  const ok = reqs.filter((r) => (ledger.requests[r.custom_id]?.submits ?? 0) < 2)
  const exhausted = reqs.filter((r) => (ledger.requests[r.custom_id]?.submits ?? 0) >= 2).map((r) => r.custom_id)
  return { ok, exhausted }
}

// 최악 비용: 입력은 프롬프트 글자 수 ≈ 토큰(한국어 보수 추정), 출력은 max_tokens 전부.
const worstUsd = (reqs: Req[]) =>
  reqs.reduce((s, r) => s + ([...r.prompt].length * BATCH_PRICE_IN + MAX_TOKENS * BATCH_PRICE_OUT) / 1e6, 0)

const params = (prompt: string) => ({
  model: MODEL,
  max_tokens: MAX_TOKENS,
  // generate_one.ts와 동일: extended thinking 끔(Sonnet 5.5 전용 값, SDK 타입 미반영)
  thinking: { type: 'between_tools' } as unknown as Anthropic.ThinkingConfigParam,
  output_config: { effort: 'high' as const, format: { type: 'json_schema' as const, schema: SCHEMA } },
  messages: [{ role: 'user' as const, content: prompt }],
})

// ---------- validation ----------
/**
 * 서비스명 표기 통일(재요청 없이 결정적 치환).
 *  - 한글 "토정비결"이 섞여 온 경우 → 土亭秘訣
 *  - ja: トジョン秘訣 → 土亭秘訣, 단독 가타카나 이름(トジョン・ビギョル/ピギョル 등) → 土亭秘訣.
 *    괄호 안 읽기 표기 「土亭秘訣(トジョンビギョル)」는 남기고 표기만 トジョンビギョル로 맞춘다.
 */
function normTerm(s: string, lang: string): string {
  s = s.replace(/土정비결|토정비결/g, '土亭秘訣')
  if (lang === 'ja') {
    s = s.replace(/トジョン秘訣/g, '土亭秘訣')
      .replace(/トジョン・?[ビピ]ギョル/g, 'トジョンビギョル')
      .replace(/(?<![(（])トジョンビギョル/g, '土亭秘訣')
  }
  return s
}
// 치환으로 생긴 중복 괄호 정리: 「土亭秘訣」(土亭秘訣) → 「土亭秘訣」, 土亭秘訣(土亭秘訣, X) → 土亭秘訣(X)
function tidyTerm(s: string): string {
  return s
    .replace(/(土亭[秘祕]訣[」》』]?)\s*[(（]土亭秘訣[)）]/g, '$1')
    .replace(/(土亭[秘祕]訣[」》』]?\s*[(（])土亭秘訣[,，、]\s*/g, '$1')
}

function validateTr(lang: string, code: string, raw: Result): { r: Result; errs: string[] } {
  const ko = koResult(code)!
  // 프롬프트 첫 줄의 "Tojeong Bigyeol (토정비결)"을 그대로 옮겨 적는 경우가 있다(ja·zh 「토정비결(…)」).
  // 재요청 대신 결정적으로 한자 표기로 바꾼다 — 그 외 한글은 아래 검증에서 그대로 실패시킨다.
  let r = mapStrings(raw, (s) => tidyTerm(normTerm(s, lang)))
  // 간체(秘诀 등)로 온 경우 s2t 뒤에야 정리 패턴에 걸리므로 한 번 더 정리한다. 띠 이름은 화면 라벨(紅羊之年)에 맞춘다.
  if (lang === 'zh') r = mapStrings(r, (s) => tidyTerm(s2t(s)).replace(/赤羊/g, '紅羊'))
  const errs = validateStructure(r)
  const text = allText(r)
  if (/[가-힣]/.test(text)) errs.push('한글 포함')
  if (lang === 'ja' && !/[ぁ-んァ-ン]/.test(text)) errs.push('가나 없음')
  if (lang === 'en' && /[一-龥ぁ-んァ-ン]{6,}/.test(text.replace(/丁未/g, ''))) errs.push('CJK 덩어리 포함')
  // 숫자·등급은 번역을 믿지 않고 한국어 값으로 덮는다.
  const koGrade = new Map(ko.months.map((m) => [m.month, m.grade]))
  r = {
    ...r,
    grade: ko.grade,
    good_months: ko.good_months,
    bad_months: ko.bad_months,
    lucky: { ...r.lucky, numbers: ko.lucky.numbers },
    months: r.months.map((m) => ({ ...m, grade: koGrade.get(m.month) ?? m.grade })),
  }
  return { r, errs }
}

// ---------- commands ----------
async function plan() {
  const ledger = loadLedger()
  const reqs = await buildRequests(ledger)
  const { ok, exhausted } = splitByLimit(ledger, reqs)
  console.log(`phase=${phase} 대상 ${ok.length}건 · 한도 소진 ${exhausted.length}건 · 누적 $${ledger.spent_usd.toFixed(4)} · 이번 최악 $${worstUsd(ok).toFixed(2)}`)
  if (phase === 'ko') console.table(ok.map((r) => ({ id: r.custom_id, source: r.source, dropped: r.dropped, chars: [...r.prompt].length })))
  else console.log(ok.slice(0, 3).map((r) => `${r.custom_id} ${[...r.prompt].length}자`).join('\n'))
  if (exhausted.length) console.log('한도 소진(요청 안 함):', exhausted.join(', '))
}

async function submit() {
  const ledger = loadLedger()
  const open = ledger.batches.filter((b) => !b.collected)
  if (open.length) throw new Error(`collect 안 된 배치가 있어 제출 거부: ${open.map((b) => `${b.phase}:${b.id}`).join(', ')}`)

  const reqs = await buildRequests(ledger)
  const { ok, exhausted } = splitByLimit(ledger, reqs)
  if (exhausted.length) console.log('한도 소진(요청 안 함, 최종 실패):', exhausted.join(', '))
  if (!ok.length) { console.log('제출할 요청 없음'); return }
  for (const r of ok) {
    if ((ledger.requests[r.custom_id]?.submits ?? 0) + 1 > 2) throw new Error(`STOP: ${r.custom_id}를 두 번 넘게 요청하려 함`)
    if (existsSync(responsePath(phase === 'ko' ? 'ko' : r.custom_id.slice(0, 2), r.custom_id.slice(-3))) && ledger.requests[r.custom_id]?.status === 'ok') {
      throw new Error(`STOP: ${r.custom_id}는 이미 결과가 있음`)
    }
  }
  const worst = worstUsd(ok)
  if (ledger.spent_usd + worst > COST_CAP_USD) {
    throw new Error(`STOP: 누적 $${ledger.spent_usd.toFixed(2)} + 최악 $${worst.toFixed(2)} > $${COST_CAP_USD}`)
  }

  // create 호출 전에 제출 횟수를 먼저 기록(크래시해도 재제출 방지 쪽으로 기운다)
  const rec = { id: null as string | null, phase, custom_ids: ok.map((r) => r.custom_id), created_at: new Date().toISOString(), worst_usd: Number(worst.toFixed(4)), collected: false }
  for (const r of ok) {
    const prev = ledger.requests[r.custom_id]
    ledger.requests[r.custom_id] = { ...prev, submits: (prev?.submits ?? 0) + 1, status: 'pending', ...(r.source ? { source: r.source, dropped: r.dropped } : {}) }
  }
  ledger.batches.push(rec)
  saveLedger(ledger)

  const client = new Anthropic({ apiKey: apiKey(), maxRetries: 0 })
  try {
    const batch = await client.messages.batches.create({
      requests: ok.map((r) => ({ custom_id: r.custom_id, params: params(r.prompt) })),
    })
    rec.id = batch.id
    saveLedger(ledger)
    console.log(`✔ 제출: ${batch.id} · ${ok.length}건 · 최악 $${worst.toFixed(2)} · status=${batch.processing_status}`)
  } catch (e) {
    rec.note = `create 실패: ${(e as Error).message}`
    saveLedger(ledger)
    throw e
  }
}

async function wait() {
  const ledger = loadLedger()
  const b = ledger.batches.find((x) => x.phase === phase && !x.collected && x.id)
  if (!b) { console.log('대기할 배치 없음'); return }
  const client = new Anthropic({ apiKey: apiKey(), maxRetries: 2 }) // 조회(retrieve)는 과금 없음
  for (;;) {
    const s = await client.messages.batches.retrieve(b.id!)
    const c = s.request_counts
    console.log(`${new Date().toISOString()} ${b.id} ${s.processing_status} · processing ${c.processing} · ok ${c.succeeded} · err ${c.errored} · exp ${c.expired}`)
    if (s.processing_status === 'ended') return
    await new Promise((r) => setTimeout(r, 60_000))
  }
}

async function collect() {
  const ledger = loadLedger()
  const pending = ledger.batches.filter((x) => x.phase === phase && !x.collected && x.id)
  if (!pending.length) { console.log('collect할 배치 없음'); return }
  const client = new Anthropic({ apiKey: apiKey(), maxRetries: 2 })
  const db = new pg.Client(pgConfig()); await db.connect()
  try {
    for (const b of pending) {
      const s = await client.messages.batches.retrieve(b.id!)
      if (s.processing_status !== 'ended') { console.log(`${b.id} 아직 ${s.processing_status}`); continue }
      let cost = 0, okN = 0, badN = 0
      for await (const res of await client.messages.batches.results(b.id!)) {
        const id = res.custom_id
        const [lang, code] = [id.slice(0, 2), id.slice(-3)]
        const st = ledger.requests[id]
        if (res.result.type !== 'succeeded') {
          st.status = res.result.type as any
          st.errors = [JSON.stringify((res.result as any).error ?? res.result.type).slice(0, 300)]
          badN++
          continue
        }
        const msg = res.result.message
        writeFileSync(responsePath(lang, code), JSON.stringify(msg, null, 2))
        st.usage = { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens }
        cost += (msg.usage.input_tokens * BATCH_PRICE_IN + msg.usage.output_tokens * BATCH_PRICE_OUT) / 1e6
        try {
          if (msg.stop_reason !== 'end_turn') throw new Error(`stop_reason=${msg.stop_reason}`)
          const raw = JSON.parse(msg.content.flatMap((x) => (x.type === 'text' ? [x.text] : [])).join('')) as Result
          const { r, errs } = lang === 'ko' ? { r: raw, errs: validateStructure(raw) } : validateTr(lang, code, raw)
          errs.push(...leakErrors(r, lang)) // 내부번호·성별 분류·키 노출이면 적재 거부(2026-11-24)
          if (errs.length) throw new Error(errs.join('; '))
          await db.query('begin')
          await upsert(db, lang, code, r, lang === 'ko' ? KO_VER : TR_VER)
          await db.query('commit')
          st.status = 'ok'; delete st.errors; okN++
        } catch (e) {
          await db.query('rollback').catch(() => {})
          st.status = 'invalid'; st.errors = [(e as Error).message.slice(0, 300)]; badN++
        }
      }
      ledger.spent_usd = Number((ledger.spent_usd + cost).toFixed(4))
      b.collected = true
      saveLedger(ledger)
      console.log(`✔ ${b.id}: ok ${okN} · 실패 ${badN} · 이번 $${cost.toFixed(4)} · 누적 $${ledger.spent_usd.toFixed(4)}`)
    }
  } finally {
    await db.end()
  }
}

// 저장된 응답을 다시 검증·적재(API 호출 없음). 검증 규칙을 고친 뒤 invalid 건에 쓴다.
async function revalidate() {
  const ledger = loadLedger()
  const db = new pg.Client(pgConfig()); await db.connect()
  let okN = 0
  try {
    for (const [id, st] of Object.entries(ledger.requests)) {
      if (st.status !== 'invalid' && !(process.argv.includes('--all') && st.status === 'ok')) continue
      const [lang, code] = [id.slice(0, 2), id.slice(-3)]
      if (phase === 'tr' ? lang === 'ko' : lang !== 'ko') continue
      const msg = JSON.parse(readFileSync(responsePath(lang, code), 'utf8'))
      try {
        if (msg.stop_reason !== 'end_turn') throw new Error(`stop_reason=${msg.stop_reason}`)
        const raw = JSON.parse(msg.content.flatMap((x: any) => (x.type === 'text' ? [x.text] : [])).join('')) as Result
        const { r, errs } = lang === 'ko' ? { r: raw, errs: validateStructure(raw) } : validateTr(lang, code, raw)
        errs.push(...leakErrors(r, lang)) // 내부번호·성별 분류·키 노출이면 적재 거부(2026-11-24)
        if (errs.length) throw new Error(errs.join('; '))
        await db.query('begin')
        await upsert(db, lang, code, r, lang === 'ko' ? KO_VER : TR_VER)
        await db.query('commit')
        st.status = 'ok'; delete st.errors; okN++
      } catch (e) {
        await db.query('rollback').catch(() => {})
        st.errors = [(e as Error).message.slice(0, 300)]
      }
    }
  } finally {
    await db.end()
  }
  saveLedger(ledger)
  console.log(`✔ revalidate ${phase}: ${okN}건 ok로 전환(API 호출 없음)`)
}

// 검증 통과(ledger ok) 건만 published로. 공개 select 정책이 없을 때(0016 적용 후)만 실행한다.
async function publish() {
  const ledger = loadLedger()
  const db = new pg.Client(pgConfig()); await db.connect()
  try {
    const pol = (await db.query(`select count(*)::int n from pg_policies where schemaname='public' and tablename in ('tojung_yearly','tojung_monthly')`)).rows[0].n
    if (pol !== 0) throw new Error(`STOP: tojung_yearly/monthly에 정책 ${pol}개 — 0016(공개 읽기 제거) 적용 전에는 published 전환 금지`)
    const ok = Object.entries(ledger.requests).filter(([, st]) => st.status === 'ok').map(([id]) => [id.slice(0, 2), id.slice(-3)])
    // 공개 전 마지막 관문: 공개할 행 전체를 노출 검사(2026-11-24). 하나라도 있으면 아무것도 공개하지 않는다.
    const leaks: string[] = []
    for (const [lang, code] of ok) {
      const key = [2027, 'legacy72', code, lang]
      const y = (await db.query(`select * from public.tojung_yearly where year=$1 and scheme=$2 and gwae_code=$3 and lang=$4`, key)).rows
      const ms = (await db.query(`select * from public.tojung_monthly where year=$1 and scheme=$2 and gwae_code=$3 and lang=$4`, key)).rows
      for (const r of y) for (const f of YEARLY_TEXT) for (const h of findLeaks(r[f], lang)) leaks.push(`${code}-${lang} ${f}: «${h.match}»`)
      for (const r of ms) for (const f of MONTHLY_TEXT) for (const h of findLeaks(r[f], lang)) leaks.push(`${code}-${lang} m${r.month}.${f}: «${h.match}»`)
    }
    if (leaks.length) throw new Error(`STOP: 내부정보 노출 ${leaks.length}건 — publish 거부\n  ${leaks.slice(0, 30).join('\n  ')}`)
    await db.query('begin')
    let y = 0, m = 0
    for (const [lang, code] of ok) {
      const key = [2027, 'legacy72', code, lang]
      y += (await db.query(`update public.tojung_yearly set status='published' where year=$1 and scheme=$2 and gwae_code=$3 and lang=$4`, key)).rowCount ?? 0
      m += (await db.query(`update public.tojung_monthly set status='published' where year=$1 and scheme=$2 and gwae_code=$3 and lang=$4`, key)).rowCount ?? 0
    }
    await db.query('commit')
    console.log(`✔ published: yearly ${y}행 · monthly ${m}행 (ledger ok ${ok.length}건)`)
  } catch (e) {
    await db.query('rollback').catch(() => {})
    throw e
  } finally {
    await db.end()
  }
}

function status() {
  const l = loadLedger()
  const rows: Record<string, Record<string, number>> = {}
  for (const [id, s] of Object.entries(l.requests)) {
    const lang = id.slice(0, 2)
    rows[lang] ??= {}
    rows[lang][s.status] = (rows[lang][s.status] ?? 0) + 1
  }
  console.table(rows)
  console.log(`누적 $${l.spent_usd} · 배치 ${l.batches.map((b) => `${b.phase}:${b.id}${b.collected ? '' : '(open)'}`).join(', ')}`)
  for (const [id, s] of Object.entries(l.requests)) if (s.status !== 'ok') console.log(` ${id} ${s.status} x${s.submits} ${s.errors?.join(' | ') ?? ''}`)
}

const run: Record<string, () => unknown> = { plan, submit, wait, collect, revalidate, publish, status }
if (!run[cmd]) { console.error('usage: generate_batch.ts <plan|submit|wait|collect|status> [ko|tr]'); process.exit(1) }
try { await run[cmd]() } catch (e) { console.error('x', (e as Error).message); process.exitCode = 1 }
