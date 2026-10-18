#!/usr/bin/env -S npx tsx
/**
 * 일주 60 × 2027 정미년 참고 해석(ilju_yearly) 배치 생성 — Batch API(claude-sonnet-5-5, 50% 단가).
 * 유료 신년운세·평생사주 프롬프트의 "참고 해석" 재료(server/utils/iljuRef.ts가 읽는다).
 *
 *   npx tsx scripts/tojung2027/ilju_batch.ts plan    <ko|tr>   # 대상·관계·최악 비용만 출력(호출 없음)
 *   npx tsx scripts/tojung2027/ilju_batch.ts submit  <ko|tr>   # 배치 제출
 *   npx tsx scripts/tojung2027/ilju_batch.ts wait    <ko|tr>   # 종료까지 폴링(60초 간격, 조회는 과금 없음)
 *   npx tsx scripts/tojung2027/ilju_batch.ts collect <ko|tr>   # 결과 저장·검증·draft 적재
 *   npx tsx scripts/tojung2027/ilju_batch.ts revalidate <ko|tr> [--all] # 저장된 응답 재검증·적재(호출 없음)
 *   npx tsx scripts/tojung2027/ilju_batch.ts publish            # ledger ok 건만 published(정책 0개일 때만)
 *   npx tsx scripts/tojung2027/ilju_batch.ts status
 *
 * ko = 한국어(prompts/ilju_v1.md, 관계는 server/utils/ganjiRelation.ts로 계산해 입력),
 * tr = en/ja/zh(prompts/ilju_t1.md, 한국어 결과 입력).
 *
 * 비용 가드는 generate_batch.ts와 같은 방식이되 원장이 따로다(out/ilju-ledger.json, 상한 $20):
 *   - custom_id별 제출 횟수를 create 호출 전에 기록, 최초 + 재배치 1회(2회)를 넘기면 중단.
 *   - ok인 custom_id는 다시 요청하지 않는다. collect 안 된 배치가 있으면 submit 거부.
 *   - 누적 실측 + 이번 배치 최악(max_tokens 전부 사용 가정) > $20이면 제출하지 않는다.
 * 사용자 승인(2026-10-18 지시서 C): 상한 $20, scripts/tojung2027 방식 그대로. → APPROVALS.md
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { Converter } from 'opencc-js'
import pg from 'pg'
import { BATCH_PRICE_IN, BATCH_PRICE_OUT, HERE, MODEL, OUT, apiKey, pgConfig } from './lib'
import { SIXTY, STEM_ELEM, BRANCH_ELEM } from '../../server/utils/manse'
import { iljuYearRelation, koReading, ELEM_LABEL, stemYang, branchYang, type GanjiRelation } from '../../server/utils/ganjiRelation'

const YEAR = 2027
const YEAR_PILLAR = SIXTY[(YEAR - 4) % 60] // 丁未
const MAX_TOKENS = 16000 // CLAUDE.md §1 기본값
const COST_CAP_USD = 20
const KO_VER = 'i1'
const TR_VER = 'it1'
const LANGS_TR = ['en', 'ja', 'zh'] as const
const FIELDS = ['nature', 'year_relation', 'wealth', 'career', 'love', 'health', 'caution'] as const
type Note = Record<(typeof FIELDS)[number], string>

const [cmd, phase] = process.argv.slice(2)
const s2t = Converter({ from: 'cn', to: 'tw' })
mkdirSync(OUT, { recursive: true })

const str = { type: 'string' }
const SCHEMA = { type: 'object', properties: Object.fromEntries(FIELDS.map((f) => [f, str])), required: [...FIELDS], additionalProperties: false }

const LANG_NAME: Record<string, string> = { en: 'English', ja: 'Japanese', zh: 'Traditional Chinese (Taiwan)' }
const LANG_RULES: Record<string, string> = {
  en: 'Use natural American English. Apart from the stem/branch characters, do not use Chinese characters.',
  ja: 'Write natural Japanese in です・ます style, using kanji and kana as a Japanese writer would.',
  zh: 'Write in Traditional Chinese as used in Taiwan (繁體中文). Never use Simplified Chinese characters. Do not use Japanese kana.',
}

const idx2 = (i: number) => String(i).padStart(2, '0')
const ILJU = SIXTY.map((g, i) => ({ i, id: idx2(i), ilju: g }))

// ---------- ledger ----------
type ReqState = { submits: number; status: 'pending' | 'ok' | 'invalid' | 'errored' | 'expired' | 'canceled'; errors?: string[]; usage?: { input_tokens: number; output_tokens: number } }
type BatchRec = { id: string | null; phase: string; custom_ids: string[]; created_at: string; worst_usd: number; collected: boolean; note?: string }
type Ledger = { spent_usd: number; requests: Record<string, ReqState>; batches: BatchRec[] }
const LEDGER = resolve(OUT, 'ilju-ledger.json')
const loadLedger = (): Ledger => (existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { spent_usd: 0, requests: {}, batches: [] })
const saveLedger = (l: Ledger) => writeFileSync(LEDGER, JSON.stringify(l, null, 2))
const responsePath = (lang: string, id: string) => resolve(OUT, `ilju-${YEAR}-${id}-${lang}-${lang === 'ko' ? KO_VER : TR_VER}.response.json`)

// ---------- requests ----------
type Req = { custom_id: string; prompt: string }
const yy = (b: boolean) => (b ? '양(陽)' : '음(陰)')

function koPrompt(ilju: string, rel: GanjiRelation) {
  const [s, b] = [ilju[0], ilju[1]]
  const tpl = readFileSync(resolve(HERE, 'prompts', 'ilju_v1.md'), 'utf8')
  const yk = koReading(YEAR_PILLAR)
  return tpl
    .replaceAll('{{year}}', String(YEAR))
    .replaceAll('{{year_ko}}', yk)
    .replaceAll('{{year_pillar}}', YEAR_PILLAR)
    .replaceAll('{{ilju}}', ilju)
    .replaceAll('{{ilju_ko}}', koReading(ilju))
    .replaceAll('{{stem}}', s).replaceAll('{{stem_ko}}', koReading(s))
    .replaceAll('{{stem_elem}}', ELEM_LABEL[STEM_ELEM[s]]).replaceAll('{{stem_yy}}', yy(stemYang(s)))
    .replaceAll('{{branch}}', b).replaceAll('{{branch_ko}}', koReading(b))
    .replaceAll('{{branch_elem}}', ELEM_LABEL[BRANCH_ELEM[b]]).replaceAll('{{branch_yy}}', yy(branchYang(b)))
    .replaceAll('{{year_stem}}', `${koReading(YEAR_PILLAR[0])}(${YEAR_PILLAR[0]}) ${ELEM_LABEL[STEM_ELEM[YEAR_PILLAR[0]]]}`)
    .replaceAll('{{year_branch}}', `${koReading(YEAR_PILLAR[1])}(${YEAR_PILLAR[1]}) ${ELEM_LABEL[BRANCH_ELEM[YEAR_PILLAR[1]]]}`)
    .replaceAll('{{year_stem_god}}', rel.yearStemGod)
    .replaceAll('{{year_branch_god}}', rel.yearBranchGod)
    .replaceAll('{{stem_rel}}', rel.stem.map((x) => `- ${x}`).join('\n'))
    .replaceAll('{{branch_rel}}', rel.branch.map((x) => `- ${x}`).join('\n'))
}

function readNote(lang: string, id: string): Note | null {
  const p = responsePath(lang, id)
  if (!existsSync(p)) return null
  const msg = JSON.parse(readFileSync(p, 'utf8'))
  return JSON.parse(msg.content.flatMap((x: any) => (x.type === 'text' ? [x.text] : [])).join(''))
}

function buildRequests(ledger: Ledger): Req[] {
  const reqs: Req[] = []
  if (phase === 'ko') {
    for (const { id, ilju } of ILJU) {
      if (ledger.requests[`ko-${id}`]?.status === 'ok') continue
      reqs.push({ custom_id: `ko-${id}`, prompt: koPrompt(ilju, iljuYearRelation(ilju, YEAR_PILLAR, YEAR)) })
    }
  } else if (phase === 'tr') {
    const tpl = readFileSync(resolve(HERE, 'prompts', 'ilju_t1.md'), 'utf8')
    for (const lang of LANGS_TR) for (const { id, ilju } of ILJU) {
      if (ledger.requests[`ko-${id}`]?.status !== 'ok') continue
      if (ledger.requests[`${lang}-${id}`]?.status === 'ok') continue
      reqs.push({
        custom_id: `${lang}-${id}`,
        prompt: tpl
          .replaceAll('{{lang_name}}', LANG_NAME[lang])
          .replaceAll('{{lang_rules}}', LANG_RULES[lang])
          .replaceAll('{{ilju}}', ilju)
          .replaceAll('{{year}}', String(YEAR))
          .replaceAll('{{year_pillar}}', YEAR_PILLAR)
          .replaceAll('{{korean_json}}', JSON.stringify(validate('ko', readNote('ko', id)!).r, null, 1)),
      })
    }
  } else throw new Error('phase는 ko 또는 tr')
  return reqs
}

const splitByLimit = (ledger: Ledger, reqs: Req[]) => ({
  ok: reqs.filter((r) => (ledger.requests[r.custom_id]?.submits ?? 0) < 2),
  exhausted: reqs.filter((r) => (ledger.requests[r.custom_id]?.submits ?? 0) >= 2).map((r) => r.custom_id),
})
const worstUsd = (reqs: Req[]) => reqs.reduce((s, r) => s + ([...r.prompt].length * BATCH_PRICE_IN + MAX_TOKENS * BATCH_PRICE_OUT) / 1e6, 0)

const params = (prompt: string) => ({
  model: MODEL,
  max_tokens: MAX_TOKENS,
  // generate_batch.ts와 동일: extended thinking 끔(Sonnet 5.5 전용 값, SDK 타입 미반영)
  thinking: { type: 'between_tools' } as unknown as Anthropic.ThinkingConfigParam,
  output_config: { effort: 'high' as const, format: { type: 'json_schema' as const, schema: SCHEMA } },
  messages: [{ role: 'user' as const, content: prompt }],
})

// ---------- validation ----------
// 단정 금지: 수명·나이 예언, 질병명·질병 단정, 투자 단정. 언어별로 같은 범주를 잡는다.
const BANNED: Record<string, RegExp> = {
  ko: /수명|사망|죽음|목숨(?!처럼)|요절|단명|천수|[0-9]+\s*(세|살)|(예순|일흔|여든|아흔)\s*살|암(에|이|을|으로)\s|당뇨|고혈압|뇌졸중|중풍|심근경색|협심증|치매|우울증|공황장애|불임|난임|주식|코인|가상화폐|암호화폐|비트코인|수익(이|을)?\s*보장|원금\s*보장|대박|몇\s*배/,
  en: /lifespan|life span|longevity|\bdie\b|\bdeath\b|\bdeaths?\b|age of \d|\b\d{2}\s*years? old|cancer|diabetes|hypertension|(?<!(one|single|a) )stroke|heart attack|dementia|depression|infertil|stocks?\b|crypto|bitcoin|guaranteed (return|profit|gain)|get rich/i,
  ja: /寿命|壽命|死亡|死ぬ|[0-9０-９]+歳|癌|がん|糖尿|高血圧|脳卒中|心筋梗塞|認知症|うつ病|不妊|株式|株を|仮想通貨|暗号資産|ビットコイン|元本保証|必ず儲|大儲け/,
  zh: /壽命|寿命|死亡|去世|[0-9]+歲|癌|糖尿|高血壓|中風|心肌梗塞|失智|憂鬱症|不孕|股票|加密貨幣|虛擬貨幣|比特幣|保證獲利|穩賺|(?<!(與其|不要|別|勿|避免|不宜|不求|切忌).{0,6})暴富/,
}
const MIN_LEN: Record<string, number> = { ko: 80, ja: 80, zh: 50, en: 150 }
const GANJI_CHARS = /[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水]/g

// 프롬프트의 "관계 목록"을 본문에서 지칭하는 경우가 있다(ko 18건) — 재요청 없이 결정적으로 자연스러운 표현으로.
function tidyKo(s: string): string {
  return s
    .replace(/올해 관계 목록에는/g, '올해에는')
    .replace(/관계 목록에 따르면\s*/g, '')
    .replace(/관계 목록에서(도|는)\s*/g, '')
    .replace(/관계 목록에(는)?/g, '세운과의 사이에$1')
}

