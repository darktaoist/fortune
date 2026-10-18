// 결제 가격은 오직 서버에서만 신뢰한다. 클라이언트가 보낸 금액은 절대 사용하지 않는다.
// 유료 상품(lifetime/newyear)의 금액은 화면 표시와 갈라지지 않도록 shared/prices.ts를 그대로 쓴다.
// 국내(카드/Toss)=KRW, 해외(PayPal/Toss 위젯)=USD — 레거시(1.0)와 동일한 이원 구조.
// DB(purchases.amount)는 최소 단위로 저장: KRW=원, USD=센트(mypage 표시 로직과 일치).
import { SERVICE_PRICES } from '~/shared/prices'
import { NEWYEAR_ORDER_NAME } from '~/shared/newyear'

export interface PriceInfo {
  krw: number          // KRW (원 단위)
  usdCents: number     // USD (센트 단위 — $1 = 100)
  orderName: string
}

export const PRICES: Record<string, PriceInfo> = {
  newyear: { krw: SERVICE_PRICES.newyear.krw, usdCents: SERVICE_PRICES.newyear.usdCents, orderName: NEWYEAR_ORDER_NAME },
  lifetime: { krw: SERVICE_PRICES.lifetime.krw, usdCents: SERVICE_PRICES.lifetime.usdCents, orderName: '평생사주 리포트' },
  // celeb/mbti는 무료화(로그인+1일 3회 쿼터)되어 결제 퍼널을 타지 않는다(checkout에서 celeb-select로 우회).
  // 아래 항목은 과거 주문 orderName 조회용으로만 남아 있는 사실상 사문 규정이므로 그대로 둔다.
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
