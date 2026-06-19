import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * 공개 샘플 — "구매하면 이런 결과를 받습니다"를 보여주는 마케팅용 미리보기.
 * 결제 게이트 없음(의도적 공개). 단, 아래 화이트리스트에 등록된 saved_readings id만
 * 노출해 임의 결과가 새어나가지 않도록 한다. saved_readings는 RLS(본인만)라 service role로 읽는다.
 *
 * 샘플 갱신법: 예시 인물(홍길동/John Doe/張三/山田太郎 등)로 결제·열람하면
 * premium-stream이 그 주문의 saved_readings.payload에 섹션까지 저장한다.
 * 그 saved_readings.id 를 아래 맵에 등록만 하면 된다. 요청 언어가 없으면 ko로 폴백.
 *
 * TODO: gunghap/mbti/newyear 서비스도 등록.
 */
// service → 언어별 saved_readings.id
const SAMPLE_READINGS: Record<string, Record<string, string>> = {
  lifetime: {
    ko: '5fdd07d8-8436-4167-b586-16d828210f26', // 홍길동
    en: 'f5b77a55-a21e-489c-8024-d1df260dbfc2', // John Doe
    ja: '1e2e2dbd-fa04-4f90-b428-f912dc67b79f', // 山田太郎
    zh: '93aa1de2-328f-4e2b-b70f-6588daa61348', // 張三
  },
}
const FALLBACK_LANG = 'ko'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const service = String(q.service || '').toLowerCase()
  const lang = String(q.lang || FALLBACK_LANG).toLowerCase()
  const byLang = SAMPLE_READINGS[service]
  if (!byLang) throw createError({ statusCode: 404, statusMessage: 'no sample for service' })
  const readingId = byLang[lang] || byLang[FALLBACK_LANG] || Object.values(byLang)[0]
  if (!readingId) throw createError({ statusCode: 404, statusMessage: 'no sample for service' })

  const admin = serverSupabaseServiceRole(event)
  const { data: sr } = await admin
    .from('saved_readings')
    .select('subject, payload, glyph, tint')
    .eq('id', readingId)
    .maybeSingle()

  const p = (sr?.payload || {}) as Record<string, any>
  if (!Array.isArray(p.sections) || !p.sections.length) {
    throw createError({ statusCode: 404, statusMessage: 'sample not generated yet' })
  }

  // 결과 전용 필드만 공개로 반환.
  return {
    service,
    glyph: sr?.glyph || '命',
    tint: sr?.tint || 'gold',
    subject: sr?.subject || null,
    sections: p.sections,
    score: p.score ?? null,
    myeongsik: p.myeongsik || null,
    partnerMyeongsik: p.partnerMyeongsik || null,
    partnerName: p.partnerName || '',
    partnerMbti: p.partnerMbti || '',
  }
})
