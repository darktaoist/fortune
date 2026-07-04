import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { toPurchaseKey } from '~/shared/premiumService'
import { rateLimit } from '../../utils/ratelimit'
import { isFreeService, remainingCelebQuota, CELEB_FREE_DAILY_LIMIT } from '../../utils/celebFree'

// 연예인 궁합·연예인 MBTI 궁합 무료 흐름의 "주문 생성" 대체.
// 결제(/api/pay/order) 대신: 로그인 확인 → 잔여 쿼터 사전확인 → saved_readings 스냅샷 생성.
// 실제 쿼터 소모(원자적)와 AI 호출은 premium-stream에서. 여기선 스냅샷만 만들어 readingId 반환.
// 반환한 readingId를 프론트가 안정적 URL(?free=id)로 실어 새로고침 시 재생성 없이 리플레이되게 한다.
export default defineEventHandler(async (event) => {
  // 로그인 게이트(결제벽을 대체하는 로그인벽).
  let user: any = null
  try { user = await serverSupabaseUser(event) } catch { user = null }
  if (!user) throw createError({ statusCode: 401, statusMessage: 'login required' })

  // 남용 방지: 계정/IP당 스냅샷 생성 속도 제한(다발 클릭·스크립트 차단).
  rateLimit(event, { key: 'celebfree-order', limit: 10, windowMs: 60_000 })

  const body = await readBody(event)
  const service = String(body?.service || '')
  // 무료 대상은 연예인 궁합(gunghap)·연예인 MBTI 궁합(mbti)뿐. 타 상품은 이 경로 불가.
  if (!isFreeService(service)) throw createError({ statusCode: 400, statusMessage: 'invalid service' })

  const subject = body?.subject ?? null
  if (!subject || typeof subject !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'subject required' })
  }
  // 사주 기반 궁합(gunghap)은 생년월일 필수 — 프론트가 /saju로 먼저 보내야 함(서버측 방어).
  if (service === 'gunghap' && !subject.year) {
    throw createError({ statusCode: 400, statusMessage: 'saju required' })
  }
  const partner = body?.partner ?? null

  const admin = serverSupabaseServiceRole(event)

  // 잔여 쿼터 사전확인(읽기 전용). 0이면 스냅샷을 만들지 않고 소진 화면으로 유도.
  // 실제 소모는 premium-stream의 streamText 직전 원자적 예약이 담당(여기 TOCTOU는 무해).
  const remaining = await remainingCelebQuota(admin, user.id)
  if (remaining <= 0) {
    return { limit: true, remaining: 0, dailyLimit: CELEB_FREE_DAILY_LIMIT }
  }

  // 스냅샷 생성 — 유료(/api/pay/order)와 동일 구조. type_key는 결제 관례(gunghap→celeb).
  // 생성 결과(sections)는 premium-stream이 이 행에 채운다. 채워지면 라이브러리에 노출(재열람 무료).
  const { data: reading, error } = await admin
    .from('saved_readings')
    .insert({
      owner_id: user.id,
      type_key: toPurchaseKey(service),
      tier: 'pro',
      subject,
      payload: partner ? { partner } : null,
    })
    .select('id')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { readingId: reading.id, remaining, dailyLimit: CELEB_FREE_DAILY_LIMIT }
})
