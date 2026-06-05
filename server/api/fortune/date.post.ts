import { serverSupabaseClient } from '#supabase/server'

/**
 * 데이트 운세(date) — ported from 1.0 (todaydate.vue + utils/unse.js).
 *
 * Number = the SAME 120-hash as 오늘의 운세 (unse_nolmal), then reduced mod 63:
 *   n120  = unse_nolmal(...) % 120            // identical to today's number
 *   date  = n120 % 63                         // 0..62  → "0000".."0062"
 * The two-step modulo is load-bearing: (sum % 120) % 63 ≠ sum % 63 once
 * sum ≥ 120 (always true here). Reads `today_date_unse` by (num, sex, nation):
 * datetotal + dateplace + datewish. Table is 63 nums × 2 sexes = 126 rows/nation.
 *
 * 1.0 parity notes (shared with today.post.ts — same unse_nolmal slots):
 *   - The "sex" arg slot of unse_nolmal actually received the calendar code
 *     (1/2/3) in 1.0 → kept as `cal`. The real M/W gender is a SEPARATE filter
 *     on the table's `sex` column ('M'/'W'), not part of the number.
 *   - unse_nolmal's lunar branch was fed birthMinute (never "02") + a no-op
 *     lun2sol stub → lunar→solar conversion not applied. Follow-up later.
 *   - hour term uses literal clock hour HH (0–23); unknown → 11, matching
 *     today.post.ts so the same unknown-hour user gets the same base number for
 *     both today and date (1.0 fed both features the identical h).
 *   - Fallback: (num,sex,nation) → (num,sex,'k') → ('0001',sex,'k'). 1.0's
 *     numeric-form step is dead code (varchar "0045" ≠ int 45) and is dropped.
 *     With a complete k table the only live fallback is a missing non-k row
 *     (e.g. ('0045','M','e') → k).
 */
const CAL_CODE: Record<string, number> = { solar: 1, lunar: 2, 'lunar-leap': 3 }
const NATION: Record<string, string> = { ko: 'k', en: 'e', ja: 'j', zh: 'c' }

function dateNumber(year: number, month: number, day: number, hour: number | null, calendar: string, target: string) {
  const y2 = parseInt(String(year).slice(-2)) || 0
  const h = hour == null || Number.isNaN(hour) ? 11 : hour
  const cal = CAL_CODE[calendar] ?? 1
  const [ty, tm, td] = target.split('-').map((n) => parseInt(n))
  let n = (y2 * 5) + (month * 3) + (day * 1) + (h * 7) + cal + ((ty - 2000) * 1) + (tm * 3) + (td * 5)
  const n120 = ((n % 120) + 120) % 120
  const dateNum = n120 % 63
  return String(dateNum).padStart(4, '0')
}

const COLS = 'datetotal, dateplace, datewish'

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
  const sex = body?.gender === 'f' ? 'W' : 'M'
  const target = /^\d{4}-\d{2}-\d{2}$/.test(body?.target) ? body.target : new Date().toISOString().slice(0, 10)
  const hour = body?.hour == null || body.hour === '' ? null : Number(body.hour)
  const num = dateNumber(year, month, day, hour, String(body?.calendar || 'solar'), target)

  const client = await serverSupabaseClient(event)
  const pick = async (n: string, nat: string) =>
    (await client.from('today_date_unse').select(COLS).eq('num', n).eq('sex', sex).eq('nation', nat).maybeSingle()).data

  let usedNation = nation
  let data = await pick(num, nation)
  if (!data && nation !== 'k') { data = await pick(num, 'k'); if (data) usedNation = 'k' }
  if (!data) { data = await pick('0001', 'k'); if (data) usedNation = 'k' }

  return { num, sex, target, lang, nation: usedNation, fortune: data || null }
})
