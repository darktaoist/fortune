import { serverSupabaseClient } from '#supabase/server'

/**
 * 정통 평생운세(lifeall) — ported from 1.0 (lifeall.vue). service=hour on the UI.
 * num = (yearDigitSum + month + day + timeValue + genderValue + calendarValue) % 60
 *   → "000".."059". Reads `lifeall` by (num, nation): sajuwoon + earlyyear +
 *   middleyear + lastyear + lovewealth + jobhealth (6 life-stage sections).
 *
 * 1.0 parity notes:
 *   - yearDigitSum = sum of the birth year's digits (1990 → 1+9+9+0 = 19).
 *   - timeValue = floor(hour/2) % 12 (2-hour 지지 block). Unknown hour → 11
 *     (matching today/date's convention so a null hour means the same thing
 *     everywhere) → timeValue 5. 1.0's literal `timeValue=0` branch was dead
 *     code for unknown users (borninfo stored the 11:30 정시법 default).
 *   - genderValue: 여(f) → 30, else 0. calendarValue: 음력 → 10, 음력윤달 → 20,
 *     양력 → 0.
 *   - Fallback is 1.0 lifeall.vue's exact single step: (num,nation) → on miss →
 *     ('000','k'). It does NOT preserve language. maybeSingle() returns null on
 *     0 rows — e.g. missing non-k rows (c lacks 007–009) → ('000','k').
 *   - Divergence from 1.0: a misfiled English row under k/020 made that key
 *     return 2 rows, so 1.0's `.single()` errored → '000'. We deleted that dup
 *     (scripts/db/fix-lifeall-020-dup.sql), so k/020 now serves its real reading
 *     instead of '000'. maybeSingle() (no limit(1)) still null→fallbacks for any
 *     genuine 0-row gap or future duplicate.
 */
const NATION: Record<string, string> = { ko: 'k', en: 'e', ja: 'j', zh: 'c' }

function lifeallNumber(year: number, month: number, day: number, hour: number | null, calendar: string, gender: string) {
  const yearSum = String(year).split('').reduce((s, d) => s + (Number(d) || 0), 0)
  const h = hour == null || Number.isNaN(hour) ? 11 : hour
  const timeValue = Math.floor(h / 2) % 12
  const genderValue = gender === 'f' ? 30 : 0
  const calendarValue = calendar === 'lunar' ? 10 : calendar === 'lunar-leap' ? 20 : 0
  return String((yearSum + month + day + timeValue + genderValue + calendarValue) % 60).padStart(3, '0')
}

const COLS = 'sajuwoon, earlyyear, middleyear, lastyear, lovewealth, jobhealth'

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
  const gender = body?.gender === 'f' ? 'f' : 'm'
  const hour = body?.hour == null || body.hour === '' ? null : Number(body.hour)
  const num = lifeallNumber(year, month, day, hour, String(body?.calendar || 'solar'), gender)

  const client = await serverSupabaseClient(event)
  const pick = async (n: string, nat: string) =>
    (await client.from('lifeall').select(COLS).eq('num', n).eq('nation', nat).maybeSingle()).data

  // 1.0 lifeall.vue fallback: (num,nation) → on miss → ('000','k').
  let usedNation = nation
  let data = await pick(num, nation)
  if (!data) { data = await pick('000', 'k'); if (data) usedNation = 'k' }

  return { num, lang, nation: usedNation, fortune: data || null }
})
