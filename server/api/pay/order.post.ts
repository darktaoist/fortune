import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { randomUUID } from 'node:crypto'
import { getPrice, billingFor } from '../../utils/pricing'

/**
 * 결제 주문 생성 — 결제창을 띄우기 전에 호출.
 * 1) 결제 대상(사주 주체/상대)을 saved_readings(tier=pro)에 스냅샷으로 저장
 * 2) purchases에 pending 행 생성(서버 신뢰 금액). order_no = 멱등 키.
 * 클라가 보낸 금액은 무시하고 서버 PRICES만 사용. 쓰기는 RLS 우회 위해 service role.
 * method: 'card'(국내 KRW) | 'paypal'(해외 USD — Toss 위젯) — 레거시 1.0과 동일 이원화.
 */
export default defineEventHandler(async (event) => {
  let user
  try { user = await serverSupabaseUser(event) } catch { user = null }
  if (!user) throw createError({ statusCode: 401, statusMessage: 'not authenticated' })

  // 주문 남용 방지 — IP당 1분에 10회.
  rateLimit(event, { key: 'order', limit: 10, windowMs: 60_000 })

  const body = await readBody(event)
  const price = getPrice(body?.service)
  if (!price) throw createError({ statusCode: 400, statusMessage: 'invalid service' })

  const method = body?.method === 'paypal' ? 'paypal' as const : 'card' as const
  const bill = billingFor(price, method)

  const service = body.service as string
  const subject = body?.subject ?? null
  const partner = body?.partner ?? null

  const admin = serverSupabaseServiceRole(event)

  // 0) 오래된 pending 주문 정리 — 결제창 이탈/실패로 1시간 이상 미완료된 주문과
  //    그에 매달린 스냅샷(saved_readings)을 제거(보관함/구매내역 오염 방지).
  const cutoff = new Date(Date.now() - 3600_000).toISOString()
  const { data: stale } = await admin
    .from('purchases')
    .select('id, reading_id')
    .eq('owner_id', user.id).eq('status', 'pending').lt('created_at', cutoff)
  if (stale?.length) {
    const rids = stale.map((s) => s.reading_id).filter(Boolean)
    await admin.from('purchases').delete().in('id', stale.map((s) => s.id))
    if (rids.length) await admin.from('saved_readings').delete().in('id', rids)
  }

  // 1) 결제 대상 스냅샷 — 결제 후 PRO 결과를 복원할 수 있도록 지금 저장.
  const { data: reading, error: rErr } = await admin
    .from('saved_readings')
    .insert({
      owner_id: user.id,
      type_key: service,
      tier: 'pro',
      subject,
      payload: partner ? { partner } : null,
    })
    .select('id')
    .single()
  if (rErr) throw createError({ statusCode: 500, statusMessage: rErr.message })

  // 2) pending 주문. order_no는 Toss orderId 규격(6~64자)에 맞춘 멱등 키.
  // amount는 최소 단위(KRW=원, USD=센트)로 저장 — confirm에서 통화별로 환산 검증.
  const orderId = `tao_${randomUUID().replace(/-/g, '')}`
  const { error: pErr } = await admin.from('purchases').insert({
    owner_id: user.id,
    reading_id: reading.id,
    type_key: service,
    tier: 'pro',
    amount: bill.minor,
    currency: bill.currency,
    order_no: orderId,
    status: 'pending',
    provider: 'toss',
  })
  if (pErr) {
    // 보상 트랜잭션 — 주문(purchases) 생성 실패 시 방금 만든 스냅샷(saved_readings)을 정리.
    // 그대로 두면 reading_id 없는 고아 행이 남아 보관함을 오염시킨다.
    await admin.from('saved_readings').delete().eq('id', reading.id)
    throw createError({ statusCode: 500, statusMessage: pErr.message })
  }

  return {
    orderId,
    amount: bill.value,        // 결제창에 띄울 값(KRW=원, USD=달러)
    currency: bill.currency,
    orderName: price.orderName,
  }
})
