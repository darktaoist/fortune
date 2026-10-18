import { STEMS, BRANCHES, STEM_ELEM, BRANCH_ELEM } from './manse'

/**
 * 일주(日柱)와 세운(歲運, 예: 2027 丁未)의 관계 — 생극(십신)·합충형파해를 결정적으로 계산한다.
 * ilju_yearly 참고 해석 생성(scripts/tojung2027/ilju_batch.ts)의 입력으로 쓰고, 같은 값을
 * 테이블 relation 컬럼에 저장한다. 순수 함수(DB·Nuxt 의존 없음).
 */

const YANG: Record<string, boolean> = { 甲: true, 丙: true, 戊: true, 庚: true, 壬: true, 乙: false, 丁: false, 己: false, 辛: false, 癸: false }
const GEN: Record<string, string> = { mok: 'hwa', hwa: 'to', to: 'geum', geum: 'su', su: 'mok' }
const CTRL: Record<string, string> = { mok: 'to', to: 'su', su: 'hwa', hwa: 'geum', geum: 'mok' }
// 지지 본기(本氣) — 십신 판정용
const BRANCH_MAIN: Record<string, string> = { 子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬' }
const BRANCH_YANG: Record<string, boolean> = { 子: true, 丑: false, 寅: true, 卯: false, 辰: true, 巳: false, 午: true, 未: false, 申: true, 酉: false, 戌: true, 亥: false }

export const ELEM_LABEL: Record<string, string> = { mok: '목(木)', hwa: '화(火)', to: '토(土)', geum: '금(金)', su: '수(水)' }
const KO: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
}
export const koReading = (s: string) => [...s].map((c) => KO[c] ?? c).join('')

