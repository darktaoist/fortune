// 결제 가격은 오직 서버에서만 신뢰한다. 클라이언트가 보낸 금액은 절대 사용하지 않는다.
// 국내(카드/Toss)=KRW, 해외(PayPal/Toss 위젯)=USD — 레거시(1.0)와 동일한 이원 구조.
// DB(purchases.amount)는 최소 단위로 저장: KRW=원, USD=센트(mypage 표시 로직과 일치).
export interface PriceInfo {
  krw: number          // KRW (원 단위)
  usdCents: number     // USD (센트 단위 — $1 = 100)
  orderName: string
}

export const PRICES: Record<string, PriceInfo> = {
  newyear: { krw: 2000, usdCents: 200, orderName: '2026 AI 신년운세' },
  lifetime: { krw: 2000, usdCents: 200, orderName: 'AI 평생운세' },
  celeb: { krw: 2000, usdCents: 200, orderName: '연예인 궁합' },
  mbti: { krw: 2000, usdCents: 200, orderName: 'MBTI 궁합' },
}

export function getPrice(service: unknown): PriceInfo | null {
  if (typeof service !== 'string') return null
  return PRICES[service] ?? null
}

/** 결제수단별 청구 정보. card=KRW(원), paypal=USD(달러 단위 value + 센트 단위 minor). */
export function billingFor(price: PriceInfo, method: 'card' | 'paypal') {
  if (method === 'paypal') {
    return { currency: 'USD' as const, value: price.usdCents / 100, minor: price.usdCents }
  }
  return { currency: 'KRW' as const, value: price.krw, minor: price.krw }
}