// en: 영어 용어 뒤에 붙인 한자·한글 풀이 괄호("Direct Officer (正官)", "(상관)")는 결정적으로 지운다.
// 간지 글자만 든 괄호("Xin (辛)")는 프롬프트가 허용한 표기라 남긴다.
// 영어가 섞인 괄호("(Parallel/Bi Jian, 比肩)", "(伏吟, repetition)")는 한자·한글 조각만 빼고 남긴다.
function tidyEn(s: string): string {
  const foreign = (x: string) => /[가-힣]/.test(x) || /[一-龥ぁ-んァ-ン]/.test(x.replace(GANJI_CHARS, ''))
  return s.replace(/(\s*)[(（]([^()（）]*)[)）]/g, (m, sp: string, inner: string) => {
    if (!foreign(inner)) return m
    const keep = inner.split(/\s*[,，、;]\s*/).filter((seg) => seg && !foreign(seg))
    return keep.length ? `${sp}(${keep.join(', ')})` : ''
  })
}

function validate(lang: string, raw: Note): { r: Note; errs: string[] } {
  let r = Object.fromEntries(FIELDS.map((f) => [f, String(raw?.[f] ?? '').trim()])) as Note
  if (lang === 'ko') r = Object.fromEntries(FIELDS.map((f) => [f, tidyKo(r[f])])) as Note
  if (lang === 'en') r = Object.fromEntries(FIELDS.map((f) => [f, tidyEn(r[f])])) as Note
  if (lang === 'zh') r = Object.fromEntries(FIELDS.map((f) => [f, s2t(r[f])])) as Note // 간체 결정적 보정(재요청 없음)
  const errs: string[] = []
  for (const f of FIELDS) {
    const t = r[f]
    if ([...t].length < MIN_LEN[lang]) errs.push(`${f} 너무 짧음(${[...t].length})`)
    const ban = t.match(BANNED[lang])
    if (ban) errs.push(`${f} 금지 표현 "${ban[0]}"`)
    if (/[#*•]|^\s*-\s/m.test(t)) errs.push(`${f} 마크다운/불릿`)
  }
  const text = FIELDS.map((f) => r[f]).join('\n')
  if (lang === 'ko') {
    if (/[ぁ-んァ-ン]/.test(text)) errs.push('가나 포함')
    if (/[A-Za-z]{2,}/.test(text)) errs.push('라틴 문자 포함')
    if (/관계 목록/.test(text)) errs.push('프롬프트 지칭(관계 목록)')
    if (/[一-龥]/.test(text.replace(/\([^)]*\)/g, ''))) errs.push('괄호 밖 한자')
  } else {
    if (/[가-힣]/.test(text)) errs.push('한글 포함')
    if (lang === 'ja' && !/[ぁ-んァ-ン]/.test(text)) errs.push('가나 없음')
    if (lang === 'zh' && /[ぁ-んァ-ン]/.test(text)) errs.push('가나 포함')
    if (lang === 'en' && /[一-龥ぁ-んァ-ン]/.test(text.replace(GANJI_CHARS, ''))) errs.push('간지 외 CJK 포함')
  }
  return { r, errs }
}

async function upsert(db: pg.Client, lang: string, id: string, r: Note) {
  const ilju = SIXTY[Number(id)]
  const rel = iljuYearRelation(ilju, YEAR_PILLAR, YEAR)
  await db.query(
    `insert into public.ilju_yearly (year, ilju, lang, relation, nature, year_relation, wealth, career, love, health, caution, status, model, prompt_ver)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',$12,$13)
     on conflict (year, ilju, lang) do update set
       relation=excluded.relation, nature=excluded.nature, year_relation=excluded.year_relation, wealth=excluded.wealth,
       career=excluded.career, love=excluded.love, health=excluded.health, caution=excluded.caution,
       status='draft', model=excluded.model, prompt_ver=excluded.prompt_ver`,
    [YEAR, ilju, lang, JSON.stringify(rel), r.nature, r.year_relation, r.wealth, r.career, r.love, r.health, r.caution, MODEL, lang === 'ko' ? KO_VER : TR_VER],
  )
}

// ---------- commands ----------
function plan() {
  const ledger = loadLedger()
  const { ok, exhausted } = splitByLimit(ledger, buildRequests(ledger))
  console.log(`phase=${phase} 대상 ${ok.length}건 · 한도 소진 ${exhausted.length}건 · 누적 $${ledger.spent_usd.toFixed(4)} · 이번 최악 $${worstUsd(ok).toFixed(2)} · 상한 $${COST_CAP_USD}`)
  if (phase === 'ko') {
    for (const { id, ilju } of ILJU) {
      const rel = iljuYearRelation(ilju, YEAR_PILLAR, YEAR)
      console.log(`${id} ${ilju} ${rel.yearStemGod}/${rel.yearBranchGod} | ${rel.stem.join(' ; ')} | ${rel.branch.join(' ; ')}`)
    }
  }
  if (ok[0]) console.log(`\n--- 예시 프롬프트 ${ok[0].custom_id} (${[...ok[0].prompt].length}자) ---\n${ok[0].prompt}`)
}

async function submit() {
  const ledger = loadLedger()
  const open = ledger.batches.filter((b) => !b.collected)
  if (open.length) throw new Error(`collect 안 된 배치가 있어 제출 거부: ${open.map((b) => `${b.phase}:${b.id}`).join(', ')}`)
  const { ok, exhausted } = splitByLimit(ledger, buildRequests(ledger))
  if (exhausted.length) console.log('한도 소진(요청 안 함, 최종 실패):', exhausted.join(', '))
  if (!ok.length) { console.log('제출할 요청 없음'); return }
  for (const r of ok) if ((ledger.requests[r.custom_id]?.submits ?? 0) + 1 > 2) throw new Error(`STOP: ${r.custom_id}를 두 번 넘게 요청하려 함`)
  const worst = worstUsd(ok)
  if (ledger.spent_usd + worst > COST_CAP_USD) throw new Error(`STOP: 누적 $${ledger.spent_usd.toFixed(2)} + 최악 $${worst.toFixed(2)} > $${COST_CAP_USD}`)

  const rec: BatchRec = { id: null, phase, custom_ids: ok.map((r) => r.custom_id), created_at: new Date().toISOString(), worst_usd: Number(worst.toFixed(4)), collected: false }
  for (const r of ok) {
    const prev = ledger.requests[r.custom_id]
    ledger.requests[r.custom_id] = { ...prev, submits: (prev?.submits ?? 0) + 1, status: 'pending' }
  }
  ledger.batches.push(rec)
  saveLedger(ledger)

  const client = new Anthropic({ apiKey: apiKey(), maxRetries: 0 })
  try {
    const batch = await client.messages.batches.create({ requests: ok.map((r) => ({ custom_id: r.custom_id, params: params(r.prompt) })) })
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
  const b = loadLedger().batches.find((x) => x.phase === phase && !x.collected && x.id)
  if (!b) { console.log('대기할 배치 없음'); return }
  const client = new Anthropic({ apiKey: apiKey(), maxRetries: 2 })
  for (;;) {
    const s = await client.messages.batches.retrieve(b.id!)
    const c = s.request_counts
    console.log(`${new Date().toISOString()} ${b.id} ${s.processing_status} · processing ${c.processing} · ok ${c.succeeded} · err ${c.errored} · exp ${c.expired}`)
    if (s.processing_status === 'ended') return
    await new Promise((r) => setTimeout(r, 60_000))
  }
}

async function load(db: pg.Client, ledger: Ledger, id: string, msg: any) {
  const [lang, n] = [id.slice(0, 2), id.slice(3)]
  const st = ledger.requests[id]
  try {
    if (msg.stop_reason !== 'end_turn') throw new Error(`stop_reason=${msg.stop_reason}`)
    const raw = JSON.parse(msg.content.flatMap((x: any) => (x.type === 'text' ? [x.text] : [])).join('')) as Note
    const { r, errs } = validate(lang, raw)
    if (errs.length) throw new Error(errs.join('; '))
    await upsert(db, lang, n, r)
    st.status = 'ok'; delete st.errors
    return true
  } catch (e) {
    st.status = 'invalid'; st.errors = [(e as Error).message.slice(0, 300)]
    return false
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
        const st = ledger.requests[id]
        if (res.result.type !== 'succeeded') {
          st.status = res.result.type as ReqState['status']
          st.errors = [JSON.stringify((res.result as any).error ?? res.result.type).slice(0, 300)]
          badN++
          continue
        }
        const msg = res.result.message
        writeFileSync(responsePath(id.slice(0, 2), id.slice(3)), JSON.stringify(msg, null, 2))
        st.usage = { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens }
        cost += (msg.usage.input_tokens * BATCH_PRICE_IN + msg.usage.output_tokens * BATCH_PRICE_OUT) / 1e6
        if (await load(db, ledger, id, msg)) okN++; else badN++
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

async function revalidate() {
  const ledger = loadLedger()
  const db = new pg.Client(pgConfig()); await db.connect()
  let okN = 0
  try {
    for (const [id, st] of Object.entries(ledger.requests)) {
      if (st.status !== 'invalid' && !(process.argv.includes('--all') && st.status === 'ok')) continue
      const lang = id.slice(0, 2)
      if (phase === 'tr' ? lang === 'ko' : lang !== 'ko') continue
      const p = responsePath(lang, id.slice(3))
      if (!existsSync(p)) continue
      if (await load(db, ledger, id, JSON.parse(readFileSync(p, 'utf8')))) okN++
    }
  } finally {
    await db.end()
  }
  saveLedger(ledger)
  console.log(`✔ revalidate ${phase}: ${okN}건 ok(API 호출 없음) — published였던 행은 draft로 돌아갔으니 publish를 다시 실행`)
}

async function publish() {
  const ledger = loadLedger()
  const db = new pg.Client(pgConfig()); await db.connect()
  try {
    const pol = (await db.query(`select count(*)::int n from pg_policies where schemaname='public' and tablename='ilju_yearly'`)).rows[0].n
    if (pol !== 0) throw new Error(`STOP: ilju_yearly에 정책 ${pol}개 — 공개 읽기 정책이 있으면 published 전환 금지`)
    const ok = Object.entries(ledger.requests).filter(([, st]) => st.status === 'ok').map(([id]) => [id.slice(0, 2), SIXTY[Number(id.slice(3))]])
    await db.query('begin')
    let n = 0
    for (const [lang, ilju] of ok) n += (await db.query(`update public.ilju_yearly set status='published' where year=$1 and ilju=$2 and lang=$3`, [YEAR, ilju, lang])).rowCount ?? 0
    await db.query('commit')
    console.log(`✔ published ${n}행 (ledger ok ${ok.length}건)`)
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
  for (const [id, s] of Object.entries(l.requests)) { const lang = id.slice(0, 2); rows[lang] ??= {}; rows[lang][s.status] = (rows[lang][s.status] ?? 0) + 1 }
  console.table(rows)
  console.log(`누적 $${l.spent_usd} / 상한 $${COST_CAP_USD} · 배치 ${l.batches.map((b) => `${b.phase}:${b.id}${b.collected ? '' : '(open)'}`).join(', ')}`)
  for (const [id, s] of Object.entries(l.requests)) if (s.status !== 'ok') console.log(` ${id} ${s.status} x${s.submits} ${s.errors?.join(' | ') ?? ''}`)
}

const run: Record<string, () => unknown> = { plan, submit, wait, collect, revalidate, publish, status }
if (!run[cmd]) { console.error('usage: ilju_batch.ts <plan|submit|wait|collect|revalidate|publish|status> [ko|tr]'); process.exit(1) }
try { await run[cmd]() } catch (e) { console.error('x', (e as Error).message); process.exitCode = 1 }
