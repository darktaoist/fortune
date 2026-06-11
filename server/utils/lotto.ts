import {
  STEMS, BRANCHES, SIXTY, STEM_ELEM, EL, type Pillars,
} from './manse'
import type { Myeongsik } from './myeongsik'

/**
 * 로또 운세 계산 셀렉터 — 명식(命式)에서 행운번호/사주궁합표/행운속성/게이지/주간을
 * 모두 결정적으로 파생한다. 같은 (명식 + ISO week-year + nation) → 같은 출력.
 * 텍스트 셀렉터(lotto 테이블 %48 + fallback)와는 독립이다.
 *
 * 면책: 운세용 휴리스틱이며 실제 당첨 예측이 아니다. 핵심은 재현성(결정성).
 */

// 오행 상생(生)/상극(剋). manse.ts에서 미export → myeongsik.ts와 동일하게 재선언.
const GEN: Record<string, string> = { mok: 'hwa', hwa: 'to', to: 'geum', geum: 'su', su: 'mok' }
const CTRL: Record<string, string> = { mok: 'to', to: 'su', su: 'hwa', hwa: 'geum', geum: 'mok' }

// 오행 → 행운 속성.
const EL_COLOR: Record<string, string> = { mok: 'green', hwa: 'red', to: 'brown', geum: 'white', su: 'navy' }
const EL_HADO: Record<string, number[]> = { mok: [3, 8], hwa: [2, 7], to: [5, 0], geum: [4, 9], su: [1, 6] } // 하도수
const EL_DIR: Record<string, string> = { mok: 'east', hwa: 'south', to: 'center', geum: 'west', su: 'north' }
// 한국 성씨 초성 자음(오행 분류). ko 전용 — 해외는 표시하지 않는다.
const EL_SURNAME: Record<string, string[]> = {
  mok: ['ㄱ', 'ㅋ'], hwa: ['ㄴ', 'ㄷ', 'ㄹ', 'ㅌ'], to: ['ㅇ', 'ㅎ'], geum: ['ㅅ', 'ㅈ', 'ㅊ'], su: ['ㅁ', 'ㅂ', 'ㅍ'],
}

export interface DrawConfig { count: number; min: number; max: number }
export interface LotteryConfig {
  main: DrawConfig
  extra?: DrawConfig // 보너스/파워볼/특별호 (메인과 별도 범위)
  extraKind?: 'bonus' | 'power' | 'special'
  surname: boolean // 행운예감 표에 성씨 자음 행 노출 여부(ko 전용)
}

/** 나라별 실제 복권 설정. */
export const LOTTERY: Record<string, LotteryConfig> = {
  k: { main: { count: 6, min: 1, max: 45 }, extra: { count: 1, min: 1, max: 45 }, extraKind: 'bonus', surname: true }, // 로또 6/45
  e: { main: { count: 5, min: 1, max: 69 }, extra: { count: 1, min: 1, max: 26 }, extraKind: 'power', surname: false }, // US Powerball
  j: { main: { count: 6, min: 1, max: 43 }, surname: false }, // ロト6
  c: { main: { count: 6, min: 1, max: 49 }, extra: { count: 1, min: 1, max: 49 }, extraKind: 'special', surname: false }, // 대만 大樂透
}

/* ===== Seeded RNG (순수 TS, 결정적) ===== */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}
function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
/** seed 문자열 + offset → 독립 결정적 난수 스트림. */
function makeRng(seed: string, offset: number): () => number {
  const s = xmur3(seed + '#' + offset)()
  return mulberry32(s)
}

/* ===== ISO week ===== */
/** ISO 8601 주차/주-연도 (연말 경계에서도 결정적). */
export function isoWeek(target: string): { year: number; week: number } {
  const [y, m, d] = target.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  const dayNum = (dt.getUTCDay() + 6) % 7 // 월=0 … 일=6
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3) // 그 주의 목요일
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThu.getUTCDay() + 6) % 7
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((dt.getTime() - firstThu.getTime()) / 604800000)
  return { year: dt.getUTCFullYear(), week }
}

/* ===== seed 빌더 ===== */
function buildSeed(m: Myeongsik, nation: string, target: string): string {
  const p = m.pillars
  const pj = (x: [string, string] | null) => (x ? x[0] + x[1] : '空空') // 시간 모름 고정 토큰
  const o = m.ohaeng
  const { year, week } = isoWeek(target)
  return [
    pj(p.year), pj(p.month), pj(p.day), pj(p.hour), m.dayStem,
    o.mok, o.hwa, o.to, o.geum, o.su, nation, year, week,
  ].join('|')
}

