import {
  timePillar, ohaengScore, strongWeak, buildDaeun, parseTermTime,
  STEM_ELEM, BRANCH_ELEM, type Pillars, type Term,
} from './manse'

/**
 * 명식(命式) 빌더 — calenda_data에서 4기둥(한자 간지)을 읽고 시주·대운·오행·신강신약·십신을
 * 계산해 반환한다. `/api/saju/manse`(SajuChart용)와 프리미엄 운세 엔진이 공유한다.
 *
 * 반환 객체는 SajuChart `data` 형식({ user, pillars, ohaeng, strongWeak, daeun })에
 * 프리미엄 프롬프트용 { dayStem, tenGods } 를 더한 상위집합이다. SajuChart는 여분 필드를 무시.
 */
const HH = (n: number) => String(n).padStart(2, '0')

// 천간 음양 (1=양, 0=음).
const STEM_YANG: Record<string, number> = { 甲: 1, 丙: 1, 戊: 1, 庚: 1, 壬: 1, 乙: 0, 丁: 0, 己: 0, 辛: 0, 癸: 0 }
// 오행 상생(生)/상극(剋).
const GEN: Record<string, string> = { mok: 'hwa', hwa: 'to', to: 'geum', geum: 'su', su: 'mok' }
const CTRL: Record<string, string> = { mok: 'to', to: 'su', su: 'hwa', hwa: 'geum', geum: 'mok' }

export const GOD_KO: Record<string, string> = {
  bigyeon: '비견', geopjae: '겁재', siksin: '식신', sanggwan: '상관',
  pyeonjae: '편재', jeongjae: '정재', pyeongwan: '편관', jeonggwan: '정관',
  pyeonin: '편인', jeongin: '정인', ilwon: '일원(본인)',
}

const EL_KO: Record<string, string> = { mok: '목(木)', hwa: '화(火)', to: '토(土)', geum: '금(金)', su: '수(水)' }

/** 일간(day master) 기준 십신(十神) 산출. SajuChart.vue의 tenGod와 동일 규칙. */
function tenGod(dayStem: string, ch: string): string {
  const de = STEM_ELEM[dayStem], te = STEM_ELEM[ch]
  const same = STEM_YANG[dayStem] === STEM_YANG[ch]
  if (de === te) return same ? 'bigyeon' : 'geopjae'
  if (GEN[de] === te) return same ? 'siksin' : 'sanggwan'
  if (CTRL[de] === te) return same ? 'pyeonjae' : 'jeongjae'
  if (CTRL[te] === de) return same ? 'pyeongwan' : 'jeonggwan'
  if (GEN[te] === de) return same ? 'pyeonin' : 'jeongin'
  return 'bigyeon'
}

export interface MyeongsikInput {
  year: number; month: number; day: number
  hour: number | null; minute: number | null
  calendar: string; gender: 'm' | 'f'; name?: string
}

export interface Myeongsik {
  user: { name: string; meta: string; solar: string; lunar: string; hour: string }
  pillars: Pillars
  ohaeng: Record<string, number>
  strongWeak: { type: 'strong' | 'weak'; score: string }
  daeun: ReturnType<typeof buildDaeun> | { startAge: number; startNote: boolean; currentIndex: number; sequence: [] }
  dayStem: string
  dayElement: string
  tenGods: { position: string; stem: string; stemGod: string; branch: string; branchGod: string }[]
}