// 조사: "수(水)" 같은 라벨의 괄호 앞 한글 받침으로 이/가·을/를·과/와를 고른다.
function josa(label: string, withFinal: string, without: string) {
  const ch = label.replace(/\(.*$/, '').slice(-1)
  const code = ch.charCodeAt(0) - 0xac00
  return label + (code >= 0 && code <= 11171 && code % 28 !== 0 ? withFinal : without)
}

/** 일간 기준 십신(한글). */
export function tenGodKo(dayStem: string, ch: string): string {
  const de = STEM_ELEM[dayStem], te = STEM_ELEM[ch]
  const same = YANG[dayStem] === YANG[ch]
  if (de === te) return same ? '비견' : '겁재'
  if (GEN[de] === te) return same ? '식신' : '상관'
  if (CTRL[de] === te) return same ? '편재' : '정재'
  if (CTRL[te] === de) return same ? '편관' : '정관'
  return same ? '편인' : '정인'
}

const pairKey = (a: string, b: string) => [a, b].sort().join('')
const pairs = (list: string[]) => new Set(list.map((p) => pairKey(p[0], p[1])))

const STEM_HAP: Record<string, string> = { [pairKey('甲', '己')]: 'to', [pairKey('乙', '庚')]: 'geum', [pairKey('丙', '辛')]: 'su', [pairKey('丁', '壬')]: 'mok', [pairKey('戊', '癸')]: 'hwa' }
const STEM_CHUNG = pairs(['甲庚', '乙辛', '丙壬', '丁癸'])
const YUKHAP: Record<string, string> = { [pairKey('子', '丑')]: 'to', [pairKey('寅', '亥')]: 'mok', [pairKey('卯', '戌')]: 'hwa', [pairKey('辰', '酉')]: 'geum', [pairKey('巳', '申')]: 'su', [pairKey('午', '未')]: 'hwa' }
const CHUNG = pairs(['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'])
const HYEONG = pairs(['寅巳', '巳申', '寅申', '丑戌', '戌未', '丑未', '子卯'])
const SELF_HYEONG = new Set(['辰', '午', '酉', '亥'])
const HAE = pairs(['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'])
const PA = pairs(['子酉', '丑辰', '寅亥', '卯午', '巳申', '戌未'])
const WONJIN = pairs(['子未', '丑午', '寅酉', '卯申', '辰亥', '巳戌'])
const SAMHAP: [string, string][] = [['申子辰', 'su'], ['亥卯未', 'mok'], ['寅午戌', 'hwa'], ['巳酉丑', 'geum']]
const BANGHAP: [string, string][] = [['寅卯辰', 'mok'], ['巳午未', 'hwa'], ['申酉戌', 'geum'], ['亥子丑', 'su']]

export interface GanjiRelation {
  year: number
  yearPillar: string // 丁未
  ilju: string // 甲子
  dayStemElem: string // mok
  dayBranchElem: string
  yearStemGod: string // 세운 천간의 십신(일간 기준)
  yearBranchGod: string // 세운 지지 본기의 십신
  stem: string[] // 천간 관계(한글 라벨)
  branch: string[] // 지지 관계(한글 라벨)
}

/** 일주 × 세운 관계. year는 기록용, yearPillar는 '丁未'처럼 두 글자. */
export function iljuYearRelation(ilju: string, yearPillar: string, year: number): GanjiRelation {
  const [ds, db] = [ilju[0], ilju[1]]
  const [ys, yb] = [yearPillar[0], yearPillar[1]]
  if (!STEMS.includes(ds) || !BRANCHES.includes(db) || !STEMS.includes(ys) || !BRANCHES.includes(yb)) {
    throw new Error(`bad ganji: ${ilju} / ${yearPillar}`)
  }
  const sk = pairKey(ds, ys), bk = pairKey(db, yb)
  const lbl = (a: string, b: string) => `${koReading(a + b)}(${a}${b})`

  const stem: string[] = []
  if (ds === ys) stem.push(`일간과 세운 천간이 같음 — ${lbl(ds, ys)} 복음(伏吟)`)
  if (STEM_HAP[sk]) stem.push(`천간합 ${lbl(ds, ys)}합 → ${ELEM_LABEL[STEM_HAP[sk]]}`)
  if (STEM_CHUNG.has(sk)) stem.push(`천간충 ${lbl(ds, ys)}충`)
  const se = STEM_ELEM[ds], ye = STEM_ELEM[ys]
  const [S, Y] = [ELEM_LABEL[se], ELEM_LABEL[ye]]
  stem.push(
    se === ye ? `오행 같음: ${S}`
      : GEN[ye] === se ? `세운 ${josa(Y, '이', '가')} 일간 ${josa(S, '을', '를')} 생(生)함`
        : GEN[se] === ye ? `일간 ${josa(S, '이', '가')} 세운 ${josa(Y, '을', '를')} 생(生)함(설기)`
          : CTRL[ye] === se ? `세운 ${josa(Y, '이', '가')} 일간 ${josa(S, '을', '를')} 극(剋)함`
            : `일간 ${josa(S, '이', '가')} 세운 ${josa(Y, '을', '를')} 극(剋)함`,
  )

  const branch: string[] = []
  if (db === yb) branch.push(`일지와 세운 지지가 같음 — ${lbl(db, yb)} 복음(伏吟)${SELF_HYEONG.has(db) ? ' · 자형(自刑)' : ''}`)
  if (YUKHAP[bk]) branch.push(`육합 ${lbl(db, yb)}합 → ${ELEM_LABEL[YUKHAP[bk]]}`)
  if (CHUNG.has(bk)) branch.push(`육충 ${lbl(db, yb)}충`)
  if (HYEONG.has(bk)) branch.push(`형(刑) ${lbl(db, yb)}형${['丑', '戌', '未'].includes(db) && ['丑', '戌', '未'].includes(yb) ? ' — 축술미(丑戌未) 삼형의 일부' : ['寅', '巳', '申'].includes(db) ? ' — 인사신(寅巳申) 삼형의 일부' : ' — 자묘(子卯) 상형'}`)
  if (HAE.has(bk)) branch.push(`육해 ${lbl(db, yb)}해`)
  if (PA.has(bk)) branch.push(`육파 ${lbl(db, yb)}파`)
  if (WONJIN.has(bk)) branch.push(`원진 ${lbl(db, yb)}원진`)
  for (const [g, el] of SAMHAP) if (db !== yb && g.includes(db) && g.includes(yb)) branch.push(`삼합 반합 ${lbl(db, yb)} — ${koReading(g)}(${g}) ${ELEM_LABEL[el]}국`)
  for (const [g, el] of BANGHAP) if (db !== yb && g.includes(db) && g.includes(yb)) branch.push(`방합 일부 ${lbl(db, yb)} — ${koReading(g)}(${g}) ${ELEM_LABEL[el]}방`)
  if (!branch.length) branch.push(`일지 ${josa(`${koReading(db)}(${db})`, '과', '와')} 세운 지지 ${koReading(yb)}(${yb}) 사이에 뚜렷한 합·충·형·파·해 없음`)

  return {
    year, yearPillar, ilju,
    dayStemElem: se, dayBranchElem: BRANCH_ELEM[db],
    yearStemGod: tenGodKo(ds, ys),
    yearBranchGod: tenGodKo(ds, BRANCH_MAIN[yb]),
    stem, branch,
  }
}

/** 지지 음양(참고용) — 프롬프트 표기에 쓴다. */
export const branchYang = (b: string) => BRANCH_YANG[b]
export const stemYang = (s: string) => YANG[s]
