import { serverSupabaseClient } from '#supabase/server'

/**
 * 오늘의 운세 — ported from 1.0 (src/utils/unse.js + today.vue).
 *
 * Deterministic number hash (NOT manse-ryeok based): picks 1 of 120 fortunes
 * from a birth + target-date arithmetic, then reads the `today` table by
 * (number, nation). Replicates 1.0's effective formula for result parity:
 *   - "sex" slot actually carried the calendar type (1/2/3) in 1.0 → kept.
 *   - lunar→solar conversion was a no-op stub in 1.0 → not applied.
 *   - hour term uses the literal clock hour HH (0–23) like 1.0 (which sliced
 *     HH from a "HHMM" string), NOT a 지지(地支) block. Unknown hour → 11,
 *     matching 1.0's 정시법 default of 11:30 AM.
 * Refinements (real sex / lunar conversion via calenda_data) can come later.
 */
const CAL_CODE: Record<string, number> = { solar: 1, lunar: 2, 'lunar-leap': 3 }
const NATION: Record<string, string> = { ko: 'k', en: 'e', ja: 'j', zh: 'c' }

function fortuneNumber(year: number, month: number, day: number, hour: number | null, calendar: string, target: string) {
  const y2 = parseInt(String(year).slice(-2)) || 0
  // 1.0 parity: clock hour 0–23; unknown (null) → 11 (1.0 default 11:30 → HH=11).
  const h = hour == null || Number.isNaN(hour) ? 11 : hour
  const cal = CAL_CODE[calendar] ?? 1
  const [ty, tm, td] = target.split('-').map((n) => parseInt(n))
  let n = (y2 * 5) + (month * 3) + (day * 1) + (h * 7) + cal + ((ty - 2000) * 1) + (tm * 3) + (td * 5)
  n = ((n % 120) + 120) % 120
  return 'to' + String(n).padStart(3, '0')
}

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
  const hour = body?.hour == null || body.hour === '' ? null : Number(body.hour)
  const number = fortuneNumber(year, month, day, hour, String(body?.calendar || 'solar'), target)

  const client = await serverSupabaseClient(event)
  const cols = 'total, money, biz, job, love, wish, hope'

  let { data } = await client.from('today').select(cols).eq('number', number).eq('nation', nation).maybeSingle()
  let usedNation = nation
  if (!data && nation !== 'k') {
    const fb = await client.from('today').select(cols).eq('number', number).eq('nation', 'k').maybeSingle()
    data = fb.data
    usedNation = 'k'
  }

  return { number, target, lang, nation: usedNation, fortune: data || null }
})
