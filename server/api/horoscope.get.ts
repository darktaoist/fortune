import { serverSupabaseClient } from '#supabase/server'

/**
 * 띠별 오늘의 운세 — today's 12-zodiac daily horoscope from daily_horoscope.
 * "Today" is computed in KST (this is a Korean service). If today has no rows
 * (e.g., seed window ended), falls back to the latest available date ≤ today so
 * the page is never empty. zodiac_ko is the Korean label key across all langs.
 */
const LANGS = ['ko', 'en', 'ja', 'zh']

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const lang = LANGS.includes(String(q.lang)) ? String(q.lang) : 'ko'
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10) // KST date
  const client = await serverSupabaseClient(event)

  // resolve the date to show: today, else latest available ≤ today
  let useDate = today
  const exists = await client
    .from('daily_horoscope').select('target_date').eq('lang', lang).eq('target_date', today).limit(1).maybeSingle()
  if (!exists.data) {
    const latest = await client
      .from('daily_horoscope').select('target_date').eq('lang', lang).lte('target_date', today)
      .order('target_date', { ascending: false }).limit(1).maybeSingle()
    if (latest.data) useDate = latest.data.target_date
  }

  const { data, error } = await client
    .from('daily_horoscope')
    .select('zodiac_ko, birth_years, content, lucky_color, lucky_color_hex, lucky_number, lucky_dir')
    .eq('lang', lang).eq('target_date', useDate)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const byZodiac: Record<string, any> = {}
  for (const r of data || []) {
    byZodiac[r.zodiac_ko] = {
      birth_years: r.birth_years, content: r.content,
      color: r.lucky_color, colorHex: r.lucky_color_hex, num: r.lucky_number, dir: r.lucky_dir,
    }
  }

  return { lang, date: useDate, isToday: useDate === today, byZodiac }
})
