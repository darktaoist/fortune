/**
 * 만세력(사주 명식) 순수 계산 — ported from 1.0 daewon.vue.
 *
 * 4기둥(년월일주)은 calenda_data의 한자 간지(cd_h*ganjee)에서 그대로 오므로 여기선
 * 다루지 않는다. 이 모듈은 입력으로 받은 기둥들로부터:
 *   - 시주(時柱)        : 일간 + 시각 (1.0 calculateTimeGanzhi 복제)
 *   - 대운(大運)        : 방향/대운수/시퀀스 (1.0 daewon.vue 복제, 절기는 호출측이 주입)
 *   - 오행 점수/신강신약 : 표준 명리 가중(1.0 Edge Function 부재로 자체 구현)
 * 을 계산한다. 모두 한자(漢字) 표기 기준.
 */

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] // 천간
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] // 지지
const YANG_STEMS = ['甲', '丙', '戊', '庚', '壬'] // 양간

// 60갑자
export const SIXTY: string[] = Array.from({ length: 60 }, (_, i) => STEMS[i % 10] + BRANCHES[i % 12])

export const STEM_ELEM: Record<string, string> = { 甲: 'mok', 乙: 'mok', 丙: 'hwa', 丁: 'hwa', 戊: 'to', 己: 'to', 庚: 'geum', 辛: 'geum', 壬: 'su', 癸: 'su' }
export const BRANCH_ELEM: Record<string, string> = { 寅: 'mok', 卯: 'mok', 巳: 'hwa', 午: 'hwa', 辰: 'to', 戌: 'to', 丑: 'to', 未: 'to', 申: 'geum', 酉: 'geum', 亥: 'su', 子: 'su' }
// 지장간(여기·중기·정기 순; 마지막이 정기/본기)
const HIDDEN: Record<string, string[]> = {
  子: ['壬', '癸'], 丑: ['癸', '辛', '己'], 寅: ['戊', '丙', '甲'], 卯: ['甲', '乙'],
  辰: ['乙', '癸', '戊'], 巳: ['戊', '庚', '丙'], 午: ['丙', '己', '丁'], 未: ['丁', '乙', '己'],
  申: ['戊', '壬', '庚'], 酉: ['庚', '辛'], 戌: ['辛', '丁', '戊'], 亥: ['戊', '甲', '壬'],
}
const GEN: Record<string, string> = { mok: 'hwa', hwa: 'to', to: 'geum', geum: 'su', su: 'mok' } // 상생(생하는 대상)
const CTRL: Record<string, string> = { mok: 'to', to: 'su', su: 'hwa', hwa: 'geum', geum: 'mok' } // 상극(극하는 대상)
export const EL = ['mok', 'hwa', 'to', 'geum', 'su'] as const

export type Pillar = [string, string] // [천간, 지지]
export interface Pillars { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }

/** 시주(時柱) — 일간 + 시각(0~23). 1.0 calculateTimeGanzhi 복제. hour null이면 null. */
export function timePillar(dayStem: string, hour: number | null): Pillar | null {
  if (hour == null || Number.isNaN(hour)) return null
  const zhiIndex = Math.floor((hour + 1) / 2) % 12
  // 시두법: 일간별 子時 천간 시작점(甲己→甲, 乙庚→丙, 丙辛→戊, 丁壬→庚, 戊癸→壬),
  // 이후 時마다 천간·지지 1씩 순행. (1.0 daewon.vue의 *2는 오류라 수정)
  const ganStart: Record<string, number> = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 }
  const ganIndex = ((ganStart[dayStem] ?? 0) + zhiIndex) % 10
  return [STEMS[ganIndex], BRANCHES[zhiIndex]]
}

/** 오행 점수 — 표준 가중: 천간 10, 지장간 정기 8·중기 3·여기 2(개수에 따라). */
export function ohaengScore(p: Pillars): Record<string, number> {
  const score: Record<string, number> = { mok: 0, hwa: 0, to: 0, geum: 0, su: 0 }
  const pillarList = [p.year, p.month, p.day, p.hour].filter(Boolean) as Pillar[]
  for (const [stem, branch] of pillarList) {
    if (STEM_ELEM[stem]) score[STEM_ELEM[stem]] += 10
    const hid = HIDDEN[branch] || []
    // 마지막=정기. 개수별 가중치.
    const weights = hid.length === 3 ? [2, 3, 8] : hid.length === 2 ? [3, 8] : [10]
    hid.forEach((h, i) => { if (STEM_ELEM[h]) score[STEM_ELEM[h]] += weights[i] ?? 0 })
  }
  return score
}