/* ===== 용신(행운 오행) ===== */
/** 신강이면 식상/재/관, 신약이면 인성/비겁 후보 중 가장 부족한 오행 1~2개. */
export function pickYongsin(m: Myeongsik): string[] {
  const dm = STEM_ELEM[m.dayStem]
  const o = m.ohaeng
  let candidates: string[]
  if (m.strongWeak.type === 'strong') {
    candidates = [GEN[dm], CTRL[dm], EL.find((e) => CTRL[e] === dm)!] // 식상, 재성, 관성
  } else {
    candidates = [EL.find((e) => GEN[e] === dm)!, dm] // 인성, 비겁
  }
  const uniq = [...new Set(candidates)]
  // 부족한(=점수 낮은) 순. 동점은 EL 고정순서.
  uniq.sort((a, b) => (o[a] - o[b]) || (EL.indexOf(a as any) - EL.indexOf(b as any)))
  return uniq.slice(0, 2)
}

/* ===== 행운번호 ===== */
function drawSet(rng: () => number, cfg: DrawConfig, lucky: string[], exclude: number[] = []): number[] {
  const picked = new Set<number>(exclude)
  const range = cfg.max - cfg.min + 1
  // 하도수 우선: 행운 오행의 끝자리(0~9)를 범위 내 후보로 가중 투입.
  const hado = lucky.flatMap((e) => EL_HADO[e] || [])
  for (const tail of hado) {
    if (picked.size - exclude.length >= cfg.count) break
    // tail(끝자리)을 가진 범위 내 후보 중 rng로 하나.
    const opts: number[] = []
    for (let n = cfg.min; n <= cfg.max; n++) if (n % 10 === tail && !picked.has(n)) opts.push(n)
    if (opts.length) picked.add(opts[Math.floor(rng() * opts.length)])
  }
  // 부족분은 균등 난수로.
  let guard = 0
  while (picked.size - exclude.length < cfg.count && guard++ < 1000) {
    picked.add(cfg.min + Math.floor(rng() * range))
  }
  return [...picked].filter((n) => !exclude.includes(n)).sort((a, b) => a - b)
}

export interface LuckyNumbers {
  main: number[]
  extra: number[] | null
  extraKind: 'bonus' | 'power' | 'special' | null
  bundles: number[][]
}
function luckyNumbers(seed: string, cfg: LotteryConfig, lucky: string[]): LuckyNumbers {
  const rng = makeRng(seed, 1)
  const main = drawSet(rng, cfg.main, lucky)
  const extra = cfg.extra ? drawSet(rng, cfg.extra, lucky, cfg.extraKind === 'power' || cfg.extra.max !== cfg.main.max ? [] : main) : null
  // 10세트 묶음(메인만, 벤치마크 패리티).
  const bundles: number[][] = []
  for (let i = 0; i < 10; i++) bundles.push(drawSet(makeRng(seed, 100 + i), cfg.main, lucky))
  return { main, extra, extraKind: cfg.extraKind ?? null, bundles }
}

/* ===== 미니로또운 게이지 ===== */
function gaugeScore(m: Myeongsik, lucky: string[], seed: string): number {
  const rng = makeRng(seed, 2)
  const o = m.ohaeng
  const total = EL.reduce((s, e) => s + (o[e] || 0), 0) || 1
  const avg = total / 5
  // 용신 보완 여지: 행운 오행이 부족할수록(=평균 이하) 보완 가점.
  const deficit = lucky.reduce((s, e) => s + Math.max(0, avg - (o[e] || 0)), 0)
  const supplement = Math.min(20, Math.round((deficit / avg) * 20))
  // 신강/신약 균형도: 부조:설기 격차가 작을수록 가점.
  const [sup, opp] = m.strongWeak.score.split(':').map((x) => Number(x.trim()) || 0)
  const balance = sup + opp > 0 ? Math.round((1 - Math.abs(sup - opp) / (sup + opp)) * 15) : 0
  const jitter = Math.round(rng() * 15)
  return Math.max(0, Math.min(100, 50 + supplement + balance + jitter))
}

/* ===== 주간 7일 ===== */
export interface WeeklyDay { offset: number; date: string; weekday: number; score: number; bucket: number; phrase: string }
function addDays(target: string, d: number): string {
  const [y, m, dd] = target.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, dd || 1))
  dt.setUTCDate(dt.getUTCDate() + d)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}
/**
 * target 기준 7일. 각 날짜의 today 해시(0~119) → score% → bucket(0~4).
 * phrase는 호출측에서 lotto_daily 풀로 주입(phraseFor).
 */
