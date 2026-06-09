// 결제 가격은 오직 서버에서만 신뢰한다. 클라이언트가 보낸 금액은 절대 사용하지 않는다.
// 통화는 Toss 청구 기준 KRW로 통일(메인의 $1 표기는 마케팅용 별개).
export interface PriceInfo {
  amount: number
  currency: 'KRW'
  orderName: string
}

export const PRICES: Record<string, PriceInfo> = {
  lifetime: { amount: 1000, currency: 'KRW', orderName: 'AI 평생운세' },
  celeb: { amount: 1000, currency: 'KRW', orderName: '연예인 궁합' },
  mbti: { amount: 1000, currency: 'KRW', orderName: 'MBTI 궁합' },
}

export function getPrice(service: unknown): PriceInfo | null {
  if (typeof service !== 'string') return null
  return PRICES[service] ?? null
}
