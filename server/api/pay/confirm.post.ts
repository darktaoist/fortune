import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

/**
 * 결제 승인 — Toss successUrl 리다이렉트 후 호출.
 * successUrl 파라미터(amount 등)는 변조 가능하므로 신뢰하지 않는다:
 *  - order_no로 pending 주문을 찾고 소유자 일치 확인
 *  - Toss 승인은 DB에 저장된 금액으로 호출(쿼리 amount 무시)
 *  - 이미 paid면 멱등 응답(재호출 방지)
 */
export default defineEventHandler(async (event) => {
  let user
  try { user = await serverSupabaseUser(event) } catch { user = null }
  if (!user) throw createError({ statusCode: 401, statusMessage: 'not authenticated' })

  const { paymentKey, orderId } = await readBody(event)
  if (!paymentKey || !orderId) throw createError({ statusCode: 400, statusMessage: 'missing params' })

  const admin = serverSupabaseServiceRole(event)

  const { data: order, error: oErr } = await admin
    .from('purchases')
    .select('id, owner_id, amount, currency, status, reading_id, type_key')
    .eq('order_no', orderId)
    .single()
  if (oErr || !order) throw createError({ statusCode: 404, statusMessage: 'order not found' })
  if (order.owner_id !== user.id) throw createError({ statusCode: 403, statusMessage: 'forbidden' })

  // 멱등: 이미 승인된 주문은 재호출하지 않고 그대로 성공 반환.
  if (order.status === 'paid') return { ok: true, readingId: order.reading_id, service: order.type_key }

  // 시크릿 선택: 요청 때 쓴 클라이언트 키와 같은 연동의 시크릿이어야 승인 가능.
  // USD(PayPal)=위젯 연동(gsk), KRW(카드)=API 개별 연동(sk).
  const cfg = useRuntimeConfig()
  const isUsd = order.currency === 'USD'
  const secret = isUsd ? cfg.tossWidgetSecretKey : cfg.tossSecretKey
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'payment not configured' })

  // Toss 결제 승인 — 금액은 반드시 DB 저장값으로(USD는 센트 저장 → 달러로 환산).
  const confirmAmount = isUsd ? order.amount / 100 : order.amount
  const auth = Buffer.from(`${secret}:`).toString('base64')
  let toss: any
  try {
    toss = await $fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: { paymentKey, orderId, amount: confirmAmount },
    })
  } catch (e: any) {
    const data = e?.data ?? { message: e?.message }
    await admin.from('payments').insert({
      owner_id: user.id, order_no: orderId, provider: 'toss',
      status: 'failed', code: data?.code ?? null, raw: data,
    })
    throw createError({ statusCode: 402, statusMessage: data?.message || 'payment failed' })
  }

  await admin.from('purchases').update({ status: 'paid', provider: 'toss', paid_at: new Date().toISOString() }).eq('id', order.id)
  await admin.from('payments').insert({
    owner_id: user.id, order_no: orderId, provider: 'toss',
    status: 'paid', code: toss?.status ?? null, raw: toss,
  })

  return { ok: true, readingId: order.reading_id, service: order.type_key }
})