export function weekly(
  input: { year: number; month: number; day: number; hour: number | null; calendar: string },
  target: string,
  fortuneNumber: (y: number, mo: number, d: number, h: number | null, cal: string, t: string) => string,
  phraseFor: (bucket: number, seed: number) => string,
): WeeklyDay[] {
  const out: WeeklyDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(target, i)
    const code = fortuneNumber(input.year, input.month, input.day, input.hour, input.calendar, date)
    const h = parseInt(code.slice(2), 10) || 0 // 'toNNN' → 0~119
    const score = Math.round((h / 119) * 100)
    const bucket = Math.max(0, Math.min(4, Math.floor(score / 20)))
    const wd = new Date(date + 'T00:00:00Z').getUTCDay() // 0=일
    // 같은 bucket이라도 날짜 해시(h)로 변형을 골라 매일 다른 문구가 나오게 한다.
    out.push({ offset: i, date, weekday: wd, score, bucket, phrase: phraseFor(bucket, h) })
  }
  return out
}

/* ===== 로또복권 사주궁합 표 (5행 × 6열) ===== */
export interface SajuTable { headerKeys: string[]; rows: number[][] }
function sajuTable(m: Myeongsik, cfg: LotteryConfig): SajuTable {
  const p = m.pillars
  const range = cfg.main.max - cfg.main.min + 1
  const idxStem = (x: [string, string] | null) => (x ? STEMS.indexOf(x[0]) : 0)
  const idxBranch = (x: [string, string] | null) => (x ? BRANCHES.indexOf(x[1]) : 0)
  const all = [p.year, p.month, p.day, p.hour].filter(Boolean) as [string, string][]
  const sumStem = all.reduce((s, x) => s + STEMS.indexOf(x[0]), 0)
  const sumBranch = all.reduce((s, x) => s + BRANCHES.indexOf(x[1]), 0)
  const maxEl = EL.reduce((best, e) => ((m.ohaeng[e] || 0) > (m.ohaeng[best] || 0) ? e : best), EL[0])
  const iljuwolju = SIXTY.indexOf(p.day[0] + p.day[1]) + SIXTY.indexOf(p.month[0] + p.month[1])
  // 6열: 일간 / 일지 / 천간(합) / 지지(합) / 오행구성 / 일주월주
  const bases = [idxStem(p.day), idxBranch(p.day), sumStem, sumBranch, EL.indexOf(maxEl as any) + 1, iljuwolju]
  const headerKeys = ['ilgan', 'ilji', 'cheongan', 'jiji', 'ohaeng', 'iljuwolju']
  const rows: number[][] = []
  for (let r = 1; r <= 5; r++) {
    rows.push(bases.map((b, c) => cfg.main.min + (((b + r * 7 + r * (c + 1)) % range + range) % range)))
  }
  return { headerKeys, rows }
}

/* ===== 행운예감(색/숫자/방향/성씨) ===== */
export interface LuckyAura { colors: string[]; numbers: number[]; directions: string[]; surnames: string[] | null }
function luckyAura(lucky: string[], cfg: LotteryConfig): LuckyAura {
  const colors = [...new Set(lucky.map((e) => EL_COLOR[e]))]
  const numbers = [...new Set(lucky.flatMap((e) => EL_HADO[e]))].sort((a, b) => a - b)
  const directions = [...new Set(lucky.map((e) => EL_DIR[e]))]
  const surnames = cfg.surname ? [...new Set(lucky.flatMap((e) => EL_SURNAME[e]))] : null
  return { colors, numbers, directions, surnames }
}

/* ===== 통합 ===== */
export interface LottoComputed {
  gauge: number
  lucky: string[] // 행운 오행 키
  attributes: LuckyAura
  luckyNumbers: LuckyNumbers
  weekly: WeeklyDay[]
  sajuTable: SajuTable
}
export function computeLotto(
  m: Myeongsik,
  nation: string,
  target: string,
  birth: { year: number; month: number; day: number; hour: number | null; calendar: string },
  fortuneNumber: (y: number, mo: number, d: number, h: number | null, cal: string, t: string) => string,
  phraseFor: (bucket: number, seed: number) => string,
): LottoComputed {
  const cfg = LOTTERY[nation] || LOTTERY.k
  const seed = buildSeed(m, nation, target)
  const lucky = pickYongsin(m)
  return {
    gauge: gaugeScore(m, lucky, seed),
    lucky,
    attributes: luckyAura(lucky, cfg),
    luckyNumbers: luckyNumbers(seed, cfg, lucky),
    weekly: weekly(birth, target, fortuneNumber, phraseFor),
    sajuTable: sajuTable(m, cfg),
  }
}
