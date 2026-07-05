// Meta Pixel 표준 이벤트 헬퍼. fbq가 없으면(플러그인 미로드/차단) 조용히 no-op.
// 베이스 코드·PageView는 plugins/meta-pixel.client.ts 담당. 여기선 전환 이벤트만.
export function useMetaPixel() {
  function track(event: string, params?: Record<string, unknown>) {
    if (!import.meta.client) return
    const fbq = (window as any).fbq
    if (typeof fbq !== 'function') return
    if (params) fbq('track', event, params)
    else fbq('track', event)
  }

  // 결제/무료 진입 페이지 조회.
  function trackViewContent(contentName: string) {
    track('ViewContent', { content_name: contentName, content_category: 'fortune' })
  }

  // 결제 시작(유료 checkout에서만). value/currency는 서버 주문(pay/order)의 실제값.
  function trackInitiateCheckout(value: number, currency: string) {
    track('InitiateCheckout', { value, currency })
  }

  // 결제 성공 확정. orderId 기준 sessionStorage 1회 가드 — 결과 새로고침 시 중복 발화 방지.
  function trackPurchase(orderId: string, value: number, currency: string, contentName?: string) {
    if (!import.meta.client || !orderId) return
    const key = `fbq_purchase_${orderId}`
    try { if (sessionStorage.getItem(key)) return } catch { /* private mode */ }
    track('Purchase', { value, currency, ...(contentName ? { content_name: contentName } : {}) })
    try { sessionStorage.setItem(key, '1') } catch { /* noop */ }
  }

  // 회원가입(근사): 유저당 localStorage 1회 가드 — 재로그인마다 중복 발화 방지.
  function trackCompleteRegistration(userId: string) {
    if (!import.meta.client || !userId) return
    const key = `fbq_reg_${userId}`
    try { if (localStorage.getItem(key)) return } catch { /* private mode */ }
    track('CompleteRegistration')
    try { localStorage.setItem(key, '1') } catch { /* noop */ }
  }

  return { track, trackViewContent, trackInitiateCheckout, trackPurchase, trackCompleteRegistration }
}