/** Supabase 클라이언트(서버)와 입력을 받아 명식을 빌드한다. 데이터 없으면 null. */
export async function buildMyeongsik(client: any, input: MyeongsikInput): Promise<Myeongsik | null> {
  const { year, month, day, calendar, gender } = input
  const hour = input.hour == null ? null : Number(input.hour)
  const minute = input.minute == null ? 0 : Number(input.minute)
  const name = String(input.name || '').trim()

  // 1) 명식 row (양/음력 분기, 윤달).
  let q = client.from('calenda_data')
    .select('cd_sy, cd_sm, cd_sd, cd_ly, cd_lm, cd_ld, cd_hyganjee, cd_hmganjee, cd_hdganjee')
  if (calendar === 'lunar' || calendar === 'lunar-leap') {
    q = q.eq('cd_ly', year).eq('cd_lm', String(month)).eq('cd_ld', String(day)).eq('cd_leap_month', calendar === 'lunar-leap' ? 1 : 0)
  } else {
    q = q.eq('cd_sy', year).eq('cd_sm', String(month)).eq('cd_sd', String(day))
  }
  const { data: row } = await q.limit(1).maybeSingle()
  if (!row || !row.cd_hyganjee || !row.cd_hdganjee) return null

  const sy = Number(String(row.cd_sy)), sm = Number(String(row.cd_sm).trim()), sd = Number(String(row.cd_sd).trim())
  const ly = Number(String(row.cd_ly)), lm = Number(String(row.cd_lm).trim()), ld = Number(String(row.cd_ld).trim())

  const yearP: [string, string] = [row.cd_hyganjee.charAt(0), row.cd_hyganjee.charAt(1)]
  const monthP: [string, string] = [row.cd_hmganjee.charAt(0), row.cd_hmganjee.charAt(1)]
  const dayP: [string, string] = [row.cd_hdganjee.charAt(0), row.cd_hdganjee.charAt(1)]
  const hourP = timePillar(dayP[0], hour)
  const pillars: Pillars = { year: yearP, month: monthP, day: dayP, hour: hourP }

  // 2) 절기(대운용): 출생년 ±1년.
  const { data: termRows } = await client.from('calenda_data')
    .select('cd_kterms, cd_terms_time')
    .in('cd_sy', [sy - 1, sy, sy + 1])
    .not('cd_terms_time', 'is', null)
  const terms: Term[] = (termRows || [])
    .filter((t: any) => t.cd_terms_time)
    .map((t: any) => ({ name: t.cd_kterms, datetime: parseTermTime(String(t.cd_terms_time)) }))

  // 3) 대운.
  const birth = new Date(sy, sm - 1, sd, hour ?? 12, minute || 0)
  const currentYear = new Date().getFullYear()
  const daeun = terms.length
    ? buildDaeun({ yearStem: yearP[0], monthPillar: row.cd_hmganjee, gender, birth, terms, birthYear: sy, currentYear })
    : { startAge: 0, startNote: false, currentIndex: -1, sequence: [] as [] }

  // 4) 오행/신강신약.
  const ohaeng = ohaengScore(pillars)
  const sw = strongWeak(pillars, dayP[0])

  // 5) 십신: 각 기둥 천간 + 지지(대표 오행).
  const dayStem = dayP[0]
  const positions: [string, [string, string] | null][] = [
    ['년주', yearP], ['월주', monthP], ['일주', dayP], ['시주', hourP],
  ]
  const tenGods = positions
    .filter(([, p]) => p)
    .map(([position, p]) => {
      const [stem, branch] = p as [string, string]
      return {
        position,
        stem,
        stemGod: position === '일주' ? 'ilwon' : tenGod(dayStem, stem),
        branch,
        branchGod: tenGod(dayStem, branch),
      }
    })

  const hourLabel = hourP ? `${hourP[1]}시 (${HH(hour as number)}:${HH(minute || 0)})` : '시간 모름'
  return {
    user: { name: name || '', meta: '', solar: `${sy}.${sm}.${sd}`, lunar: `${ly}.${lm}.${ld}`, hour: hourLabel },
    pillars,
    ohaeng,
    strongWeak: sw,
    daeun,
    dayStem,
    dayElement: EL_KO[STEM_ELEM[dayStem]] || '',
    tenGods,
  }
}

/** 명식을 Claude 프롬프트용 한국어 텍스트 블록으로 직렬화. */
export function formatMyeongsikForPrompt(m: Myeongsik): string {
  const p = m.pillars
  const pill = (x: [string, string] | null) => (x ? `${x[0]}${x[1]}` : '미상(시간 모름)')
  const ohaengLine = (['mok', 'hwa', 'to', 'geum', 'su'] as const)
    .map((e) => `${EL_KO[e]} ${m.ohaeng[e] ?? 0}`).join(' / ')
  const tg = m.tenGods.map((g) =>
    `  - ${g.position}: 천간 ${g.stem}(${GOD_KO[g.stemGod]}) · 지지 ${g.branch}(${GOD_KO[g.branchGod]})`).join('\n')
  const birthYear = Number(String(m.user.solar).split('.')[0]) || 0
  const dae = m.daeun.sequence?.length
    ? m.daeun.sequence.map((d: any, i: number) => {
        const y0 = birthYear + d.age
        const yr = birthYear ? ` (${y0}~${y0 + 9}년)` : ''
        return `  · ${i + 1}차 ${d.stem}${d.branch} ${d.age}~${d.age + 9}세${yr}${i === m.daeun.currentIndex ? ' ← 현재 대운' : ''}`
      }).join('\n')
    : '  · 대운 정보 없음'
  return [
    `[사주 명식]`,
    `- 양력 ${m.user.solar} / 음력 ${m.user.lunar} / 생시 ${m.user.hour}`,
    `- 사주 4기둥(四柱): 년주 ${pill(p.year)} · 월주 ${pill(p.month)} · 일주 ${pill(p.day)} · 시주 ${pill(p.hour)}`,
    `- 일간(日干, 본인): ${m.dayStem} (${m.dayElement})`,
    `- 신강/신약: ${m.strongWeak.type === 'strong' ? '신강(身强)' : '신약(身弱)'} (부조:설기 = ${m.strongWeak.score})`,
    `- 오행 분포: ${ohaengLine}`,
    `- 십신(十神):`,
    tg,
    `- 대운(大運, 10년 단위, 1차부터):`,
    dae,
  ].join('\n')
}
