import { serverSupabaseClient } from '#supabase/server'

/**
 * FAQ 목록 — for pages/faq.vue. Real data from faq_categories / faqs /
 * faq_translations. Note `faq_translations` holds BOTH category names (rows
 * where faq_id IS NULL → title = category name) and Q&A rows (faq_id set →
 * title = question, content = answer). Category chip labels come from the DB,
 * not i18n (DB codes general/account/fortune/payment/technical don't match the
 * prototype's fixed faq.cat.* keys).
 */
const LANGS = ['ko', 'en', 'ja', 'zh']

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const lang = LANGS.includes(String(q.lang)) ? String(q.lang) : 'ko'
  const client = await serverSupabaseClient(event)

  const [cats, faqs, trs] = await Promise.all([
    client.from('faq_categories').select('id, code, sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
    client.from('faqs').select('id, category_id, sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
    client.from('faq_translations').select('category_id, faq_id, language_code, title, content'),
  ])
  if (cats.error || faqs.error || trs.error) {
    throw createError({ statusCode: 500, statusMessage: (cats.error || faqs.error || trs.error)?.message })
  }

  const catName: Record<number, Record<string, string>> = {}
  const faqTr: Record<number, Record<string, any>> = {}
  for (const t of trs.data || []) {
    if (t.faq_id == null) (catName[t.category_id] ||= {})[t.language_code] = t.title
    else (faqTr[t.faq_id] ||= {})[t.language_code] = t
  }
  const pickName = (m?: Record<string, string>) => (m ? (m[lang] ?? m.ko ?? Object.values(m)[0] ?? '') : '')
  const codeById: Record<number, string> = {}
  for (const c of cats.data || []) codeById[c.id] = c.code

  const categories = (cats.data || []).map((c) => ({ code: c.code, name: pickName(catName[c.id]) }))
  const list = (faqs.data || [])
    .map((f) => {
      const m = faqTr[f.id] || {}
      const tr = m[lang] || m.ko || Object.values(m)[0] || {}
      return { id: f.id, cat: codeById[f.category_id] || '', q: tr.title || '', a: tr.content || '' }
    })
    .filter((f) => f.q)

  return { lang, categories, faqs: list }
})
