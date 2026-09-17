// 유료 상품 가격의 "표시 문자열"을 만드는 단일 공식.
// 금액 자체는 shared/prices.ts(서버 청구와 동일 원천)에서만 온다 — 여기서 숫자를 만들지 않는다.
//
// 반환값에 통화 단위 '원'은 붙이지 않는다(pages/index.vue의 가격 표기와 동일한 규약).
// ko는 "19,800"만 돌려주고 '원'은 로케일 문자열/템플릿이 붙인다 — 공용 컴포넌트에
// 한글을 하드코딩하지 않기 위한 것이기도 하다(CLAUDE.md §2 한국어 누수 규칙).
// 해외(en/ja/zh)는 PayPal 제약으로 USD 단일 통화라 "$19.99" 형태로 완결된다.
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { SERVICE_PRICES, fmtKrw, fmtUsd } from '~/shared/prices'

/**
 * @param serviceKey SERVICE_PRICES의 키('lifetime' | 'newyear'). 빈 값이면 '' 반환(가격 없는 무료 상품).
 */
export function useServicePrice(serviceKey: MaybeRefOrGetter<string>) {
  const { locale } = useI18n()
  return computed(() => {
    const key = toValue(serviceKey)
    if (!key) return ''
    const price = SERVICE_PRICES[key]
    if (!price) return ''
    return locale.value === 'ko' ? fmtKrw(price.krw) : `$${fmtUsd(price.usdCents)}`
  })
}

/* ===== GA4 구매 깔때기(view_item / begin_checkout / purchase) 공용 조각 ===== */

/**
 * 상품 식별자 → 현재 로케일 상품명 i18n 키.
 * 이벤트에 상품명을 박지 않고 키로 받는 이유: 화면 상품명이 바뀌면 키의 "값"만 바뀌므로
 * 이벤트 코드를 다시 고칠 필요가 없다. 서버(server/utils/pricing.ts)의 orderName은
 * 결제창 표기용 한글 고정값이라 로케일 리포트에는 쓰지 않는다(결제 로직은 건드리지 않음).
 */
export const SERVICE_NAME_KEY: Record<string, string> = {
  lifetime: 'premium.life.title',
  newyear: 'premium.newyear.title',
}

/** 상품명 해석기. 키가 없는 상품(무료·사문 항목)은 fallback을 그대로 돌려준다. */
export function useServiceItemName() {
  const { t, te } = useI18n()
  return (serviceKey: string, fallback = '') => {
    const key = SERVICE_NAME_KEY[serviceKey]
    return key && te(key) ? t(key) : fallback
  }
}

/**
 * GA4 이벤트용 "숫자" 금액 — 표시 문자열(useServicePrice)과 달리 value/currency를 따로 준다.
 * 청구 통화 규칙은 server/utils/pricing.ts의 billingFor()와 같다: ko=카드/KRW(원 단위),
 * 그 외=PayPal/USD(달러 단위). 센트가 아니라 달러다 — 100배 부풀려진 매출이 찍히지 않도록.
 */
export function useServiceAmount(serviceKey: MaybeRefOrGetter<string>) {
  const { locale } = useI18n()
  return computed(() => {
    const key = toValue(serviceKey)
    if (!key) return null
    const price = SERVICE_PRICES[key]
    if (!price) return null
    return locale.value === 'ko'
      ? { value: price.krw, currency: 'KRW' }
      : { value: price.usdCents / 100, currency: 'USD' }
  })
}
