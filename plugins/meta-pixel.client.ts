import { START_LOCATION } from 'vue-router'

// Meta(Facebook) Pixel — 클라이언트 전용. SSR에서 fbq 참조 금지(.client 접미사로 서버 미실행).
// GA4(nuxt-gtag)와 동일 목적의 SPA 대응: 베이스 스니펫이 최초 PageView를 1회 쏘고,
// router.afterEach가 이후 라우트 이동마다 PageView를 재전송한다(초기 로드 중복 없음).
// 표준 이벤트(ViewContent/InitiateCheckout/Purchase/CompleteRegistration)는 useMetaPixel()로 발화.
export default defineNuxtPlugin(() => {
  const pixelId = useRuntimeConfig().public.metaPixelId as string
  if (!pixelId || typeof window === 'undefined') return

  /* eslint-disable */
  // 표준 Meta Pixel 베이스 코드(공식 스니펫).
  ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = !0
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */

  const fbq = (window as any).fbq
  fbq('init', pixelId)
  fbq('track', 'PageView') // 최초 진입 1회

  // SPA 라우팅: 초기 로드(from === START_LOCATION)는 위에서 이미 카운트했으므로 스킵,
  // 이후 모든 페이지 전환마다 PageView 재전송.
  const router = useRouter()
  router.afterEach((to, from) => {
    if (from === START_LOCATION) return
    if (to.path === from.path) return // 쿼리만 바뀐 동일 경로는 제외
    ;(window as any).fbq?.('track', 'PageView')
  })
})
