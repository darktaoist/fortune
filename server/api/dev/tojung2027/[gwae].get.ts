import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * 2027 토정비결 파일럿 미리보기 — draft 포함 조회(service role, 서버 전용).
 * 개발 서버에서만 동작한다. production 빌드에서는 import.meta.dev가 false로
 * 치환돼 항상 404 (nuxt.config의 $production.ignore로 파일 자체도 빠진다).
 */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })

  const code = String(getRouterParam(event, 'gwae') || '')
  if (!/^[0-9]{3}$/.test(code)) throw createError({ statusCode: 400, statusMessage: 'gwae_code must be 3 digits' })
  const lang = String(getQuery(event).lang || 'ko')

  const admin = serverSupabaseServiceRole(event)
  const key = { year: 2027, scheme: 'legacy72', gwae_code: code, lang }
  const [{ data: yearly, error: e1 }, { data: months, error: e2 }] = await Promise.all([
    admin.from('tojung_yearly').select('*').match(key).maybeSingle(),
    admin.from('tojung_monthly').select('*').match(key).order('month'),
  ])
  if (e1 || e2) throw createError({ statusCode: 500, statusMessage: (e1 || e2)!.message })
  if (!yearly) throw createError({ statusCode: 404, statusMessage: `no data for ${code}/${lang}` })

  return { yearly, months: months || [] }
})
