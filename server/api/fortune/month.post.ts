import { serverSupabaseClient } from '#supabase/server'

/**
 * 이달의 운세(month) — ported from 1.0 (month.vue).
 * num hash picks 1 of 72 fortunes from birth Y+M+D and the CURRENT month
 * (so the same person rotates through 6 readings as the month changes). Reads
 * the `month_unse` table by (num, nation): total + manwoman + date_unse +
 * kind_unse.
 *
 * 1.0 parity notes:
 *   - Formula yields "001".."072" while the table is indexed "000".."071"
 *     (off-by-one in 1.0 prod). The table here is a verbatim copy, so we
 *     replicate the formula exactly → identical results.
 *   - Fallback is 1.0 month.vue's exact single step: (num,nation) → on miss →
 *     ('001','k'). It does NOT preserve language (unlike tojung's chain). The
 *     only num that ever misses is December's "072" (the off-by-one orphan,
 *     absent in every nation); for all other months the primary lookup hits.
 *   - Y/M/D are solar (1.0 borninfo stores solar); lunar conversion is a
 *     separate follow-up, same as today/tojung.
 *   - currentMonth is derived from a client-passed `target` (YYYY-MM-DD) like
 *     today.vue, so SSR/client and timezone behavior match the existing pattern.
 */
const NATION: Record<string, string> = { ko: 'k', en: 'e', ja: 'j', zh: 'c' }

function monthNumber(year: number, month: number, day: number, currentMonth: number) {
  const userValue = year + month + day
  const monthFactor = currentMonth * 6 // 1월:6, 2월:12, … 12월:72
  const userMonthValue = userValue % 6 // 0–5
  const result = monthFactor - 6 + userMonthValue + 1 // 1..72
  return String(result).padStart(3, '0')
}

const COLS = 'total, manwoman, date_unse, kind_unse'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const year = Number(body?.year)
  const month = Number(body?.month)
  const day = Number(body?.day)
  if (!year || !month || !day) {
    throw createError({ statusCode: 400, statusMessage: 'birth date (year, month, day) required' })
  }
  const lang = String(body?.lang || 'ko')
  const nation = NATION[lang] || 'k'
  const target = /^\d{4}-\d{2}-\d{2}$/.test(body?.target) ? body.target : new Date().toISOString().slice(0, 10)
  const currentMonth = parseInt(target.split('-')[1], 10)
  const num = monthNumber(year, month, day, currentMonth)

  const client = await serverSupabaseClient(event)
  const pick = async (n: string, nat: string) =>
    (await client.from('month_unse').select(COLS).eq('num', n).eq('nation', nat).maybeSingle()).data

  // 1.0 month.vue fallback: (num,nation) → on miss → ('001','k').
  let usedNation = nation
  let data = await pick(num, nation)
  if (!data) { data = await pick('001', 'k'); if (data) usedNation = 'k' }

  return { num, target, lang, nation: usedNation, fortune: data || null }
})
