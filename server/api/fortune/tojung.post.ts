import { serverSupabaseClient } from '#supabase/server'

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
