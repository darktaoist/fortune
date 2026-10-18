// 유료 신년운세(올해의 운세)의 대상 연도 — 단일 원천.
// 프롬프트(server/utils/fortune-registry.ts)·결제 상품명(server/utils/pricing.ts)·분석 이벤트(pages/checkout.vue)가
// 모두 여기를 본다. 간지(丁未 등)는 이 값에서 계산한다. 화면 문구(i18n 로케일)는 연도를 직접 적고 있으니
// 연도를 바꿀 땐 로케일의 newyear 문구도 함께 고친다.
export const NEWYEAR_YEAR = 2027

/** 결제·분석용 상품명(비-UI). */
export const NEWYEAR_ORDER_NAME = `${NEWYEAR_YEAR} 신년운세`
