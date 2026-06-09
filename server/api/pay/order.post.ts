import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { randomUUID } from 'node:crypto'
import { getPrice } from '../../utils/pricing'

/**
 * 결제 주문 생성 — 결제창을 띄우기 전에 호출.
 * 1) 결제 대상(사주 주체/상대)을 saved_readings(tier=pro)에 스냅샷으로 저장
 * 2) purchases에 pending 행 생성(서버 신뢰 금액). order_no = 멱등 키.
 * 클라가 보낸 금액은 무시하고 서버 PRICES만 사용. 쓰기는 RLS 우회 위해 service role.
 */
export default defineEventHandler(async (event) => {
  let user
  try { user = await serverSupabaseUser(event) } catch { user = null }
  if (!user) throw createError({ statusCode: 401, statusMessage: 'not authenticated' })

  const body = await readBody(event)
  const price = getPrice(body?.service)
  if (!price) throw createError({ statusCode: 400, statusMessage: 'invalid service' })

  const service = body.service as string
  const subject = body?.subject ?? null
  const partner = body?.partner ?? null

  const admin = serverSupabaseServiceRole(event)

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
  const orderId = `tao_${randomUUID().replace(/-/g, '')}`
  const { error: pErr } = await admin.from('purchases').insert({
    owner_id: user.id,
    reading_id: reading.id,
    type_key: service,
    tier: 'pro',
    amount: price.amount,
    currency: price.currency,
    order_no: orderId,
    status: 'pending',
    provider: 'toss',
  })
  if (pErr) throw createError({ statusCode: 500, statusMessage: pErr.message })

  return {
    orderId,
    amount: price.amount,
    currency: price.currency,
    orderName: price.orderName,
  }
})
