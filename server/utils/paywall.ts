import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'
import { toPurchaseKey } from '~/shared/premiumService'

/**
 * 프리미엄 결제 게이트 — 로그인 + 해당 서비스의 paid 구매를 요구한다.
 * 라우트 서비스 키(gunghap)와 구매 type_key(celeb)가 다른 경우를 매핑으로 흡수.
 * orderNo가 오면 그 주문만, 없으면 가장 최근 paid 구매를 사용한다.
 * 실패: 401(미로그인) / 402(결제 필요) — 클라이언트는 코드로 로그인/결제 페이지 분기.
 */
export interface PaidGate {
  user: { id: string; email?: string }
  purchase: { id: string; order_no: string; reading_id: string | null; type_key: string }
}

export async function requirePaidPurchase(
  event: H3Event,
  admin: any,
  service: string,
  orderNo?: string | null,
): Promise<PaidGate> {
  let user: any
  try { user = await serverSupabaseUser(event) } catch { user = null }
  if (!user) throw createError({ statusCode: 401, statusMessage: 'login required' })

  const typeKey = toPurchaseKey(service)
  let q = admin
    .from('purchases')
    .select('id, order_no, reading_id, type_key, status')
    .eq('owner_id', user.id)
    .eq('type_key', typeKey)
    .eq('status', 'paid')
  if (orderNo) q = q.eq('order_no', orderNo)
  const { data } = await q.order('paid_at', { ascending: false }).limit(1).maybeSingle()
  if (!data) throw createError({ statusCode: 402, statusMessage: 'payment required' })

  return { user, purchase: data }
}
