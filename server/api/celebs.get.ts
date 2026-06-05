import { serverSupabaseClient } from '#supabase/server'

/**
 * 연예인 목록 — for the 연예인 궁합 selection grid (pages/celeb-select.vue).
 * Joins `celebrities` (active, sort_order) with `celebrity_translations`.
 * Returns localized name/occupation for the requested lang plus all-language
 * names (so the client can search across languages, like the prototype did).
 * Photos are the legacy portraits, resized to 512px JPEG under /public/celebs/
 * (mirrors `image_path`, .png→.jpg). The UI tones them for the dark theme and
 * falls back to a tinted initial avatar (`tint`, derived from the celeb id) if
 * an image is missing.
 */
const TINTS = ['gold', 'rose', 'purple', 'jade', 'blue']
const LANGS = ['ko', 'en', 'ja', 'zh']

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const lang = LANGS.includes(String(q.lang)) ? String(q.lang) : 'ko'
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('celebrities')
    .select(
      'id, slug, image_path, birth_year, birth_month, birth_day, calendar_type, gender, mbti, sort_order, celebrity_translations(language_code, name, occupation)',
    )
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const celebs = (data || []).map((c: any) => {
    const tr: any[] = c.celebrity_translations || []
    const names: Record<string, string> = {}
    for (const t of tr) names[t.language_code] = t.name
    const localized = tr.find((t) => t.language_code === lang) || tr.find((t) => t.language_code === 'ko') || tr[0] || {}
    return {
      id: c.slug, // stable, URL-friendly identifier
      names, // { ko, en, ja, zh } for cross-language search
      name: localized.name || names.ko || c.slug,
      occupation: localized.occupation || '',
      image: c.image_path ? '/celebs/' + String(c.image_path).replace(/\.png$/i, '.jpg') : null,
      mbti: c.mbti || '',
      gender: c.gender === 'F' ? 'f' : 'm',
      birth: {
        y: c.birth_year,
        m: c.birth_month,
        d: c.birth_day,
        cal: c.calendar_type === 'lunar' ? 'lunar' : 'solar',
      },
      tint: TINTS[c.id % TINTS.length],
    }
  })

  return { lang, count: celebs.length, celebs }
})
