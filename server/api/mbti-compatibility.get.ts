import { serverSupabaseClient } from '#supabase/server'

/**
 * MBTI×MBTI 궁합 — 사전 생성된 mbti_compatibility 행을 pair+lang으로 조회.
 * pair는 알파벳 오름차순 대문자 'INTJ-ISTP'. content(jsonb)에 11개 섹션이 들어있다.
 * 화면에는 shorts(영상용)를 제외한 10개 섹션만 노출. zh는 배치에서 이미 번체로 저장됨.
 */
const LANGS = ['ko', 'en', 'ja', 'zh']
const TYPES = ['ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP', 'INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP']
const TYPESET = new Set(TYPES)
// 노출 순서(shorts 제외)
const VISIBLE = ['score', 'firstmeet', 'personality', 'communication', 'love', 'datestyle', 'conflict', 'growth', 'future', 'advice']

// 슬러그/쌍 → 알파벳 오름차순 정규 'INTJ-ISTP'. 유효하지 않으면 null.
export function canonicalPair(raw: string): string | null {
  const parts = String(raw || '').toUpperCase().split('-')
  if (parts.length !== 2) return null
  if (!TYPESET.has(parts[0]) || !TYPESET.has(parts[1])) return null
  return [parts[0], parts[1]].sort().join('-')
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const lang = LANGS.includes(String(q.lang)) ? String(q.lang) : 'ko'
  const pair = canonicalPair(String(q.pair || ''))
  if (!pair) throw createError({ statusCode: 400, statusMessage: 'Invalid MBTI pair' })

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('mbti_compatibility')
    .select('pair, lang, compat_score, content')
    .eq('pair', pair).eq('lang', lang).maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const content = (data?.content && typeof data.content === 'object') ? data.content : (data?.content ? JSON.parse(data.content) : null)
  const sections = content
    ? VISIBLE.filter((k) => content[k] && String(content[k]).trim()).map((k) => ({ key: k, body: String(content[k]) }))
    : []

  return { pair, lang, score: data?.compat_score ?? null, sections, found: !!data }
})
