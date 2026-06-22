/**
 * 루트(및 임의 경로)에서 ?lang=en|ja|zh 쿼리를 경로 프리픽스로 정규화한다. (P2)
 * 예: /?lang=en → /en, /saju?lang=ja → /ja/saju
 *
 * 기존엔 ?lang 쿼리가 루트에서 무시되어 한국어로 표시되던 버그가 있었다.
 * 한국어(기본 로케일, prefix 없음)는 영향 없음 — lang=ko 또는 lang 없음이면 그대로 통과.
 * strategy: 'prefix_except_default' 이므로 en/ja/zh는 경로 앞에 /<lang> 프리픽스만 붙으면 된다.
 */
const SUPPORTED = ['en', 'ja', 'zh']

export default defineNuxtRouteMiddleware((to) => {
  const raw = to.query.lang
  const lang = Array.isArray(raw) ? raw[0] : raw
  if (!lang || !SUPPORTED.includes(lang)) return

  // 이미 해당 로케일 프리픽스가 붙어있으면 lang 쿼리만 제거하고 통과(루프 방지)
  const segs = to.path.split('/')
  const firstSeg = segs[1]
  const { lang: _drop, ...rest } = to.query

  // 선호 언어 쿠키 고정(다음 방문에도 유지). detectBrowserLanguage cookieKey와 동일.
  if (import.meta.client) {
    const cookie = useCookie('taoist_lang', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    cookie.value = lang
  }

  if (firstSeg === lang) {
    return navigateTo({ path: to.path, query: rest }, { redirectCode: 302 })
  }

  // 다른 로케일 프리픽스가 이미 붙어있으면 교체, 아니면 새로 붙임
  let basePath = to.path
  if (['en', 'ja', 'zh'].includes(firstSeg)) {
    basePath = '/' + segs.slice(2).join('/')
  }
  if (basePath === '/') basePath = ''
  const target = `/${lang}${basePath}`

  return navigateTo({ path: target, query: rest }, { redirectCode: 302 })
})
