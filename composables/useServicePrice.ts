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
