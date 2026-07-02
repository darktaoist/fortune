import { serverSupabaseClient } from '#supabase/server'

/**
 * MBTI×MBTI 궁합 허브용 — 한 언어의 136개 조합 점수를 단일 쿼리로 조회.
 * compat_score는 언어별 LLM 생성물에서 각각 추출되어 로케일마다 다르므로
 * (조사결과 136 중 132 pair가 언어간 상이) lang 파라미터를 유지한다.
 * 반환: { lang, scores: { 'INTJ-ISTP': 78, ... } } — 키는 대문자 정규 pair.
 */
const LANGS = ['ko', 'en', 'ja', 'zh']

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const lang = LANGS.includes(String(q.lang)) ? String(q.lang) : 'ko'

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('mbti_compatibility')
    .select('pair, compat_score')
    .eq('lang', lang)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const scores: Record<string, number> = {}
  for (const row of data || []) {
    if (row.pair && row.compat_score != null) scores[String(row.pair)] = Number(row.compat_score)
  }
  return { lang, scores }
})
