import { serverSupabaseClient } from '#supabase/server'

/**
 * 로또 운세(lotto) — ported from 1.0 (lotto.vue).
 * num = (birth Y+M+D + ISO-ish week-of-year) % 48 → "000".."047". So a person's
 * reading rotates weekly. Reads `lotto` table by (num, nation): unsetotal +
 * lottolucky + wish. 48 nums × 4 nations, all complete.
 *
 * 1.0 parity notes:
 *   - Number uses ONLY birth Y+M+D and the current week — no hour/gender/calendar.
 *   - weekNumber replicates 1.0's `Math.ceil((dayOfYear + Jan1.getDay() + 1)/7)`.
 *     Both dates are built local-midnight from the target's y/m/d so the day
 *     subtraction is exact and tz-independent (1.0 used `now` but floored to days).
 *   - Fallback: (num,nation) → ('001',nation) → ('001','k'). 1.0's default is
 *     '001' (not '000'); the k table is complete so the chain only matters if a
 *     row is somehow absent.
 */
const NATION: Record<string, string> = { ko: 'k', en: 'e', ja: 'j', zh: 'c' }

function lottoNumber(year: number, month: number, day: number, target: string) {
  const [ty, tm, td] = target.split('-').map(Number)
  const soy = new Date(ty, 0, 1) // Jan 1, local midnight
  const dayOfYear = Math.floor((new Date(ty, tm - 1, td).getTime() - soy.getTime()) / 86400000)
  const weekNumber = Math.ceil((dayOfYear + soy.getDay() + 1) / 7)
  const userValue = year + month + day
  return String((userValue + weekNumber) % 48).padStart(3, '0')
}

const COLS = 'unsetotal, lottolucky, wish'

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
  const num = lottoNumber(year, month, day, target)

  const client = await serverSupabaseClient(event)
  const pick = async (n: string, nat: string) =>
    (await client.from('lotto').select(COLS).eq('num', n).eq('nation', nat).maybeSingle()).data

  let usedNation = nation
  let data = await pick(num, nation)
  if (!data) data = await pick('001', nation)
  if (!data) { data = await pick('001', 'k'); if (data) usedNation = 'k' }

  return { num, target, lang, nation: usedNation, fortune: data || null }
})