/** 신강/신약 — 부조(비겁+인성) : 설기·극(식상+재성+관성). */
export function strongWeak(p: Pillars, dayStem: string): { type: 'strong' | 'weak'; score: string } {
  const s = ohaengScore(p)
  const dm = STEM_ELEM[dayStem]
  const generatesDm = EL.find((e) => GEN[e] === dm)! // 인성(일간을 생하는 오행)
  const support = Math.round(s[dm] + s[generatesDm]) // 비겁 + 인성
  const oppose = Math.round(s[GEN[dm]] + s[CTRL[dm]] + s[EL.find((e) => CTRL[e] === dm)!]) // 식상+재성+관성
  return { type: support > oppose ? 'strong' : 'weak', score: `${support} : ${oppose}` }
}

export interface Term { name: string; datetime: Date }
export interface DaeunSeqItem { age: number; stem: string; branch: string }
export interface Daeun { startAge: number; startNote: boolean; currentIndex: number; sequence: DaeunSeqItem[] }

/**
 * 대운 — 1.0 daewon.vue 복제.
 * @param yearStem  년주 천간 (방향 결정)
 * @param monthPillar 월주 "丙午" (시퀀스 기준점)
 * @param gender    'm' | 'f'
 * @param birth     출생 일시 (Date)
 * @param terms     출생년 ±1년 절기 목록(시간순)
 * @param birthYear 출생 연도(현재 대운 인덱스 계산용)
 * @param currentYear 현재 연도
 */
export function buildDaeun(opts: {
  yearStem: string; monthPillar: string; gender: 'm' | 'f'; birth: Date; terms: Term[]; birthYear: number; currentYear: number
}): Daeun {
  const { yearStem, monthPillar, gender, birth, terms, birthYear, currentYear } = opts
  const isYang = YANG_STEMS.includes(yearStem)
  // 남: 양년 순행/음년 역행, 여: 양년 역행/음년 순행
  const forward = gender === 'm' ? isYang : !isYang

  // 대운수: 출생일시 ↔ 가장 가까운 절기 시간차 ÷ 24 = dayDiff, ÷3 = 나이.
  let dayDiff = 0
  const bt = birth.getTime()
  if (forward) {
    const next = terms.filter((t) => t.datetime.getTime() > bt).sort((a, b) => a.datetime.getTime() - b.datetime.getTime())[0]
    if (next) dayDiff = (next.datetime.getTime() - bt) / 86400000
  } else {
    const prev = terms.filter((t) => t.datetime.getTime() < bt).sort((a, b) => b.datetime.getTime() - a.datetime.getTime())[0]
    if (prev) dayDiff = (bt - prev.datetime.getTime()) / 86400000
  }
  const basic = dayDiff / 3
  const remainder = dayDiff % 3
  const firstAge = Math.max(1, remainder >= 2 ? Math.ceil(basic) : Math.floor(basic))

  // 시퀀스: 월주 위치에서 순행/역행 8개.
  const monthPos = SIXTY.indexOf(monthPillar)
  const sequence: DaeunSeqItem[] = []
  for (let i = 0; i < 10; i++) { // 2.0 디자인: 대운 10개(100년) 표기
    const idx = forward ? (monthPos + i + 1) % 60 : (monthPos - i - 1 + 60) % 60
    const gz = SIXTY[idx] || '甲子'
    sequence.push({ age: firstAge + i * 10, stem: gz.charAt(0), branch: gz.charAt(1) })
  }

  // 현재 대운: 한국나이.
  const koreanAge = currentYear - birthYear + 1
  let currentIndex = sequence.findIndex((d) => koreanAge >= d.age && koreanAge <= d.age + 9)
  if (currentIndex < 0) currentIndex = koreanAge < sequence[0].age ? -1 : sequence.length - 1

  return { startAge: firstAge, startNote: true, currentIndex, sequence }
}

/** "YYYYMMDDHHMM" → Date (로컬). */
export function parseTermTime(s: string): Date {
  const y = +s.slice(0, 4), mo = +s.slice(4, 6), d = +s.slice(6, 8), h = +s.slice(8, 10) || 0, mi = +s.slice(10, 12) || 0
  return new Date(y, mo - 1, d, h, mi)
}
