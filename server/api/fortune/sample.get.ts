import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * 공개 샘플 — "구매하면 이런 결과를 받습니다"를 보여주는 마케팅용 미리보기.
 * 결제 게이트 없음(의도적 공개). 단, 아래 화이트리스트에 등록된 order_no만 노출해
 * 임의 주문이 새어나가지 않도록 한다. saved_readings는 RLS(본인만)라 service role로 읽는다.
 *
 * 샘플 갱신법: 관리자가 예시 인물(예: 홍길동)로 결제·열람 → 그 order_no를 여기 등록.
 * 결과 생성 시 premium-stream이 해당 주문의 saved_readings에 섹션까지 저장하므로
 * order_no → purchases.reading_id → saved_readings.payload 로 전체 결과를 얻는다.
 */
// service → 언어별 order_no. 샘플은 생성 당시 언어로 고정이라 언어별로 따로 등록한다.
// 요청 언어가 없으면 ko로 폴백.
// TODO: 언어별 홍길동 샘플 생성 후 en/ja/zh 추가, gunghap/mbti/newyear 서비스도 등록.
const SAMPLE_ORDERS: Record<string, Record<string, string>> = {
  lifetime: {
    ko: 'tao_4c5006f0e78541ef8015b0119e5b189a', // 홍길동 (현재 전 언어 이 샘플로 폴백)
  },
}
const FALLBACK_LANG = 'ko'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const service = String(q.service || '').toLowerCase()
  const lang = String(q.lang || FALLBACK_LANG).toLowerCase()
  const byLang = SAMPLE_ORDERS[service]
  if (!byLang) throw createError({ statusCode: 404, statusMessage: 'no sample for service' })
  const orderNo = byLang[lang] || byLang[FALLBACK_LANG] || Object.values(byLang)[0]
  if (!orderNo) throw createError({ statusCode: 404, statusMessage: 'no sample for service' })

  const admin = serverSupabaseServiceRole(event)

  const { data: pur } = await admin
    .from('purchases')
    .select('reading_id')
    .eq('order_no', orderNo)
    .single()
  if (!pur?.reading_id) throw createError({ statusCode: 404, statusMessage: 'sample order not found' })

  const { data: sr } = await admin
    .from('saved_readings')
    .select('subject, payload, glyph, tint')
    .eq('id', pur.reading_id)
    .single()
  const p = (sr?.payload || {}) as Record<string, any>
  if (!Array.isArray(p.sections) || !p.sections.length) {
    throw createError({ statusCode: 404, statusMessage: 'sample not generated yet' })
  }

  // 샘플은 생성 당시 언어 1개로 고정(현재 ko). 결과 전용 필드만 공개로 반환.
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
