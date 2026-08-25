// 가격의 단일 원천(single source of truth).
// 표시 가격과 실제 청구 금액이 갈라지지 않도록 화면(pages/index.vue, pages/checkout.vue)과
// 서버 청구(server/utils/pricing.ts)가 모두 이 파일을 참조한다. 가격 변경은 여기 한 곳만.
//
// 해외(en/ja/zh)는 PayPal 결제 제약으로 USD 단일 통화다.
// jpyApprox/twdApprox는 ja/zh 화면에 병기하는 "참고 환산 표기"일 뿐, 실제 청구는 USD로 이뤄진다.
export interface ServicePrice {
  krw: number // 원 단위 — KRW 청구 금액
  usdCents: number // 센트 단위 — USD 청구 금액 × 100
  jpyApprox: string // ja 로케일 참고 환산 표기(괄호 포함 — 가격 옆에 그대로 병기)
  twdApprox: string // zh 로케일 참고 환산 표기(괄호 포함 — 가격 옆에 그대로 병기)
}

export const SERVICE_PRICES: Record<string, ServicePrice> = {
  lifetime: { krw: 19800, usdCents: 1999, jpyApprox: '(約¥2,900)', twdApprox: '(約NT$620)' },
  newyear: { krw: 9900, usdCents: 999, jpyApprox: '(約¥1,450)', twdApprox: '(約NT$310)' },
}

/** 결정적 천단위 콤마(서버/클라 동일) — toLocaleString은 환경별 차이로 하이드레이션 불일치 유발. */
export function fmtKrw(krw: number): string {
  return String(krw).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 센트 → 달러 표기("1999" → "19.99"). */
export function fmtUsd(cents: number): string {
  return (cents / 100).toFixed(2)
}
