import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { toTraditional } from '../../utils/zh'

/**
 * 토정비결(tojung) — ported from 1.0 (tojung.vue).
 * num hash picks 1 of 72 fortunes from birth date + gender only (NOT target
 * year — the "2026" edition lives in the table content). Reads the `tojung`
 * table by (num, nation): total + 12 monthly texts (jan..dec).
 *
 * 1.0 parity notes:
 *   - Formula yields "001".."072" while the table is indexed "000".."071"
 *     (off-by-one in 1.0 prod). The table here is a verbatim copy, so we
 *     replicate the formula + fallback chain exactly → identical results.
 *   - Y/M/D are solar (1.0 borninfo stores solar); lunar conversion is a
 *     separate follow-up, same as today.
 */
const NATION: Record<string, string> = { ko: 'k', en: 'e', ja: 'j', zh: 'c' }

function tojungNumber(year: number, month: number, day: number, gender: string) {
  const zodiacGroup = ((year % 12) + 12) % 12
  const genderFactor = gender === 'm' ? 0 : 36 // 1.0: sex==='남' ? 0 : 36
  const result = zodiacGroup * 3 + ((year + month + day) % 3) + 1 + genderFactor // 1..72
  return String(result).padStart(3, '0')
}

const COLS = 'total, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec'
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * 2027 토정비결 유료 풀이를 여는 구매 type_key. 새 상품을 만들지 않고 기존 상품 구매자에게 연다.
 * 결과 화면의 잠금 CTA는 기존 토정비결 업셀과 같은 lifetime으로 보낸다.
 */
const TOJUNG_PAID_KEYS = ['lifetime', 'newyear']

/** 로그인 + TOJUNG_PAID_KEYS 중 paid 구매가 있는지. 무료 흐름을 막지 않도록 절대 throw하지 않는다. */
async function hasPaidPurchase(event: any): Promise<boolean> {
  let user: any = null
  try { user = await serverSupabaseUser(event) } catch { user = null }
  if (!user) return false
  const { data } = await serverSupabaseServiceRole(event)
    .from('purchases').select('id')
    .eq('owner_id', user.id).in('type_key', TOJUNG_PAID_KEYS).eq('status', 'paid')
    .limit(1).maybeSingle()
  return !!data
}

/**
 * TOJUNG_YEAR=2027(runtimeConfig.public.tojungYear) — 새 테이블(tojung_yearly/monthly)에서
 * 계산값 그대로(001~072, 1칸 어긋남 미적용) 읽는다. 해당 코드·언어가 없으면 null → 2026 경로로 폴백.
 * 무료: 총운 + 월별 본문(2026과 같은 범위) + 헤드라인. 유료(결제 확인 시에만): 요약·항목별·
 * 좋은 달/조심할 달·행운·월별 등급/요약/항목/조언.
 * 공개 RLS 정책이 없으므로 service role로만 읽힌다(0016). 개발 서버는 draft도 읽고 paidPreview를 허용한다.
 */
async function load2027(event: any, code: string, lang: string, paidPreview: boolean) {
  const admin = serverSupabaseServiceRole(event)
  const statuses = import.meta.dev ? ['draft', 'published'] : ['published']
  const key = { year: 2027, scheme: 'legacy72', gwae_code: code, lang }
  const { data: y } = await admin.from('tojung_yearly').select('*').match(key).in('status', statuses).maybeSingle()
  if (!y) return null
  const { data: ms } = await admin.from('tojung_monthly').select('*').match(key).in('status', statuses).order('month')
  if (!ms || ms.length !== 12) return null

  const z = (s: string | null) => toTraditional(s || '', lang)
  const fortune: Record<string, string> = { total: z(y.total) }
  for (const m of ms) fortune[MONTH_KEYS[m.month - 1]] = z(m.body)

  const paid = (import.meta.dev && paidPreview) || (await hasPaidPurchase(event))
  const detail = paid
    ? {
        grade: y.grade, summary: z(y.summary),
        wealth: z(y.wealth), career: z(y.career), love: z(y.love), health: z(y.health), family: z(y.family), caution: z(y.caution),
        good_months: y.good_months, bad_months: y.bad_months,
        lucky: y.lucky && { ...y.lucky, colors: (y.lucky.colors || []).map(z), direction: z(y.lucky.direction), item: z(y.lucky.item) },
        months: ms.map((m) => ({ month: m.month, grade: m.grade, summary: z(m.summary), wealth: z(m.wealth), career: z(m.career), love: z(m.love), health: z(m.health), advice: z(m.advice) })),
      }
    : null
  return { num: code, lang, nation: lang, year: 2027, headline: z(y.headline), paid, detail, fortune }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const year = Number(body?.year)
  const month = Number(body?.month)
  const day = Number(body?.day)
  if (!year || !month || !day) {
    throw createError({ statusCode: 400, statusMessage: 'birth date (year, month, day) required' })
  }
  const gender = body?.gender === 'f' ? 'f' : 'm'
  const lang = String(body?.lang || 'ko')
  const nation = NATION[lang] || 'k'
  const num = tojungNumber(year, month, day, gender)

  if (String(useRuntimeConfig().public.tojungYear) === '2027') {
    const r = await load2027(event, num, lang, body?.paidPreview === true)
    if (r) return r
  }

  const client = await serverSupabaseClient(event)
  const pick = async (n: string, nat: string) =>
    (await client.from('tojung').select(COLS).eq('num', n).eq('nation', nat).maybeSingle()).data

  // 1.0 fallback chain: (num,nation) → ('002',nation) → (num,'k') → ('002','k').
  let usedNation = nation
  let data = await pick(num, nation)
  if (!data) data = await pick('002', nation)
  if (!data) { data = await pick(num, 'k'); if (data) usedNation = 'k' }
  if (!data) { data = await pick('002', 'k'); if (data) usedNation = 'k' }

  return { num, lang, nation: usedNation, fortune: data || null }
})
