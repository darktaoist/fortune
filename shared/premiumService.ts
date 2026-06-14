// 프리미엄 궁합의 키 매핑 — 클라이언트(pages)와 서버(server/utils) 공용.
// 결과 라우트 service 키는 'gunghap', 결제·저장 type_key는 'celeb'로 기록되는 차이를 한 곳에서 흡수.
// 새 궁합류가 생기면 여기 한 쌍만 추가하면 된다.
export const SERVICE_TO_PURCHASE: Record<string, string> = { gunghap: 'celeb' }
export const PURCHASE_TO_SERVICE: Record<string, string> = { celeb: 'gunghap' }

/** 라우트 service 키(gunghap) → 결제/저장 type_key(celeb). 매핑 없으면 그대로. */
export function toPurchaseKey(service: string): string {
  return SERVICE_TO_PURCHASE[service] || service
}
/** 결제/저장 type_key(celeb) → 결과 라우트 service 키(gunghap). 매핑 없으면 그대로. */
export function toServiceKey(typeKey: string): string {
  return PURCHASE_TO_SERVICE[typeKey] || typeKey
}
